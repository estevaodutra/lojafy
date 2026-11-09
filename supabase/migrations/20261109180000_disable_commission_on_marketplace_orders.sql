-- =============================================================================
-- Migration: Desativar comissão automática em pedidos de Marketplaces Externos
-- e Limpar movimentações indevidas geradas por trigger legada
-- =============================================================================

-- 1. Atualizar função handle_order_wallet_movements para ignorar pedidos de marketplaces externos
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
  -- REGRA DE PROTEÇÃO:
  -- Pedidos de marketplaces externos (Mercado Livre, Shopee, etc.) NÃO passam pela movimentação
  -- automática da loja própria. No Mercado Livre, o cliente paga o marketplace diretamente,
  -- o revendedor recebe direto na sua conta externa, e a cobrança de custo do fornecedor (fulfillment)
  -- é realizada de forma dedicada pelo módulo de integrações.
  IF NEW.ml_order_id IS NOT NULL OR NEW.payment_id LIKE 'ml_%' OR COALESCE(NEW.notes, '') LIKE '%Mercado Livre%' THEN
    RETURN NEW;
  END IF;

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

  -- 2. Cenário: Pedido Pago (apenas loja própria da Lojafy)
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

  -- 3. Cenário: Pedido Enviado ('enviado') (apenas loja própria da Lojafy)
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
      -- A. Split do Fornecedor
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

      -- B. Split do Revendedor
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

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
