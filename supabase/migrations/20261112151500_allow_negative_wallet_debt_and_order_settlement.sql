-- =============================================================================
-- Migration: Permitir Saldo Negativo (Débito Pendente) na Carteira do Parceiro
-- e Quitação Automática no Pagamento de Pedidos
-- =============================================================================

-- 1. Atualizar trigger de validação para permitir saldo negativo (débito em aberto)
CREATE OR REPLACE FUNCTION public.validate_wallet_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saldo_bloqueado < 0 THEN
    RAISE EXCEPTION 'Saldo bloqueado não pode ser negativo';
  END IF;
  IF COALESCE(NEW.saldo_reservado_saque, 0) < 0 THEN
    RAISE EXCEPTION 'Saldo reservado não pode ser negativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 2. Atualizar função debitar_carteira para permitir saldo negativo em ajustes administrativos (ajuste_debito)
CREATE OR REPLACE FUNCTION public.debitar_carteira(
  p_user_id UUID,
  p_valor DECIMAL,
  p_descricao TEXT,
  p_referencia_tipo TEXT,
  p_referencia_id UUID
) RETURNS JSON AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_novo_saldo DECIMAL;
  v_transaction_id UUID;
  v_tx_tipo public.wallet_transaction_tipo;
BEGIN
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    IF COALESCE(p_referencia_tipo, '') = 'ajuste_debito' THEN
      INSERT INTO public.wallets (user_id, saldo)
      VALUES (p_user_id, 0)
      RETURNING * INTO v_wallet;
    ELSE
      RETURN json_build_object('success', false, 'error', 'Carteira não encontrada');
    END IF;
  END IF;

  -- Apenas bloqueia por saldo insuficiente se NÃO for um ajuste manual de débito pelo Admin
  IF COALESCE(p_referencia_tipo, '') <> 'ajuste_debito' AND v_wallet.saldo < p_valor THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  v_novo_saldo := v_wallet.saldo - p_valor;
  v_tx_tipo := CASE
    WHEN COALESCE(p_referencia_tipo, '') = 'ajuste_debito' THEN 'ajuste_debito'::public.wallet_transaction_tipo
    ELSE 'pagamento_pedido'::public.wallet_transaction_tipo
  END;

  UPDATE public.wallets
  SET saldo = v_novo_saldo, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  ) VALUES (
    v_wallet.id, v_tx_tipo, p_valor, v_wallet.saldo, v_novo_saldo,
    p_descricao, p_referencia_tipo, p_referencia_id, 'completed'
  ) RETURNING id INTO v_transaction_id;

  RETURN json_build_object(
    'success', true,
    'transaction_id', v_transaction_id,
    'saldo_anterior', v_wallet.saldo,
    'saldo_atual', v_novo_saldo
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 3. Atualizar handle_order_wallet_movements para quitar automaticamente o débito negativo
-- da carteira do parceiro assim que um pedido (que somou o débito ao PIX) for pago.
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
  v_target_user_id UUID;
  v_current_saldo DECIMAL;
BEGIN
  -- 0. Quitação automática de débito pendente na carteira quando o parceiro paga um pedido via PIX
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.payment_status IS NULL) THEN
    IF COALESCE(NEW.payment_method, '') <> 'wallet' THEN
      v_target_user_id := COALESCE(NEW.reseller_id, NEW.user_id);
      IF v_target_user_id IS NOT NULL THEN
        SELECT saldo INTO v_current_saldo
        FROM public.wallets
        WHERE user_id = v_target_user_id;

        IF v_current_saldo IS NOT NULL AND v_current_saldo < 0 THEN
          IF NOT EXISTS (
            SELECT 1 FROM public.wallet_transactions
            WHERE referencia_tipo = 'quitacao_debito_pedido'
              AND referencia_id = NEW.id
              AND status = 'completed'
          ) THEN
            PERFORM public.creditar_carteira(
              v_target_user_id,
              ABS(v_current_saldo),
              0,
              'Quitação de débito pendente no pagamento do Pedido #' || NEW.order_number,
              'quitacao_debito_pedido',
              NEW.id,
              'ajuste_credito'
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END IF;

  -- REGRA DE PROTEÇÃO:
  -- Pedidos de marketplaces externos (Mercado Livre, Shopee, etc.) NÃO passam pela movimentação
  -- automática da loja própria.
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
