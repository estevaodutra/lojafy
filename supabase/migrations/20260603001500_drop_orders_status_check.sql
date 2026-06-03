-- Drop the status check constraint from orders table to allow dynamic column names as statuses
ALTER TABLE public.orders DROP CONSTRAINT IF EXISTS orders_status_check;
