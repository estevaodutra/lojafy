-- ============================================================
-- Wallet Split Payment System
-- ============================================================

-- 1. Colunas de configuração de split/saque em platform_settings
ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS split_fornecedor_percentual DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_revendedor_percentual DECIMAL(5,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS split_plataforma_percentual DECIMAL(5,2) DEFAULT 5,
  ADD COLUMN IF NOT EXISTS saque_valor_minimo DECIMAL(10,2) DEFAULT 50,
  ADD COLUMN IF NOT EXISTS saque_taxa_percentual DECIMAL(5,2) DEFAULT 2.5,
  ADD COLUMN IF NOT EXISTS saque_metodos_permitidos JSONB DEFAULT '["pix","transferencia"]'::jsonb;

-- 2. Tabela de rastreamento de splits por pedido
CREATE TABLE IF NOT EXISTS public.order_payment_splits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  recipient_user_id UUID NOT NULL REFERENCES auth.users(id),
  recipient_role TEXT NOT NULL CHECK (recipient_role IN ('supplier', 'reseller', 'platform')),
  valor DECIMAL(10,2) NOT NULL CHECK (valor >= 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'credited', 'failed')),
  wallet_transaction_id UUID REFERENCES public.wallet_transactions(id),
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_order_payment_splits_order_id
  ON public.order_payment_splits(order_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_splits_recipient
  ON public.order_payment_splits(recipient_user_id);
CREATE INDEX IF NOT EXISTS idx_order_payment_splits_status
  ON public.order_payment_splits(status);

-- 3. RLS para order_payment_splits
ALTER TABLE public.order_payment_splits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own splits"
  ON public.order_payment_splits FOR SELECT
  USING (auth.uid() = recipient_user_id);

CREATE POLICY "Super admins can view all splits"
  ON public.order_payment_splits FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Service role can manage splits"
  ON public.order_payment_splits FOR ALL
  USING (true)
  WITH CHECK (true);

-- 4. Adicionar fee ao withdrawal_requests (se não existir)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS fee DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS net_amount DECIMAL(10,2);

-- Calcular net_amount para registros existentes
UPDATE public.withdrawal_requests
  SET net_amount = amount - COALESCE(fee, 0)
  WHERE net_amount IS NULL;

-- 5. Permitir suppliers de ver/criar seus próprios saques
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'withdrawal_requests'
    AND policyname = 'Suppliers can view own withdrawals'
  ) THEN
    CREATE POLICY "Suppliers can view own withdrawals"
      ON public.withdrawal_requests FOR SELECT
      USING (auth.uid() = user_id AND EXISTS (
        SELECT 1 FROM public.profiles
        WHERE user_id = auth.uid() AND role = 'supplier'
      ));

    CREATE POLICY "Suppliers can create withdrawals"
      ON public.withdrawal_requests FOR INSERT
      WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
          SELECT 1 FROM public.profiles
          WHERE user_id = auth.uid() AND role = 'supplier'
        )
      );
  END IF;
END $$;
