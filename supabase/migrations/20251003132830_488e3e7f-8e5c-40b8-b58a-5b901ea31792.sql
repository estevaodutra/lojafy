-- Create a secure function to get users with their emails
-- Only accessible by super_admin users
CREATE OR REPLACE FUNCTION public.get_users_with_email()
RETURNS TABLE (
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
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
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
    p.created_at,
    p.updated_at
  FROM profiles p
  INNER JOIN auth.users au ON au.id = p.user_id
  WHERE EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() 
    AND role = 'super_admin'
  )
  ORDER BY p.created_at DESC;
$$;