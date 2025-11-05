-- 1. Criar tabela user_roles separada (melhor prática de segurança)
CREATE TABLE IF NOT EXISTS public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  granted_by UUID REFERENCES auth.users(id),
  UNIQUE (user_id, role)
);

-- 2. Migrar dados existentes de profiles para user_roles
INSERT INTO public.user_roles (user_id, role)
SELECT user_id, role FROM public.profiles
WHERE role IS NOT NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Habilitar RLS
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 4. Criar função SECURITY DEFINER para verificar roles (evita recursão em RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- 5. Criar função auxiliar para obter role do usuário
CREATE OR REPLACE FUNCTION public.get_user_role(_user_id UUID)
RETURNS app_role
LANGUAGE SQL
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role 
  FROM public.user_roles 
  WHERE user_id = _user_id 
  LIMIT 1
$$;

-- 6. Criar trigger para manter sincronização com profiles (para queries mais rápidas)
CREATE OR REPLACE FUNCTION public.sync_profile_role()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.profiles 
  SET role = NEW.role 
  WHERE user_id = NEW.user_id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER sync_role_to_profile
AFTER INSERT OR UPDATE ON public.user_roles
FOR EACH ROW
EXECUTE FUNCTION sync_profile_role();

-- 7. Políticas RLS para user_roles
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