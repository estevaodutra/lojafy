-- Atualizar o role do usuário para admin baseado no email
UPDATE profiles 
SET role = 'admin'::app_role, updated_at = now()
FROM auth.users 
WHERE profiles.user_id = auth.users.id 
AND auth.users.email = 'estevaodutra.pmss@gmail.com';