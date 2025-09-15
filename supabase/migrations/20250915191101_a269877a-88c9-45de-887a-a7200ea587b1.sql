-- Create security definer function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  );
$$;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;

-- Create comprehensive RLS policies for profiles table
-- Users can view their own profile OR admins can view any profile
CREATE POLICY "Users can view own profile, admins can view all"
ON public.profiles
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR public.is_admin_user()
);

-- Users can insert their own profile only
CREATE POLICY "Users can create their own profile"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile OR admins can update any profile
CREATE POLICY "Users can update own profile, admins can update all"
ON public.profiles
FOR UPDATE
TO authenticated
USING (
  auth.uid() = user_id OR public.is_admin_user()
)
WITH CHECK (
  auth.uid() = user_id OR public.is_admin_user()
);

-- Only admins can delete profiles (for GDPR compliance)
CREATE POLICY "Only admins can delete profiles"
ON public.profiles
FOR DELETE
TO authenticated
USING (public.is_admin_user());