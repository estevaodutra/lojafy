ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS webhook_paid_status text,
  ADD COLUMN IF NOT EXISTS webhook_paid_dispatched_at timestamptz,
  ADD COLUMN IF NOT EXISTS webhook_paid_error text;