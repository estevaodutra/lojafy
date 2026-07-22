-- 1.1 Modifica√ß√µes em wallets
ALTER TABLE public.wallets 
ADD COLUMN IF NOT EXISTS saldo_reservado_saque DECIMAL(10,2) NOT NULL DEFAULT 0;

-- Atualizar function validate_wallet_saldo
CREATE OR REPLACE FUNCTION public.validate_wallet_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saldo < 0 THEN
    RAISE EXCEPTION 'Saldo n√£o pode ser negativo';
  END IF;
  IF NEW.saldo_bloqueado < 0 THEN
    RAISE EXCEPTION 'Saldo bloqueado n√£o pode ser negativo';
  END IF;
  IF NEW.saldo_reservado_saque < 0 THEN
    RAISE EXCEPTION 'Saldo reservado n√£o pode ser negativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- 1.2 Modifica√ß√µes em withdrawal_requests
ALTER TABLE public.withdrawal_requests
ADD COLUMN IF NOT EXISTS protocol TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS pix_key_type TEXT,
ADD COLUMN IF NOT EXISTS holder_name TEXT,
ADD COLUMN IF NOT EXISTS holder_document TEXT,
ADD COLUMN IF NOT EXISTS transaction_id TEXT,
ADD COLUMN IF NOT EXISTS proof_url TEXT,
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

-- Gerar protocol se nulo
UPDATE public.withdrawal_requests SET protocol = 'SAQ-LEGACY-' || left(id::text, 8) WHERE protocol IS NULL;

-- 1.3 Tabelas return_requests e items
CREATE TABLE IF NOT EXISTS public.return_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  protocol TEXT NOT NULL UNIQUE,
  order_id UUID NOT NULL REFERENCES public.orders(id),
  reseller_id UUID REFERENCES auth.users(id),
  supplier_id UUID REFERENCES auth.users(id),
  request_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'solicitacao_aberta',
  requested_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  approved_amount DECIMAL(10,2),
  responsibility TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.return_request_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  order_item_id UUID NOT NULL REFERENCES public.order_items(id),
  product_id UUID NOT NULL REFERENCES public.products(id),
  quantity INT NOT NULL CHECK (quantity > 0),
  unit_price DECIMAL(10,2) NOT NULL,
  requested_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  approved_amount DECIMAL(10,2),
  condition TEXT
);

-- 1.4 Auditoria
CREATE TABLE IF NOT EXISTS public.return_request_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  return_request_id UUID NOT NULL REFERENCES public.return_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  previous_status TEXT,
  new_status TEXT,
  actor_id UUID REFERENCES auth.users(id),
  actor_role TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.5 Supplier Credits
CREATE TABLE IF NOT EXISTS public.supplier_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  return_request_id UUID REFERENCES public.return_requests(id),
  order_id UUID REFERENCES public.orders(id),
  amount DECIMAL(10,2) NOT NULL,
  credit_type TEXT,
  status TEXT NOT NULL DEFAULT 'pendente',
  compensation_method TEXT,
  confirmed_by UUID REFERENCES auth.users(id),
  confirmed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 1.6 Supplier Ledger Entries
