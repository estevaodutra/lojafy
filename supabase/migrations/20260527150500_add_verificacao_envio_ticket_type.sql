-- Alter ENUM to add 'verificacao_envio'
ALTER TYPE public.order_ticket_type ADD VALUE IF NOT EXISTS 'verificacao_envio';
