-- =============================================================================
-- Módulo Fornecedor P0 — Congelamento financeiro por item de pedido
--
-- Problema: handle_order_wallet_movements lê products.cost_price AO VIVO no
-- momento do envio; editar o custo após a venda muda o repasse retroativamente.
--
-- Solução: BEFORE INSERT em order_items congela custo/fornecedor/percentuais
-- daquele instante (único choke point das 3 vias de criação de pedido), e a
-- função de carteira passa a ler as colunas congeladas com fallback para
-- product_snapshot. Nome, timing, idempotência e todo o resto da função
-- permanecem idênticos à versão vigente (20260721023000).
-- =============================================================================

ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS supplier_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_organization_id UUID,
  ADD COLUMN IF NOT EXISTS supplier_unit_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_total_cost NUMERIC,
  ADD COLUMN IF NOT EXISTS reseller_margin_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS platform_fee_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS supplier_net_amount NUMERIC,
  ADD COLUMN IF NOT EXISTS financials_frozen_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_order_items_supplier ON public.order_items(supplier_id);
CREATE INDEX IF NOT EXISTS idx_order_items_supplier_org ON public.order_items(supplier_organization_id);

-- =============================================================================
-- Congelamento no INSERT (espelha a fórmula do trigger de carteira vigente)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.freeze_order_item_financials()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost NUMERIC;
  v_supplier_id UUID;
  v_supplier_org_id UUID;
  v_split_fornecedor_pct NUMERIC;
  v_split_revendedor_pct NUMERIC;
  v_gross NUMERIC;
