-- Fix the search_path for generate_api_key function
DROP FUNCTION IF EXISTS public.generate_api_key();

-- Ensure pgcrypto is available in extensions schema
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Create the function with proper search_path syntax
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
  RETURN 'sk_' || encode(extensions.gen_random_bytes(32), 'hex');
END;
$$;