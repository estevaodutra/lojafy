-- Update the app_role enum to include supplier and reseller roles
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'supplier';
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'reseller';

-- Update the user role for estevaodutra.pmss@gmail.com to super_admin
UPDATE profiles 
SET role = 'super_admin' 
WHERE user_id = (
  SELECT id FROM auth.users 
  WHERE email = 'estevaodutra.pmss@gmail.com'
);