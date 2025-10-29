-- Drop existing function
DROP FUNCTION IF EXISTS public.get_users_with_email();

-- Recreate function with last_sign_in_at field
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE(
  id uuid,
  user_id uuid,
  email text,
  first_name text,
  last_name text,
  phone text,
  role app_role,
  cpf text,
  avatar_url text,
  business_name text,
  business_cnpj text,
  business_address text,
  subdomain text,
  is_active boolean,
  subscription_plan text,
  subscription_expires_at timestamp with time zone,
  subscription_payment_url text,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  last_sign_in_at timestamp with time zone
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $function$
  SELECT 
    p.id,
    p.user_id,
    au.email,
    p.first_name,
    p.last_name,
    p.phone,
    p.role,
    p.cpf,
    p.avatar_url,
    p.business_name,
    p.business_cnpj,
    p.business_address,
    p.subdomain,
    p.is_active,
    p.subscription_plan,
    p.subscription_expires_at,
    p.subscription_payment_url,
    p.created_at,
    p.updated_at,
    au.last_sign_in_at
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.user_id
  WHERE EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  ORDER BY p.created_at DESC;
$function$;