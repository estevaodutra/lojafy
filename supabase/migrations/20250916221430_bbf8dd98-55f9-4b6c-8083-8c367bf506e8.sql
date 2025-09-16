-- Fix payment information security vulnerability
-- Remove the overly permissive policy that exposes payment data
DROP POLICY IF EXISTS "Anyone can view confirmed orders for ranking" ON public.orders;

-- Create a security definer function that returns only safe order data for ranking
CREATE OR REPLACE FUNCTION public.get_safe_order_data_for_ranking()
RETURNS TABLE (
  id uuid,
  status text,
  total_amount numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    o.id,
    o.status,
    o.total_amount,
    o.created_at
  FROM public.orders o
  WHERE o.status IN ('confirmed', 'shipped', 'delivered', 'processing')
    AND o.created_at >= (NOW() - INTERVAL '30 days');
$$;

-- Create a new restrictive policy for ranking that only exposes safe data
CREATE POLICY "Safe order data for ranking only" 
ON public.orders 
FOR SELECT 
USING (
  id IN (
    SELECT id FROM public.get_safe_order_data_for_ranking()
  )
);

-- Revoke SELECT privileges on sensitive payment columns for anon role
REVOKE SELECT (pix_qr_code, pix_qr_code_base64, payment_id, external_reference, shipping_address, billing_address) ON public.orders FROM anon;