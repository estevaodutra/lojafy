-- Add external_reference field to orders table
ALTER TABLE public.orders 
ADD COLUMN external_reference TEXT;