CREATE TABLE IF NOT EXISTS public.supplier_ledger_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  supplier_id UUID NOT NULL REFERENCES auth.users(id),
  entry_type TEXT NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  debit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(10,2) NOT NULL DEFAULT 0,
  balance_after DECIMAL(10,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.return_request_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_ledger_entries ENABLE ROW LEVEL SECURITY;

-- Admins and Service Roles can do everything
CREATE POLICY "Admins can view and manage return requests" ON public.return_requests FOR ALL USING (public.is_admin_user() OR auth.role() = 'service_role');
CREATE POLICY "Admins can view and manage return items" ON public.return_request_items FOR ALL USING (public.is_admin_user() OR auth.role() = 'service_role');
CREATE POLICY "Admins can view and manage return events" ON public.return_request_events FOR ALL USING (public.is_admin_user() OR auth.role() = 'service_role');
CREATE POLICY "Admins can view and manage supplier credits" ON public.supplier_credits FOR ALL USING (public.is_admin_user() OR auth.role() = 'service_role');
CREATE POLICY "Admins can view and manage ledger" ON public.supplier_ledger_entries FOR ALL USING (public.is_admin_user() OR auth.role() = 'service_role');

-- Resellers and Suppliers View Access
CREATE POLICY "Resellers view own returns" ON public.return_requests FOR SELECT USING (auth.uid() = reseller_id);
CREATE POLICY "Suppliers view own returns" ON public.return_requests FOR SELECT USING (auth.uid() = supplier_id);

CREATE POLICY "Resellers view own return items" ON public.return_request_items FOR SELECT USING (
  return_request_id IN (SELECT id FROM public.return_requests WHERE reseller_id = auth.uid())
);
CREATE POLICY "Suppliers view own return items" ON public.return_request_items FOR SELECT USING (
  return_request_id IN (SELECT id FROM public.return_requests WHERE supplier_id = auth.uid())
);

CREATE POLICY "Users view own return events" ON public.return_request_events FOR SELECT USING (
  return_request_id IN (
    SELECT id FROM public.return_requests 
    WHERE reseller_id = auth.uid() OR supplier_id = auth.uid()
  )
);

CREATE POLICY "Suppliers view own credits" ON public.supplier_credits FOR SELECT USING (auth.uid() = supplier_id);
CREATE POLICY "Suppliers view own ledger" ON public.supplier_ledger_entries FOR SELECT USING (auth.uid() = supplier_id);

-- 1.7 Modifica√ß√£o do Gatilho Atual
-- Recriar handle_order_wallet_movements sem a l√≥gica de estorno autom√°tico
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

  -- 2. Cen√°rio: Pedido Pago
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

  -- 3. Cen√°rio: Pedido Enviado ('enviado')
  IF NEW.status = 'enviado' AND (OLD.status IS DISTINCT FROM 'enviado' OR OLD.status IS NULL) AND NEW.payment_status = 'paid' THEN
    SELECT COALESCE(split_fornecedor_percentual, 0), COALESCE(split_revendedor_percentual, 0)
    INTO v_split_fornecedor_pct, v_split_revendedor_pct
    FROM public.platform_settings
    LIMIT 1;

    v_reseller_id := NEW.reseller_id;

    FOR item_rec IN (
      SELECT oi.id, oi.unit_price, oi.quantity, p.cost_price, p.supplier_id
      FROM public.order_items oi
      JOIN public.products p ON oi.product_id = p.id
      WHERE oi.order_id = NEW.id
    ) LOOP
      -- A. Split do Fornecedor
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
        IF v_split_revendedor_pct > 0 THEN
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
            'Comiss√£o Revendedor - Pedido #' || NEW.order_number,
            'venda_pedido',
            NEW.id
          );
          
          v_res := public.creditar_carteira(
            v_reseller_id,
            v_valor_revendedor,
            0,
            'Comiss√£o de venda - Pedido #' || NEW.order_number,
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

  -- 4. Cen√°rio: Pedido Cancelado ou Devolvido
  -- NOTA: A l√≥gica autom√°tica de estorno foi REMOVIDA para o novo m√≥dulo de Return Requests.
  -- Agora o estorno s√≥ ocorre manual ou via RPC do m√≥dulo de devolu√ß√£o (fornecedor deve autorizar).

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Adicionando novos tipos de transaction na enum (usando alter type com catch silencioso de erro caso j√° exista)
ALTER TYPE public.wallet_transaction_tipo ADD VALUE IF NOT EXISTS 'cancelamento_credito';
ALTER TYPE public.wallet_transaction_tipo ADD VALUE IF NOT EXISTS 'reserva_saque';
ALTER TYPE public.wallet_transaction_tipo ADD VALUE IF NOT EXISTS 'cancelamento_saque';
ALTER TYPE public.wallet_transaction_tipo ADD VALUE IF NOT EXISTS 'pagamento_saque';

-- Cria√ß√£o do RPC de Saque
CREATE OR REPLACE FUNCTION public.solicitar_saque(
  p_user_id UUID,
  p_valor DECIMAL,
  p_pix_key TEXT,
  p_pix_key_type TEXT,
  p_holder_name TEXT,
  p_holder_document TEXT
) RETURNS JSON AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_protocol TEXT;
  v_req_id UUID;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Carteira n√£o encontrada');
  END IF;

  IF v_wallet.saldo < p_valor THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  -- Atualiza carteira: diminui saldo, aumenta reservado
  UPDATE public.wallets 
  SET 
    saldo = saldo - p_valor, 
    saldo_reservado_saque = saldo_reservado_saque + p_valor,
    updated_at = NOW()
  WHERE id = v_wallet.id;

  -- Gera protocolo
  v_protocol := 'SAQ-' || to_char(NOW(), 'YYYY') || '-' || substring(md5(random()::text) from 1 for 6);

  -- Cria request
  INSERT INTO public.withdrawal_requests (
    user_id, amount, net_amount, withdrawal_method, pix_key, status, 
    protocol, pix_key_type, holder_name, holder_document
  ) VALUES (
    p_user_id, p_valor, p_valor, 'pix', p_pix_key, 'pending',
    upper(v_protocol), p_pix_key_type, p_holder_name, p_holder_document
  ) RETURNING id INTO v_req_id;

  -- Insere transaction de reserva (meramente visual ou registro)
  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  ) VALUES (
    v_wallet.id, 'reserva_saque', p_valor, v_wallet.saldo, v_wallet.saldo - p_valor,
    'Reserva de saque ' || upper(v_protocol), 'withdrawal_request', v_req_id, 'completed'
  );

  RETURN json_build_object(
    'success', true,
    'protocol', upper(v_protocol),
    'request_id', v_req_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar RPC de Pagar Saque
CREATE OR REPLACE FUNCTION public.concluir_saque(
  p_admin_id UUID,
  p_request_id UUID,
  p_transaction_id TEXT,
  p_proof_url TEXT
) RETURNS JSON AS $$
DECLARE
  v_req public.withdrawal_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Saque n√£o encontrado');
  END IF;

  IF v_req.status != 'pending' AND v_req.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Saque j√° foi processado ou rejeitado');
  END IF;

  -- Atualiza carteira (baixa o saldo reservado)
  UPDATE public.wallets 
  SET 
    saldo_reservado_saque = saldo_reservado_saque - v_req.amount,
    updated_at = NOW()
  WHERE user_id = v_req.user_id;

  -- Atualiza o pedido de saque
  UPDATE public.withdrawal_requests 
  SET 
    status = 'completed',
    processed_by = p_admin_id,
    processed_at = NOW(),
    transaction_id = p_transaction_id,
    proof_url = p_proof_url
  WHERE id = v_req.id;

  -- Cria transa√ß√£o para hist√≥rico
  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  )
  SELECT id, 'pagamento_saque', v_req.amount, saldo, saldo,
         'Pagamento de saque ' || v_req.protocol, 'withdrawal_request', v_req.id, 'completed'
  FROM public.wallets WHERE user_id = v_req.user_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar RPC de Rejeitar/Cancelar Saque
