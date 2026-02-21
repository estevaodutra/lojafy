-- Fix 1: Make order-ticket-attachments bucket private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'order-ticket-attachments';

-- Fix 2: Drop overly permissive public access policy
DROP POLICY IF EXISTS "Ticket attachments are publicly accessible" ON storage.objects;

-- Fix 3: Add RLS policies for role_transition_logs
CREATE POLICY "Super admins can view all role transitions"
ON public.role_transition_logs FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "Users can view own role transitions"
ON public.role_transition_logs FOR SELECT
TO authenticated
USING (user_id = auth.uid());