-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL CHECK (amount > 0),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'approved', 'rejected', 'completed')),
  bank_details JSONB NOT NULL,
  requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES auth.users(id),
  rejection_reason TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_withdrawal_requests_user_id ON public.withdrawal_requests(user_id);
CREATE INDEX idx_withdrawal_requests_status ON public.withdrawal_requests(status);
CREATE INDEX idx_withdrawal_requests_created_at ON public.withdrawal_requests(created_at DESC);

-- Enable RLS
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Resellers can view own withdrawals"
  ON public.withdrawal_requests
  FOR SELECT
  USING (auth.uid() = user_id AND EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'reseller'
  ));

CREATE POLICY "Resellers can create withdrawals"
  ON public.withdrawal_requests
  FOR INSERT
  WITH CHECK (
    auth.uid() = user_id 
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'reseller'
    )
  );

CREATE POLICY "Resellers can update own pending withdrawals"
  ON public.withdrawal_requests
  FOR UPDATE
  USING (
    auth.uid() = user_id 
    AND status = 'pending'
    AND EXISTS (
      SELECT 1 FROM public.profiles 
      WHERE user_id = auth.uid() AND role = 'reseller'
    )
  );

CREATE POLICY "Super admins can view all withdrawals"
  ON public.withdrawal_requests
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

CREATE POLICY "Super admins can manage all withdrawals"
  ON public.withdrawal_requests
  FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Function to calculate available balance
CREATE OR REPLACE FUNCTION public.calculate_available_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(
    CASE 
      WHEN transaction_type = 'commission' AND status = 'completed' THEN net_amount
      WHEN transaction_type = 'bonus' AND status = 'completed' THEN net_amount
      WHEN transaction_type = 'withdrawal' AND status IN ('completed', 'approved') THEN -amount
      WHEN transaction_type = 'refund' AND status = 'completed' THEN net_amount
      ELSE 0
    END
  ), 0)
  FROM public.financial_transactions
  WHERE user_id = p_user_id
    AND (available_at IS NULL OR available_at <= NOW());
$$;

-- Function to calculate blocked balance (in guarantee period)
CREATE OR REPLACE FUNCTION public.calculate_blocked_balance(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(net_amount), 0)
  FROM public.financial_transactions
  WHERE user_id = p_user_id
    AND transaction_type = 'commission'
    AND status = 'completed'
    AND available_at > NOW();
$$;

-- Function to calculate pending withdrawals
CREATE OR REPLACE FUNCTION public.calculate_pending_withdrawals(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id
    AND status IN ('pending', 'processing', 'approved');
$$;

-- Function to calculate total withdrawn
CREATE OR REPLACE FUNCTION public.calculate_total_withdrawn(p_user_id UUID)
RETURNS NUMERIC
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(amount), 0)
  FROM public.withdrawal_requests
  WHERE user_id = p_user_id
    AND status = 'completed';
$$;

-- Trigger to update updated_at
CREATE TRIGGER update_withdrawal_requests_updated_at
  BEFORE UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Function to process withdrawal approval
CREATE OR REPLACE FUNCTION public.approve_withdrawal(
  p_withdrawal_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update withdrawal request
  UPDATE public.withdrawal_requests
  SET 
    status = 'processing',
    processed_at = NOW(),
    processed_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_withdrawal_id
    AND status = 'pending';
  
  -- Update related financial transaction
  UPDATE public.financial_transactions
  SET 
    status = 'processing',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE description LIKE '%' || p_withdrawal_id || '%'
    AND transaction_type = 'withdrawal';
END;
$$;

-- Function to complete withdrawal
CREATE OR REPLACE FUNCTION public.complete_withdrawal(
  p_withdrawal_id UUID,
  p_admin_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Update withdrawal request
  UPDATE public.withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    processed_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_withdrawal_id
    AND status IN ('pending', 'processing', 'approved');
  
  -- Update related financial transaction
  UPDATE public.financial_transactions
  SET 
    status = 'completed',
    processed_at = NOW(),
    updated_at = NOW()
  WHERE description LIKE '%' || p_withdrawal_id || '%'
    AND transaction_type = 'withdrawal';
END;
$$;

-- Function to reject withdrawal
CREATE OR REPLACE FUNCTION public.reject_withdrawal(
  p_withdrawal_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_withdrawal RECORD;
BEGIN
  -- Get withdrawal details
  SELECT * INTO v_withdrawal
  FROM public.withdrawal_requests
  WHERE id = p_withdrawal_id
    AND status = 'pending';
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found or not in pending status';
  END IF;
  
  -- Update withdrawal request
  UPDATE public.withdrawal_requests
  SET 
    status = 'rejected',
    processed_at = NOW(),
    processed_by = p_admin_id,
    rejection_reason = p_reason,
    updated_at = NOW()
  WHERE id = p_withdrawal_id;
  
  -- Create refund transaction
  INSERT INTO public.financial_transactions (
    user_id,
    transaction_type,
    amount,
    net_amount,
    status,
    description,
    processed_at
  ) VALUES (
    v_withdrawal.user_id,
    'refund',
    v_withdrawal.amount,
    v_withdrawal.amount,
    'completed',
    'Estorno de saque rejeitado - ID: ' || p_withdrawal_id,
    NOW()
  );
END;
$$;