CREATE OR REPLACE FUNCTION public.rejeitar_saque(
  p_admin_id UUID,
  p_request_id UUID,
  p_reason TEXT
) RETURNS JSON AS $$
DECLARE
  v_req public.withdrawal_requests%ROWTYPE;
BEGIN
  SELECT * INTO v_req FROM public.withdrawal_requests WHERE id = p_request_id FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Saque n√£o encontrado');
  END IF;

  IF v_req.status != 'pending' AND v_req.status != 'approved' THEN
    RETURN json_build_object('success', false, 'error', 'Saque j√° foi processado ou rejeitado');
  END IF;

  -- Atualiza carteira (devolve do reservado pro disponivel)
  UPDATE public.wallets 
  SET 
    saldo_reservado_saque = saldo_reservado_saque - v_req.amount,
    saldo = saldo + v_req.amount,
    updated_at = NOW()
  WHERE user_id = v_req.user_id;

  -- Atualiza o pedido de saque
  UPDATE public.withdrawal_requests 
  SET 
    status = 'rejected',
    processed_by = p_admin_id,
    processed_at = NOW(),
    rejection_reason = p_reason
  WHERE id = v_req.id;

  -- Cria transa√ß√£o para hist√≥rico
  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  )
  SELECT id, 'cancelamento_saque', v_req.amount, saldo - v_req.amount, saldo,
         'Cancelamento de saque ' || v_req.protocol || ' - Motivo: ' || p_reason, 'withdrawal_request', v_req.id, 'completed'
  FROM public.wallets WHERE user_id = v_req.user_id;

  RETURN json_build_object('success', true);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Criar RPC de Aprovar CrÈdito e Liberar na Carteira
CREATE OR REPLACE FUNCTION public.aprovar_credito_fornecedor(
  p_admin_id UUID,
  p_return_request_id UUID,
  p_supplier_credit_id UUID
) RETURNS JSON AS $
DECLARE
  v_req public.return_requests%ROWTYPE;
  v_credit public.supplier_credits%ROWTYPE;
  v_res JSON;
BEGIN
  -- 1. Carregar a devoluÁ„o
  SELECT * INTO v_req FROM public.return_requests WHERE id = p_return_request_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'SolicitaÁ„o n„o encontrada'); END IF;

  -- 2. Carregar o crÈdito do fornecedor
  SELECT * INTO v_credit FROM public.supplier_credits WHERE id = p_supplier_credit_id FOR UPDATE;
  IF NOT FOUND THEN RETURN json_build_object('success', false, 'error', 'CrÈdito do fornecedor n„o encontrado'); END IF;

  IF v_credit.status = 'confirmado' THEN
    RETURN json_build_object('success', false, 'error', 'CrÈdito j· foi confirmado');
  END IF;

  -- 3. Marcar o crÈdito como confirmado
  UPDATE public.supplier_credits 
  SET status = 'confirmado', confirmed_by = p_admin_id, confirmed_at = NOW() 
  WHERE id = v_credit.id;

  -- 4. Criar registro na conta corrente do fornecedor (dÈbito pro fornecedor perante a lojafy)
  INSERT INTO public.supplier_ledger_entries (
    supplier_id, entry_type, reference_type, reference_id, description,
    debit_amount, credit_amount, balance_after, status
  ) VALUES (
    v_credit.supplier_id, 'chargeback', 'return_request', v_req.id, 'CobranÁa por devoluÁ„o/cancelamento',
    v_credit.amount, 0, 0, 'completed'
  );

  -- 5. Atualizar a solicitaÁ„o de devoluÁ„o para resolvido
  UPDATE public.return_requests 
  SET status = 'resolvido', approved_amount = v_credit.amount, resolved_at = NOW()
  WHERE id = v_req.id;

  -- 6. Creditar a carteira do vendedor (revendedor ou cliente)
  v_res := public.creditar_carteira(
    v_req.reseller_id, 
    v_credit.amount, 
    0, 
    'CrÈdito referente a Cancelamento/DevoluÁ„o ' || v_req.protocol, 
    'return_request', 
    v_req.id, 
    'cancelamento_credito'
  );

  RETURN json_build_object('success', true);
END;
$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
