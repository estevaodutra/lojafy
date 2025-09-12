-- Ensure extensions schema exists
CREATE SCHEMA IF NOT EXISTS extensions;

-- Install pgcrypto in the extensions schema (if not already)
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- If pgcrypto exists in another schema, move it to extensions
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pgcrypto' AND n.nspname <> 'extensions'
  ) THEN
    ALTER EXTENSION pgcrypto SET SCHEMA extensions;
  END IF;
END $$;

-- Recreate API key generator with correct search_path including extensions
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public, extensions'
AS $$
BEGIN
  RETURN 'sk_' || encode(gen_random_bytes(32), 'hex');
END;
$$;