-- Update handle_new_user function to support Google OAuth names
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

  INSERT INTO public.profiles (user_id, first_name, last_name)
  VALUES (
    NEW.id, 
    extracted_first_name, 
    extracted_last_name
  );
  RETURN NEW;
END;
$$;

-- Fix existing users who might have null names due to Google Auth
UPDATE public.profiles p
SET 
  first_name = split_part(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), ' ', 1),
  last_name = NULLIF(trim(substring(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name') from length(split_part(COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name'), ' ', 1)) + 2)), '')
FROM auth.users u
WHERE 
  p.user_id = u.id 
  AND (p.first_name IS NULL OR p.first_name = 'null')
  AND (u.raw_user_meta_data ->> 'full_name' IS NOT NULL OR u.raw_user_meta_data ->> 'name' IS NOT NULL);
