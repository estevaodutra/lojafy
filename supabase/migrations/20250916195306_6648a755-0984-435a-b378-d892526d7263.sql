-- Remove the overly permissive policy that exposes sensitive customer data
DROP POLICY IF EXISTS "Anyone can view basic profile data for ranking" ON public.profiles;

-- Create a security definer function that provides only non-sensitive data needed for ranking
CREATE OR REPLACE FUNCTION public.get_customer_display_name(customer_user_id uuid)
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN first_name IS NOT NULL AND last_name IS NOT NULL THEN
        LEFT(first_name, 1) || REPEAT('*', GREATEST(0, LENGTH(first_name) - 2)) || RIGHT(first_name, 1) || ' ' ||
        LEFT(last_name, 1) || REPEAT('*', GREATEST(0, LENGTH(last_name) - 2)) || RIGHT(last_name, 1)
      WHEN first_name IS NOT NULL THEN
        LEFT(first_name, 1) || REPEAT('*', GREATEST(0, LENGTH(first_name) - 2)) || RIGHT(first_name, 1)
      ELSE 'Cliente'
    END
  FROM public.profiles 
  WHERE user_id = customer_user_id;
$$;