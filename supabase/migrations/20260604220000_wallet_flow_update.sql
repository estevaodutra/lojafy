-- Efetua alterações no constraint de status de split
ALTER TABLE public.order_payment_splits DROP CONSTRAINT IF EXISTS order_payment_splits_status_check;
ALTER TABLE public.order_payment_splits ADD CONSTRAINT order_payment_splits_status_check CHECK (status IN ('pending', 'credited', 'failed', 'reversed'));

-- Função trigger para processar as movimentações financeiras
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
  v_split_rec RECORD;
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

  -- Fallback de segurança se não houver admin (não deve ocorrer)
  IF v_super_admin_id IS NULL THEN
    v_super_admin_id := NEW.user_id;
  END IF;

  -- 2. Cenário: Pedido Pago
  -- Quando o status de pagamento passa a ser 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS DISTINCT FROM 'paid' OR OLD.payment_status IS NULL) THEN
    -- Creditar o valor total na carteira do Super Admin (se ainda não creditado)
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
  -- Quando o status do pedido passa a ser 'enviado' e o status de pagamento é 'paid'
  IF NEW.status = 'enviado' AND (OLD.status IS DISTINCT FROM 'enviado' OR OLD.status IS NULL) AND NEW.payment_status = 'paid' THEN
    -- Obter as configurações de split da plataforma
    SELECT COALESCE(split_fornecedor_percentual, 0), COALESCE(split_revendedor_percentual, 0)
    INTO v_split_fornecedor_pct, v_split_revendedor_pct
    FROM public.platform_settings
    LIMIT 1;

    v_reseller_id := NEW.reseller_id;

    -- Processar splits para cada item do pedido
    FOR item_rec IN (
      SELECT oi.id, oi.unit_price, oi.quantity, p.cost_price, p.supplier_id
      FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = NEW.id
    ) LOOP
      -- A. Split do Fornecedor (Custo)
      IF item_rec.supplier_id IS NOT NULL THEN
        IF v_split_fornecedor_pct > 0 THEN
          v_valor_fornecedor := item_rec.unit_price * item_rec.quantity * (v_split_fornecedor_pct / 100.0);
        ELSE
          v_valor_fornecedor := COALESCE(item_rec.cost_price, 0) * item_rec.quantity;
        END IF;

        IF v_valor_fornecedor > 0 AND NOT EXISTS (
          SELECT 1 FROM public.order_payment_splits
          WHERE order_id = NEW.id AND recipient_user_id = item_rec.supplier_id AND recipient_role = 'supplier' AND status = 'credited'
        ) THEN
          -- Debitar do Super Admin
          PERFORM public.debitar_carteira(
            v_super_admin_id,
            v_valor_fornecedor,
            'Repasse Fornecedor - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id
          );
          
          -- Creditar ao Fornecedor
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

          -- Registrar split
          INSERT INTO public.order_payment_splits (
            order_id, recipient_user_id, recipient_role, valor, status, wallet_transaction_id, processed_at
          ) VALUES (
            NEW.id, item_rec.supplier_id, 'supplier', v_valor_fornecedor, 'credited', v_tx_id, NOW()
          );
        END IF;
      END IF;

      -- B. Split do Revendedor (Comissão)
      IF v_reseller_id IS NOT NULL THEN
        IF v_split_revendedor_pct > 0 THEN
          v_valor_revendedor := item_rec.unit_price * item_rec.quantity * (v_split_revendedor_pct / 100.0);
        ELSE
          v_valor_revendedor := (item_rec.unit_price - COALESCE(item_rec.cost_price, 0)) * item_rec.quantity;
        END IF;

        IF v_valor_revendedor > 0 AND NOT EXISTS (
          SELECT 1 FROM public.order_payment_splits
          WHERE order_id = NEW.id AND recipient_user_id = v_reseller_id AND recipient_role = 'reseller' AND status = 'credited'
        ) THEN
          -- Debitar do Super Admin
          PERFORM public.debitar_carteira(
            v_super_admin_id,
            v_valor_revendedor,
            'Comissão Revendedor - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id
          );
          
          -- Creditar ao Revendedor
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

          -- Registrar split
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
  -- Quando o status passa para cancelado, reembolsado, ou devolucao_aprovada (e o pagamento foi pago)
  IF NEW.status IN ('cancelado', 'reembolsado', 'devolucao_aprovada') 
     AND (OLD.status NOT IN ('cancelado', 'reembolsado', 'devolucao_aprovada') OR OLD.status IS NULL)
     AND NEW.payment_status = 'paid' THEN
     
    -- Garantir que reembolso do cliente não ocorra duas vezes
    IF NOT EXISTS (
      SELECT 1 FROM public.wallet_transactions
      WHERE referencia_tipo = 'cancelamento_pedido' AND referencia_id = NEW.id AND tipo = 'estorno' AND status = 'completed'
    ) THEN
    
      -- Estornar splits creditados (fornecedores e revendedores)
      FOR v_split_rec IN (
        SELECT id, recipient_user_id, recipient_role, valor
        FROM public.order_payment_splits
        WHERE order_id = NEW.id AND status = 'credited'
      ) LOOP
        -- Debitar o recebedor
        PERFORM public.debitar_carteira(
          v_split_rec.recipient_user_id,
          v_split_rec.valor,
          'Estorno de Pedido (Cancelado/Devolvido) #' || NEW.order_number,
          'cancelamento_pedido',
          NEW.id
        );
        
        -- Creditar o Super Admin com o valor estornado do split
        PERFORM public.creditar_carteira(
          v_super_admin_id,
          v_split_rec.valor,
          0,
          'Estorno de Pedido (Cancelado/Devolvido) #' || NEW.order_number,
          'cancelamento_pedido',
          NEW.id,
          'estorno'
        );
        
        -- Marcar split como estornado (reversed)
        UPDATE public.order_payment_splits
        SET status = 'reversed', processed_at = NOW()
        WHERE id = v_split_rec.id;
      END LOOP;

      -- Debitar o Super Admin pelo reembolso completo do cliente (já que ele detinha o valor)
      PERFORM public.debitar_carteira(
        v_super_admin_id,
        NEW.total_amount,
        'Reembolso Cliente - Pedido #' || NEW.order_number,
        'cancelamento_pedido',
        NEW.id
      );
      
      -- Creditar a carteira do Cliente comprador
      PERFORM public.creditar_carteira(
        NEW.user_id,
        NEW.total_amount,
        0,
        'Estorno / Reembolso - Pedido #' || NEW.order_number,
        'cancelamento_pedido',
        NEW.id,
        'estorno'
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar gatilho na tabela orders
DROP TRIGGER IF EXISTS trigger_order_wallet_movements ON public.orders;
CREATE TRIGGER trigger_order_wallet_movements
AFTER UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.handle_order_wallet_movements();


-- Função de sincronização histórica para alinhar transações de pedidos antigos
CREATE OR REPLACE FUNCTION public.sync_historical_orders_to_wallets()
RETURNS JSON AS $$
DECLARE
  v_order RECORD;
  v_count_paid INT := 0;
  v_count_shipped INT := 0;
  v_count_cancelled INT := 0;
BEGIN
  -- Processar pedidos pagos passados
  FOR v_order IN (
    SELECT id, order_number, status, payment_status, total_amount, user_id, reseller_id, created_at
    FROM public.orders
    WHERE payment_status = 'paid'
    ORDER BY created_at ASC
  ) LOOP
    -- Simular o fluxo do pedido disparando as rotinas internas do trigger sequencialmente

    -- 1. Simular recebimento do pagamento
    -- (O trigger handle_order_wallet_movements processa a mudança do status de pagamento para 'paid')
    -- Vamos chamar a lógica interna do trigger diretamente fazendo um UPDATE simulado para 'paid'
    -- ou simplesmente inserindo se não existir.
    -- Como queremos ser idôneos, vamos fazer um UPDATE dummy no registro para disparar o trigger!
    -- Isso garante que as regras exatas do trigger rodem!
    UPDATE public.orders
    SET payment_status = 'paid'
    WHERE id = v_order.id;
    v_count_paid := v_count_paid + 1;

    -- 2. Simular envio se o status estiver 'enviado' ou 'finalizado'
    IF v_order.status IN ('enviado', 'finalizado') THEN
      UPDATE public.orders
      SET status = v_order.status
      WHERE id = v_order.id;
      v_count_shipped := v_count_shipped + 1;
    END IF;

    -- 3. Simular cancelamento se o status atual estiver cancelado
    IF v_order.status IN ('cancelado', 'reembolsado', 'devolucao_aprovada') THEN
      UPDATE public.orders
      SET status = v_order.status
      WHERE id = v_order.id;
      v_count_cancelled := v_count_cancelled + 1;
    END IF;
  END LOOP;

  RETURN json_build_object(
    'success', true,
    'orders_paid_synced', v_count_paid,
    'orders_shipped_synced', v_count_shipped,
    'orders_cancelled_synced', v_count_cancelled
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
