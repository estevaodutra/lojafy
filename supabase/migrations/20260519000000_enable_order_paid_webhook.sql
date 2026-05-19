-- Ativa o webhook order.paid que foi criado com active=false na migration inicial
UPDATE public.webhook_settings
SET active = true
WHERE event_type = 'order.paid';
