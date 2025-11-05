-- Garantir que a tabela user_roles existe
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- Migrar dados se necessário
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- Garantir RLS ativo
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Dropar políticas se existirem (para recriar)
DROP POLICY IF EXISTS "super_admins_manage_roles" ON public.user_roles;
DROP POLICY IF EXISTS "users_view_own_roles" ON public.user_roles;

-- Recriar políticas
CREATE POLICY "super_admins_manage_roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE POLICY "users_view_own_roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (user_id = auth.uid());