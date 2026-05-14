-- Colunas de envio ML em orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS ml_shipment_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_label_url TEXT,
  ADD COLUMN IF NOT EXISTS tracking_code TEXT,
  ADD COLUMN IF NOT EXISTS ml_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_ml_shipment ON public.orders(ml_shipment_id) WHERE ml_shipment_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_ml_order_id ON public.orders(ml_order_id) WHERE ml_order_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_orders_payment_method ON public.orders(payment_method);
