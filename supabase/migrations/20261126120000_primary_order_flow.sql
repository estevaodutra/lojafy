CREATE OR REPLACE FUNCTION public.settle_wallet_order(p_order_id uuid, p_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_debit json;
  v_existing_debit numeric;
BEGIN
  SELECT * INTO v_order
  FROM public.orders
  WHERE id = p_order_id AND user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido de carteira não encontrado');
  END IF;

  IF v_order.payment_status = 'paid' AND v_order.payment_method = 'wallet' THEN
    RETURN jsonb_build_object('success', true, 'changed', false);
  END IF;

  IF v_order.status NOT IN ('pending', 'pendente')
     OR v_order.payment_status IS DISTINCT FROM 'pending'
     OR v_order.total_amount IS NULL OR v_order.total_amount <= 0
     OR NOT EXISTS (SELECT 1 FROM public.order_items WHERE order_id = p_order_id) THEN
    RETURN jsonb_build_object('success', false, 'error', 'Pedido indisponível para pagamento');
  END IF;

  -- Checkouts anteriores já lançavam o débito antes de chamar a confirmação.
  SELECT sum(t.valor) INTO v_existing_debit
  FROM public.wallet_transactions t
  JOIN public.wallets w ON w.id = t.wallet_id
  WHERE w.user_id = p_user_id AND t.referencia_tipo = 'pedido'
    AND t.referencia_id = p_order_id AND t.tipo = 'pagamento_pedido' AND t.status = 'completed';

  IF v_existing_debit IS NOT NULL THEN
    IF v_existing_debit <> v_order.total_amount
       OR v_order.payment_method NOT IN ('wallet', 'pix') THEN
      RETURN jsonb_build_object('success', false, 'error', 'Débito existente requer conciliação');
    END IF;
  ELSIF v_order.payment_method = 'wallet' THEN
    v_debit := public.debitar_carteira(
      p_user_id, v_order.total_amount, 'Pagamento Pedido ' || v_order.order_number, 'pedido', p_order_id
    );
    IF (v_debit->>'success')::boolean IS DISTINCT FROM true THEN
      RETURN jsonb_build_object('success', false, 'error', v_debit->>'error');
    END IF;
  ELSE
    RETURN jsonb_build_object('success', false, 'error', 'Pedido de carteira não encontrado');
  END IF;

  UPDATE public.orders
  SET status = 'recebido', payment_status = 'paid', payment_method = 'wallet'
  WHERE id = p_order_id;

  INSERT INTO public.order_status_history (order_id, status, notes)
  VALUES (p_order_id, 'recebido', 'Pagamento confirmado com saldo da carteira');

  RETURN jsonb_build_object('success', true, 'changed', true);
END;
$$;

REVOKE ALL ON FUNCTION public.settle_wallet_order(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.settle_wallet_order(uuid, uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.set_order_stage_entered_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.stage_entered_at := now();
  ELSE
    NEW.stage_entered_at := OLD.stage_entered_at;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_order_stage_entered_at ON public.orders;
CREATE TRIGGER set_order_stage_entered_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.set_order_stage_entered_at();

-- Função para buscar pedidos expirados
CREATE OR REPLACE FUNCTION public.get_expired_orders()
RETURNS TABLE(
  order_id UUID,
  order_number TEXT,
  created_at TIMESTAMPTZ,
  payment_expires_at TIMESTAMPTZ,
  minutes_expired INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    o.id as order_id,
    o.order_number,
    o.created_at,
    o.payment_expires_at,
    EXTRACT(EPOCH FROM (NOW() - o.payment_expires_at))::INTEGER / 60 as minutes_expired
  FROM orders o
  WHERE 
    o.payment_status IN ('pending', 'processing')
    AND o.status IN ('pending', 'pendente')
    AND o.payment_expires_at IS NOT NULL
    AND o.payment_expires_at < NOW()
  ORDER BY o.payment_expires_at ASC;
END;
$$;

-- Função para cancelar pedido expirado
CREATE OR REPLACE FUNCTION public.cancel_expired_order(p_order_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_order_number TEXT;
  v_affected_rows INTEGER;
BEGIN
  -- Buscar número do pedido
  SELECT order_number INTO v_order_number
  FROM orders
  WHERE id = p_order_id;
  
  -- Atualizar status do pedido
  UPDATE orders
  SET 
    status = 'cancelado',
    payment_status = 'expired',
    updated_at = NOW()
  WHERE 
    id = p_order_id
    AND payment_status IN ('pending', 'processing')
    AND status IN ('pending', 'pendente')
    AND payment_expires_at < NOW();
  
  GET DIAGNOSTICS v_affected_rows = ROW_COUNT;
  
  -- Se o pedido foi cancelado, registrar no histórico
  IF v_affected_rows > 0 THEN
    INSERT INTO order_status_history (order_id, status, notes)
    VALUES (
      p_order_id, 
      'cancelado', 
      'Pedido cancelado automaticamente - Pagamento não confirmado antes do vencimento'
    );
    
    RETURN TRUE;
  END IF;
  
  RETURN FALSE;
END;
$$;
