
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS envio_mesmo_dia BOOLEAN DEFAULT false;

ALTER TABLE public.platform_settings
  ADD COLUMN IF NOT EXISTS horario_corte_envio TIME DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS dias_envio JSONB DEFAULT '[1,2,3,4,5]';
