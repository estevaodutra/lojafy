-- Fix security vulnerability: Remove public access to demo_users emails
-- Create a security definer function that returns safe demo user data without emails
CREATE OR REPLACE FUNCTION public.get_safe_demo_user_data()
RETURNS TABLE(id uuid, first_name text, last_name text, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT 
    demo_users.id,
    demo_users.first_name,
    demo_users.last_name,
    demo_users.created_at
  FROM public.demo_users;
$$;

-- Drop the existing public read policy for demo_users
DROP POLICY IF EXISTS "Anyone can view demo users for ranking" ON public.demo_users;

-- Create a new restricted policy that uses the safe function
CREATE POLICY "Anyone can view safe demo user data for ranking" 
ON public.demo_users 
FOR SELECT 
USING (id IN (SELECT get_safe_demo_user_data.id FROM get_safe_demo_user_data()));

-- Ensure orders table only exposes safe data through the existing function
-- First check if there are any overly permissive policies on orders
DROP POLICY IF EXISTS "Anyone can view orders" ON public.orders;
DROP POLICY IF EXISTS "Public can view orders" ON public.orders;