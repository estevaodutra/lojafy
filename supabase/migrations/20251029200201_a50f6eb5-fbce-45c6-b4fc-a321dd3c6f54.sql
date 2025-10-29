-- Create user cleanup logs table
CREATE TABLE IF NOT EXISTS public.user_cleanup_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  email TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('disabled', 'deleted', 'reactivated')),
  reason TEXT NOT NULL,
  days_inactive INTEGER NOT NULL,
  performed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  performed_by UUID
);

-- Enable RLS
ALTER TABLE public.user_cleanup_logs ENABLE ROW LEVEL SECURITY;

-- Super admins can view all logs
CREATE POLICY "Super admins can view cleanup logs"
ON public.user_cleanup_logs
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Service role can insert logs
CREATE POLICY "Service role can insert cleanup logs"
ON public.user_cleanup_logs
FOR INSERT
WITH CHECK (true);

-- Create function to get inactive users for cleanup
CREATE OR REPLACE FUNCTION get_inactive_users_for_cleanup()
RETURNS TABLE (
  user_id UUID,
  email TEXT,
  created_at TIMESTAMPTZ,
  last_sign_in_at TIMESTAMPTZ,
  days_since_creation INTEGER,
  action_needed TEXT,
  is_banned BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    au.id as user_id,
    au.email::TEXT,
    au.created_at,
    au.last_sign_in_at,
    EXTRACT(DAY FROM NOW() - au.created_at)::INTEGER as days_since_creation,
    CASE 
      WHEN au.last_sign_in_at IS NULL AND au.created_at < NOW() - INTERVAL '60 days' THEN 'delete'
      WHEN au.last_sign_in_at IS NULL AND au.created_at < NOW() - INTERVAL '30 days' THEN 'disable'
      ELSE 'none'
    END as action_needed,
    (au.banned_until IS NOT NULL AND au.banned_until > NOW()) as is_banned
  FROM auth.users au
  LEFT JOIN profiles p ON p.user_id = au.id
  WHERE 
    au.last_sign_in_at IS NULL
    AND au.deleted_at IS NULL
    AND (p.role IS NULL OR p.role NOT IN ('super_admin', 'admin'))
    AND au.created_at < NOW() - INTERVAL '30 days'
  ORDER BY au.created_at ASC;
END;
$$;

-- Create function to disable inactive users
CREATE OR REPLACE FUNCTION disable_inactive_users()
RETURNS TABLE (
  affected_count INTEGER,
  user_emails TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_count INTEGER := 0;
  v_user_emails TEXT[] := ARRAY[]::TEXT[];
  v_user RECORD;
BEGIN
  -- Get users to disable
  FOR v_user IN 
    SELECT * FROM get_inactive_users_for_cleanup()
    WHERE action_needed = 'disable' AND NOT is_banned
  LOOP
    -- Ban user in auth.users
    UPDATE auth.users 
    SET banned_until = NOW() + INTERVAL '999 years'
    WHERE id = v_user.user_id;
    
    -- Deactivate in profiles
    UPDATE profiles 
    SET is_active = false
    WHERE user_id = v_user.user_id;
    
    -- Log action
    INSERT INTO user_cleanup_logs (user_id, email, action, reason, days_inactive)
    VALUES (
      v_user.user_id,
      v_user.email,
      'disabled',
      'No login activity after 30 days of account creation',
      v_user.days_since_creation
    );
    
    v_affected_count := v_affected_count + 1;
    v_user_emails := array_append(v_user_emails, v_user.email);
  END LOOP;
  
  RETURN QUERY SELECT v_affected_count, v_user_emails;
END;
$$;

-- Create function to delete inactive users
CREATE OR REPLACE FUNCTION delete_inactive_users()
RETURNS TABLE (
  affected_count INTEGER,
  user_emails TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_affected_count INTEGER := 0;
  v_user_emails TEXT[] := ARRAY[]::TEXT[];
  v_user RECORD;
BEGIN
  -- Get users to delete
  FOR v_user IN 
    SELECT * FROM get_inactive_users_for_cleanup()
    WHERE action_needed = 'delete'
  LOOP
    -- Log action before deleting
    INSERT INTO user_cleanup_logs (user_id, email, action, reason, days_inactive)
    VALUES (
      v_user.user_id,
      v_user.email,
      'deleted',
      'No login activity after 60 days of account creation',
      v_user.days_since_creation
    );
    
    -- Soft delete in auth.users
    UPDATE auth.users 
    SET deleted_at = NOW()
    WHERE id = v_user.user_id;
    
    v_affected_count := v_affected_count + 1;
    v_user_emails := array_append(v_user_emails, v_user.email);
  END LOOP;
  
  RETURN QUERY SELECT v_affected_count, v_user_emails;
END;
$$;