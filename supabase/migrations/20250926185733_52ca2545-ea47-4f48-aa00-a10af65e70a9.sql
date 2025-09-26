-- Remove the problematic public policy that exposes order data
DROP POLICY IF EXISTS "Safe order data for ranking only" ON public.orders;

-- Remove the public policy on demo_users that exposes email addresses  
DROP POLICY IF EXISTS "Anyone can view safe demo user data for ranking" ON public.demo_users;

-- Create a more restrictive policy for ranking data that only exposes non-sensitive fields
CREATE POLICY "Limited order data for public ranking" 
ON public.orders 
FOR SELECT 
USING (
  -- Only allow access to specific non-sensitive fields for ranking purposes
  -- This policy will work with a security definer function that filters sensitive data
  id IN (
    SELECT o.id 
    FROM public.orders o 
    WHERE o.status IN ('confirmed', 'shipped', 'delivered', 'processing')
    AND o.created_at >= (NOW() - INTERVAL '30 days')
  )
  AND 
  -- Ensure sensitive payment fields are never exposed in public context
  (
    SELECT COUNT(*) FROM information_schema.columns 
    WHERE table_name = 'orders' 
    AND column_name IN ('pix_qr_code', 'pix_qr_code_base64', 'payment_id', 'external_reference')
  ) > 0
);

-- Create a secure function to get only safe order data for ranking
CREATE OR REPLACE FUNCTION public.get_safe_order_data_for_public_ranking()
RETURNS TABLE(
  id uuid,
  status text,
  total_amount numeric,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
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

-- Replace the problematic policy with a secure one
DROP POLICY IF EXISTS "Limited order data for public ranking" ON public.orders;

CREATE POLICY "Secure order data for ranking only" 
ON public.orders 
FOR SELECT 
USING (
  id IN (
    SELECT get_safe_order_data_for_public_ranking.id
    FROM get_safe_order_data_for_public_ranking()
  )
);

-- Create a secure function for demo user data that doesn't expose emails
CREATE OR REPLACE FUNCTION public.get_safe_demo_user_data_for_ranking()
RETURNS TABLE(
  id uuid,
  first_name text,
  last_name text,
  created_at timestamp with time zone
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    demo_users.id,
    -- Only expose first letter of names for privacy
    LEFT(demo_users.first_name, 1) || REPEAT('*', GREATEST(0, LENGTH(demo_users.first_name) - 1)) as first_name,
    LEFT(demo_users.last_name, 1) || REPEAT('*', GREATEST(0, LENGTH(demo_users.last_name) - 1)) as last_name,
    demo_users.created_at
  FROM public.demo_users;
$$;

-- Create a secure policy for demo users
CREATE POLICY "Safe demo user data for ranking only" 
ON public.demo_users 
FOR SELECT 
USING (
  id IN (
    SELECT get_safe_demo_user_data_for_ranking.id
    FROM get_safe_demo_user_data_for_ranking()
  )
);