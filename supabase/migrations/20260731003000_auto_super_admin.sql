-- Update handle_new_user function to automatically assign 'super_admin' role in both profiles and user_roles tables
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  extracted_first_name TEXT;
  extracted_last_name TEXT;
  full_name TEXT;
  assigned_role app_role := 'customer'; -- Default role
BEGIN
  -- Try to get direct fields first
  extracted_first_name := NEW.raw_user_meta_data ->> 'first_name';
  extracted_last_name := NEW.raw_user_meta_data ->> 'last_name';
  
  -- If direct fields are null, try to extract from Google's full_name or name
  IF extracted_first_name IS NULL THEN
    full_name := COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name');
    
    IF full_name IS NOT NULL THEN
      -- Split full_name into first_name and last_name
      extracted_first_name := split_part(full_name, ' ', 1);
      
      -- Get the rest of the name as last_name, or leave as null if it's just one word
      IF length(full_name) > length(extracted_first_name) THEN
        extracted_last_name := trim(substring(full_name from length(extracted_first_name) + 2));
      END IF;
    END IF;
  END IF;

  -- Automatically elevate specific emails to super_admin
  IF NEW.email IN ('lojafy.app@gmail.com', 'estevaodutra.pmss@gmail.com') THEN
    assigned_role := 'super_admin'::app_role;
  END IF;

  -- 1. Insert into public.profiles
  INSERT INTO public.profiles (user_id, first_name, last_name, role)
  VALUES (
    NEW.id, 
    extracted_first_name, 
    extracted_last_name,
    assigned_role
  )
  ON CONFLICT (user_id) DO UPDATE
  SET first_name = EXCLUDED.first_name,
      last_name = EXCLUDED.last_name,
      role = EXCLUDED.role;

  -- 2. Insert into public.user_roles (essential for RLS security policies!)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    assigned_role
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

-- Ensure that if the users already exist in the database, they are updated to super_admin in both tables
UPDATE public.profiles
SET role = 'super_admin'::app_role
WHERE user_id IN (
  SELECT id FROM auth.users
  WHERE email IN ('lojafy.app@gmail.com', 'estevaodutra.pmss@gmail.com')
);

INSERT INTO public.user_roles (user_id, role)
SELECT id, 'super_admin'::app_role 
FROM auth.users
WHERE email IN ('lojafy.app@gmail.com', 'estevaodutra.pmss@gmail.com')
ON CONFLICT (user_id, role) DO NOTHING;
