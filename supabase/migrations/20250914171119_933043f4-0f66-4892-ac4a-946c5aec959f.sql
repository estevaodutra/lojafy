-- Add new fields for cost price and low stock alert
ALTER TABLE public.products 
ADD COLUMN cost_price NUMERIC,
ADD COLUMN low_stock_alert BOOLEAN DEFAULT false;