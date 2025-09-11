-- Add PIX payment fields to orders table
ALTER TABLE public.orders 
ADD COLUMN payment_id TEXT,
ADD COLUMN pix_qr_code TEXT,
ADD COLUMN pix_qr_code_base64 TEXT;

-- Add CPF field to profiles table for payment identification  
ALTER TABLE public.profiles 
ADD COLUMN cpf TEXT;