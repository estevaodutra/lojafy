-- =============================================================================
-- Módulo Fornecedor P0 — Organizações de fornecedor
-- Estrutura mínima (owner único) preparada para multi-membro.
-- products.supplier_id (user-id) continua canônico; supplier_organization_id
-- é sincronizado por trigger para não quebrar n8n/admin/carteira.
-- =============================================================================

-- 1. Organizações
CREATE TABLE IF NOT EXISTS public.supplier_organizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  owner_user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  org_code VARCHAR(4) NOT NULL UNIQUE,
  legal_name TEXT,
  trade_name TEXT,
  document TEXT,
  email TEXT,
  phone TEXT,
  logo_url TEXT,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Membros (owner único por ora; papéis prontos para P3)
CREATE TABLE IF NOT EXISTS public.supplier_members (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'owner' CHECK (role IN ('owner', 'manager', 'operator')),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_supplier_members_user ON public.supplier_members(user_id);

-- 3. Depósitos
CREATE TABLE IF NOT EXISTS public.supplier_locations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID NOT NULL REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  is_default BOOLEAN NOT NULL DEFAULT false,
  address JSONB,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_supplier_locations_default
  ON public.supplier_locations(organization_id) WHERE is_default;

-- 4. Configurações operacionais
CREATE TABLE IF NOT EXISTS public.supplier_settings (
  organization_id UUID NOT NULL PRIMARY KEY REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  picking_sla_hours INTEGER NOT NULL DEFAULT 24,
  shipping_sla_hours INTEGER NOT NULL DEFAULT 48,
  default_carrier TEXT,
  low_stock_threshold INTEGER NOT NULL DEFAULT 5,
  notifications JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 5. Auditoria (insert-only)
CREATE TABLE IF NOT EXISTS public.supplier_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id UUID REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  actor_user_id UUID,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  before JSONB,
  after JSONB,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_supplier_audit_logs_org_created
  ON public.supplier_audit_logs(organization_id, created_at DESC);
REVOKE UPDATE, DELETE ON public.supplier_audit_logs FROM anon, authenticated;

-- updated_at
CREATE TRIGGER update_supplier_organizations_updated_at BEFORE UPDATE ON public.supplier_organizations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_members_updated_at BEFORE UPDATE ON public.supplier_members
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_locations_updated_at BEFORE UPDATE ON public.supplier_locations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_supplier_settings_updated_at BEFORE UPDATE ON public.supplier_settings
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =============================================================================
-- Funções auxiliares
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_supplier_org_id(_user_id UUID)
RETURNS UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id
  FROM public.supplier_members
  WHERE user_id = _user_id AND active
  ORDER BY created_at
  LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION public.is_supplier_org_member(_org_id UUID, _user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.supplier_members
    WHERE organization_id = _org_id AND user_id = _user_id AND active
  );
$$;

CREATE OR REPLACE FUNCTION public.log_supplier_audit(
  p_organization_id UUID,
  p_action TEXT,
  p_entity_type TEXT,
  p_entity_id UUID,
  p_before JSONB DEFAULT NULL,
  p_after JSONB DEFAULT NULL,
  p_metadata JSONB DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO public.supplier_audit_logs (
    organization_id, actor_user_id, action, entity_type, entity_id, before, after, metadata
  ) VALUES (
    p_organization_id, auth.uid(), p_action, p_entity_type, p_entity_id, p_before, p_after, p_metadata
  ) RETURNING id INTO v_id;
  RETURN v_id;
END;
$$;

-- Geração de org_code único de 4 caracteres (A-Z, 0-9)
CREATE OR REPLACE FUNCTION public.generate_supplier_org_code()
RETURNS VARCHAR(4)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code VARCHAR(4);
  v_tries INTEGER := 0;
BEGIN
  LOOP
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 4));
    EXIT WHEN NOT EXISTS (SELECT 1 FROM public.supplier_organizations WHERE org_code = v_code);
    v_tries := v_tries + 1;
    IF v_tries > 50 THEN
      RAISE EXCEPTION 'Não foi possível gerar org_code único';
    END IF;
  END LOOP;
  RETURN v_code;
END;
$$;

-- =============================================================================
-- products.supplier_organization_id sincronizado a partir de supplier_id
-- =============================================================================

ALTER TABLE public.products ADD COLUMN IF NOT EXISTS supplier_organization_id UUID
  REFERENCES public.supplier_organizations(id);
CREATE INDEX IF NOT EXISTS idx_products_supplier_org ON public.products(supplier_organization_id);

CREATE OR REPLACE FUNCTION public.sync_product_supplier_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.supplier_id IS NOT NULL THEN
    NEW.supplier_organization_id := public.get_supplier_org_id(NEW.supplier_id);
  ELSE
    NEW.supplier_organization_id := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_product_supplier_org_trigger ON public.products;
CREATE TRIGGER sync_product_supplier_org_trigger
  BEFORE INSERT OR UPDATE OF supplier_id ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.sync_product_supplier_org();

-- =============================================================================
-- Provisionamento de org: usado pelo backfill e pelo trigger de novos suppliers
-- =============================================================================

CREATE OR REPLACE FUNCTION public.provision_supplier_organization(p_user_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_id UUID;
  v_profile RECORD;
  v_email TEXT;
BEGIN
  SELECT id INTO v_org_id FROM public.supplier_organizations WHERE owner_user_id = p_user_id;
  IF v_org_id IS NOT NULL THEN
    RETURN v_org_id;
  END IF;

  SELECT first_name, last_name, phone INTO v_profile
  FROM public.profiles WHERE user_id = p_user_id;

  SELECT email INTO v_email FROM auth.users WHERE id = p_user_id;

  INSERT INTO public.supplier_organizations (owner_user_id, org_code, trade_name, email, phone)
  VALUES (
    p_user_id,
    public.generate_supplier_org_code(),
    NULLIF(trim(concat_ws(' ', v_profile.first_name, v_profile.last_name)), ''),
    v_email,
    v_profile.phone
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.supplier_members (organization_id, user_id, role)
  VALUES (v_org_id, p_user_id, 'owner')
  ON CONFLICT (organization_id, user_id) DO NOTHING;

  INSERT INTO public.supplier_locations (organization_id, name, is_default)
  VALUES (v_org_id, 'Depósito principal', true);

  INSERT INTO public.supplier_settings (organization_id)
  VALUES (v_org_id)
  ON CONFLICT (organization_id) DO NOTHING;

  RETURN v_org_id;
END;
$$;

-- Novos suppliers (cadastrados após esta migration) ganham org automaticamente
CREATE OR REPLACE FUNCTION public.handle_supplier_profile_org()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role = 'supplier' THEN
    PERFORM public.provision_supplier_organization(NEW.user_id);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS provision_supplier_org_trigger ON public.profiles;
CREATE TRIGGER provision_supplier_org_trigger
  AFTER INSERT OR UPDATE OF role ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_supplier_profile_org();

-- =============================================================================
-- Backfill idempotente: 1 org por profile supplier + member owner + depósito + settings
-- =============================================================================

DO $$
DECLARE
  v_profile RECORD;
BEGIN
  FOR v_profile IN (
    SELECT p.user_id
    FROM public.profiles p
    WHERE p.role = 'supplier'
      AND NOT EXISTS (
        SELECT 1 FROM public.supplier_organizations o WHERE o.owner_user_id = p.user_id
      )
  ) LOOP
    PERFORM public.provision_supplier_organization(v_profile.user_id);
  END LOOP;

  UPDATE public.products pr
  SET supplier_organization_id = public.get_supplier_org_id(pr.supplier_id)
  WHERE pr.supplier_id IS NOT NULL
    AND pr.supplier_organization_id IS DISTINCT FROM public.get_supplier_org_id(pr.supplier_id);
END;
$$;

-- =============================================================================
-- RLS
-- =============================================================================

ALTER TABLE public.supplier_organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_locations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.supplier_audit_logs ENABLE ROW LEVEL SECURITY;

-- Organizações
CREATE POLICY "Members can view own organization"
  ON public.supplier_organizations FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Owner can update own organization"
  ON public.supplier_organizations FOR UPDATE
  TO authenticated
  USING (owner_user_id = auth.uid() OR public.is_admin_user())
  WITH CHECK (owner_user_id = auth.uid() OR public.is_admin_user());

CREATE POLICY "Admins can manage organizations"
  ON public.supplier_organizations FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Service role manages organizations"
  ON public.supplier_organizations FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Membros
CREATE POLICY "Members can view own org members"
  ON public.supplier_members FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Admins can manage members"
  ON public.supplier_members FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Service role manages members"
  ON public.supplier_members FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

-- Depósitos
CREATE POLICY "Members can view own locations"
  ON public.supplier_locations FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Owner can manage own locations"
  ON public.supplier_locations FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_organizations o
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    ) OR public.is_admin_user()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_organizations o
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    ) OR public.is_admin_user()
  );

-- Settings
CREATE POLICY "Members can view own settings"
  ON public.supplier_settings FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Owner can manage own settings"
  ON public.supplier_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.supplier_organizations o
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    ) OR public.is_admin_user()
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.supplier_organizations o
      WHERE o.id = organization_id AND o.owner_user_id = auth.uid()
    ) OR public.is_admin_user()
  );

-- Auditoria: membros leem a própria org; escrita só via log_supplier_audit (definer)
CREATE POLICY "Members can view own audit logs"
  ON public.supplier_audit_logs FOR SELECT
  TO authenticated
  USING (public.is_supplier_org_member(organization_id, auth.uid()) OR public.is_admin_user());

CREATE POLICY "Service role manages audit logs"
  ON public.supplier_audit_logs FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);
