-- Add default_margin column to reseller_stores table
ALTER TABLE public.reseller_stores 
ADD COLUMN default_margin numeric DEFAULT 30;