BEGIN
  SELECT p.cost_price, p.supplier_id,
         COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id))
  INTO v_cost, v_supplier_id, v_supplier_org_id
  FROM public.products p
  WHERE p.id = NEW.product_id;

  SELECT COALESCE(split_fornecedor_percentual, 0), COALESCE(split_revendedor_percentual, 0)
  INTO v_split_fornecedor_pct, v_split_revendedor_pct
  FROM public.platform_settings
  LIMIT 1;

  v_split_fornecedor_pct := COALESCE(v_split_fornecedor_pct, 0);
  v_split_revendedor_pct := COALESCE(v_split_revendedor_pct, 0);
  v_gross := NEW.unit_price * NEW.quantity;

  NEW.supplier_id := v_supplier_id;
  NEW.supplier_organization_id := v_supplier_org_id;
  NEW.supplier_unit_cost := COALESCE(v_cost, 0);
  NEW.supplier_total_cost := COALESCE(v_cost, 0) * NEW.quantity;

  IF v_supplier_id IS NOT NULL THEN
    IF v_split_fornecedor_pct > 0 THEN
      NEW.supplier_net_amount := v_gross * (v_split_fornecedor_pct / 100.0);
    ELSE
      NEW.supplier_net_amount := COALESCE(v_cost, 0) * NEW.quantity;
    END IF;
  ELSE
    NEW.supplier_net_amount := 0;
  END IF;

  IF v_split_revendedor_pct > 0 THEN
    NEW.reseller_margin_amount := v_gross * (v_split_revendedor_pct / 100.0);
  ELSE
    NEW.reseller_margin_amount := (NEW.unit_price - COALESCE(v_cost, 0)) * NEW.quantity;
  END IF;

  NEW.platform_fee_amount := v_gross - COALESCE(NEW.supplier_net_amount, 0) - COALESCE(NEW.reseller_margin_amount, 0);
  NEW.financials_frozen_at := now();

  IF v_supplier_id IS NOT NULL AND v_cost IS NULL THEN
    PERFORM public.log_supplier_audit(
      v_supplier_org_id,
      'order_item_frozen_without_cost',
      'order_item',
      NEW.id,
      NULL,
      NULL,
      jsonb_build_object('order_id', NEW.order_id, 'product_id', NEW.product_id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS freeze_order_item_financials_trigger ON public.order_items;
CREATE TRIGGER freeze_order_item_financials_trigger
  BEFORE INSERT ON public.order_items
  FOR EACH ROW
  EXECUTE FUNCTION public.freeze_order_item_financials();

-- =============================================================================
-- Backfill idempotente de linhas antigas a partir do snapshot da compra
-- (o snapshot é o melhor registro disponível do custo na época da venda)
-- =============================================================================

UPDATE public.order_items oi
SET
  supplier_id = p.supplier_id,
  supplier_organization_id = COALESCE(p.supplier_organization_id, public.get_supplier_org_id(p.supplier_id)),
  supplier_unit_cost = COALESCE((oi.product_snapshot->>'cost_price')::numeric, p.cost_price, 0),
  supplier_total_cost = COALESCE((oi.product_snapshot->>'cost_price')::numeric, p.cost_price, 0) * oi.quantity,
  supplier_net_amount = COALESCE((oi.product_snapshot->>'cost_price')::numeric, p.cost_price, 0) * oi.quantity,
  reseller_margin_amount = (oi.unit_price - COALESCE((oi.product_snapshot->>'cost_price')::numeric, p.cost_price, 0)) * oi.quantity,
  financials_frozen_at = oi.created_at
FROM public.products p
WHERE p.id = oi.product_id
  AND oi.financials_frozen_at IS NULL;

-- =============================================================================
-- Reescrita de handle_order_wallet_movements: mesma função, mesmo trigger,
-- mesma idempotência — apenas a origem dos valores muda para as colunas
-- congeladas (fallback: snapshot da compra; último recurso: fórmula antiga).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.handle_order_wallet_movements()
RETURNS TRIGGER AS $$
DECLARE
  v_super_admin_id UUID;
  v_split_fornecedor_pct DECIMAL;
  v_split_revendedor_pct DECIMAL;
  item_rec RECORD;
  v_valor_fornecedor DECIMAL;
  v_valor_revendedor DECIMAL;
  v_reseller_id UUID;
  v_tx_id UUID;
  v_res JSON;
BEGIN
  -- 1. Identificar o Super Admin
  SELECT user_id INTO v_super_admin_id
  FROM public.profiles
  WHERE role = 'super_admin'
  LIMIT 1;

  IF v_super_admin_id IS NULL THEN
    SELECT user_id INTO v_super_admin_id
    FROM public.profiles
    WHERE role = 'admin'
    LIMIT 1;
  END IF;

  IF v_super_admin_id IS NULL THEN
    v_super_admin_id := NEW.user_id;
  END IF;

  -- 2. Cenário: Pedido Pago
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.payment_status IS NULL) THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE referencia_tipo = 'pagamento_pedido' AND referencia_id = NEW.id AND tipo = 'recarga' AND status = 'completed'
    ) THEN
      PERFORM public.creditar_carteira(
        v_super_admin_id,
        NEW.total_amount,
        0,
        'Recebimento de Pedido #' || NEW.order_number,
        'pagamento_pedido',
        NEW.id,
        'recarga'
      );
    END IF;
  END IF;

  -- 3. Cenário: Pedido Enviado ('enviado')
  IF NEW.status = 'enviado' AND (OLD.status IS DISTINCT FROM 'enviado' OR OLD.status IS NULL) AND NEW.payment_status = 'paid' THEN
    SELECT COALESCE(split_fornecedor_percentual, 0), COALESCE(split_revendedor_percentual, 0)
    INTO v_split_fornecedor_pct, v_split_revendedor_pct
    FROM public.platform_settings
    LIMIT 1;

    v_reseller_id := NEW.reseller_id;

    FOR item_rec IN (
      SELECT oi.id, oi.unit_price, oi.quantity,
             COALESCE(oi.supplier_unit_cost, (oi.product_snapshot->>'cost_price')::numeric, p.cost_price) AS cost_price,
             COALESCE(oi.supplier_id, p.supplier_id) AS supplier_id,
             oi.supplier_net_amount,
             oi.reseller_margin_amount
      FROM public.order_items oi
      LEFT JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = NEW.id
    ) LOOP
      -- A. Split do Fornecedor (valor congelado no momento da compra)
      IF item_rec.supplier_id IS NOT NULL THEN
        IF item_rec.supplier_net_amount IS NOT NULL THEN
          v_valor_fornecedor := item_rec.supplier_net_amount;
        ELSIF v_split_fornecedor_pct > 0 THEN
          v_valor_fornecedor := item_rec.unit_price * item_rec.quantity * (v_split_fornecedor_pct / 100.0);
        ELSE
          v_valor_fornecedor := COALESCE(item_rec.cost_price, 0) * item_rec.quantity;
        END IF;

        IF v_valor_fornecedor > 0 AND NOT EXISTS (
          SELECT 1 FROM public.order_payment_splits
          WHERE order_id = NEW.id AND recipient_user_id = item_rec.supplier_id AND recipient_role = 'supplier' AND status = 'credited'
        ) THEN
          PERFORM public.debitar_carteira(
            v_super_admin_id,
            v_valor_fornecedor,
            'Repasse Fornecedor - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id
          );

          v_res := public.creditar_carteira(
            item_rec.supplier_id,
            v_valor_fornecedor,
            0,
            'Venda de produto - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id,
            'pagamento_pedido'
          );
          v_tx_id := (v_res->>'transaction_id')::UUID;

          INSERT INTO public.order_payment_splits (
            order_id, recipient_user_id, recipient_role, valor, status, wallet_transaction_id, processed_at
          ) VALUES (
            NEW.id, item_rec.supplier_id, 'supplier', v_valor_fornecedor, 'credited', v_tx_id, NOW()
          );
        END IF;
      END IF;

      -- B. Split do Revendedor (valor congelado no momento da compra)
      IF v_reseller_id IS NOT NULL THEN
        IF item_rec.reseller_margin_amount IS NOT NULL THEN
          v_valor_revendedor := item_rec.reseller_margin_amount;
        ELSIF v_split_revendedor_pct > 0 THEN
          v_valor_revendedor := item_rec.unit_price * item_rec.quantity * (v_split_revendedor_pct / 100.0);
        ELSE
          v_valor_revendedor := (item_rec.unit_price - COALESCE(item_rec.cost_price, 0)) * item_rec.quantity;
        END IF;

        IF v_valor_revendedor > 0 AND NOT EXISTS (
          SELECT 1 FROM public.order_payment_splits
          WHERE order_id = NEW.id AND recipient_user_id = v_reseller_id AND recipient_role = 'reseller' AND status = 'credited'
        ) THEN
          PERFORM public.debitar_carteira(
            v_super_admin_id,
            v_valor_revendedor,
            'Comissão Revendedor - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id
          );

          v_res := public.creditar_carteira(
            v_reseller_id,
            v_valor_revendedor,
            0,
            'Comissão de venda - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id,
            'cashback'
          );
          v_tx_id := (v_res->>'transaction_id')::UUID;

          INSERT INTO public.order_payment_splits (
            order_id, recipient_user_id, recipient_role, valor, status, wallet_transaction_id, processed_at
          ) VALUES (
            NEW.id, v_reseller_id, 'reseller', v_valor_revendedor, 'credited', v_tx_id, NOW()
          );
        END IF;
      END IF;
    END LOOP;
  END IF;

  -- 4. Cenário: Pedido Cancelado ou Devolvido
  -- Estorno permanece manual/via módulo de Return Requests (inalterado).

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
