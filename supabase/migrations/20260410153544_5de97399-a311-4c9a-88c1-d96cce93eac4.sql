
-- Enum
CREATE TYPE public.wallet_transaction_tipo AS ENUM (
  'recarga', 'pagamento_pedido', 'estorno', 'bonus',
  'ajuste_credito', 'ajuste_debito', 'cashback'
);

-- Carteira (1 por usuário)
CREATE TABLE public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  saldo DECIMAL(10,2) NOT NULL DEFAULT 0,
  saldo_bloqueado DECIMAL(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Validation trigger instead of CHECK constraint
CREATE OR REPLACE FUNCTION public.validate_wallet_saldo()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.saldo < 0 THEN
    RAISE EXCEPTION 'Saldo não pode ser negativo';
  END IF;
  IF NEW.saldo_bloqueado < 0 THEN
    RAISE EXCEPTION 'Saldo bloqueado não pode ser negativo';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER validate_wallet_saldo_trigger
BEFORE INSERT OR UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.validate_wallet_saldo();

-- Transações
CREATE TABLE public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id),
  tipo public.wallet_transaction_tipo NOT NULL,
  valor DECIMAL(10,2) NOT NULL,
  taxa DECIMAL(10,2) DEFAULT 0,
  valor_pago DECIMAL(10,2) DEFAULT 0,
  saldo_anterior DECIMAL(10,2) NOT NULL,
  saldo_posterior DECIMAL(10,2) NOT NULL,
  descricao TEXT,
  referencia_tipo TEXT,
  referencia_id UUID,
  status TEXT NOT NULL DEFAULT 'pending',
  payment_id TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX idx_wallet_transactions_status ON public.wallet_transactions(status);
CREATE INDEX idx_wallet_transactions_referencia ON public.wallet_transactions(referencia_tipo, referencia_id);

-- Configurações na platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS carteira_valor_minimo DECIMAL(10,2) DEFAULT 100,
  ADD COLUMN IF NOT EXISTS carteira_valor_maximo DECIMAL(10,2) DEFAULT 5000,
  ADD COLUMN IF NOT EXISTS carteira_taxa_percentual DECIMAL(5,2) DEFAULT 5.5,
  ADD COLUMN IF NOT EXISTS carteira_valores_sugeridos JSONB DEFAULT '[100,200,300,500]',
  ADD COLUMN IF NOT EXISTS carteira_pagamento_parcial BOOLEAN DEFAULT false;

-- RLS wallets
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet"
ON public.wallets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets"
ON public.wallets FOR SELECT
USING (public.is_admin_user());

-- RLS wallet_transactions
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own transactions"
ON public.wallet_transactions FOR SELECT
USING (
  wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid())
);

CREATE POLICY "Admins can view all transactions"
ON public.wallet_transactions FOR SELECT
USING (public.is_admin_user());

-- Updated at trigger for wallets
CREATE TRIGGER update_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Stored Procedure: debitar_carteira
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
BEGIN
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Carteira não encontrada');
  END IF;

  IF v_wallet.saldo < p_valor THEN
    RETURN json_build_object('success', false, 'error', 'Saldo insuficiente');
  END IF;

  v_novo_saldo := v_wallet.saldo - p_valor;

  UPDATE public.wallets
  SET saldo = v_novo_saldo, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  ) VALUES (
    v_wallet.id, 'pagamento_pedido', p_valor, v_wallet.saldo, v_novo_saldo,
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

-- Stored Procedure: creditar_carteira
CREATE OR REPLACE FUNCTION public.creditar_carteira(
  p_user_id UUID,
  p_valor DECIMAL,
  p_taxa DECIMAL DEFAULT 0,
  p_descricao TEXT DEFAULT 'Crédito',
  p_referencia_tipo TEXT DEFAULT NULL,
  p_referencia_id UUID DEFAULT NULL,
  p_tipo public.wallet_transaction_tipo DEFAULT 'recarga'
) RETURNS JSON AS $$
DECLARE
  v_wallet public.wallets%ROWTYPE;
  v_novo_saldo DECIMAL;
  v_transaction_id UUID;
BEGIN
  SELECT * INTO v_wallet
  FROM public.wallets
  WHERE user_id = p_user_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Auto-create wallet
    INSERT INTO public.wallets (user_id, saldo)
    VALUES (p_user_id, 0)
    RETURNING * INTO v_wallet;
  END IF;

  v_novo_saldo := v_wallet.saldo + p_valor;

  UPDATE public.wallets
  SET saldo = v_novo_saldo, updated_at = NOW()
  WHERE id = v_wallet.id;

  INSERT INTO public.wallet_transactions (
    wallet_id, tipo, valor, taxa, valor_pago, saldo_anterior, saldo_posterior,
    descricao, referencia_tipo, referencia_id, status
  ) VALUES (
    v_wallet.id, p_tipo, p_valor, p_taxa, p_valor + p_taxa, v_wallet.saldo, v_novo_saldo,
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

-- Trigger: create wallet on new profile
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER create_wallet_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- Create wallets for existing users
INSERT INTO public.wallets (user_id)
SELECT user_id FROM public.profiles
ON CONFLICT (user_id) DO NOTHING;
