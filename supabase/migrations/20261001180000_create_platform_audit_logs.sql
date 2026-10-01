-- =============================================================================
-- Migration: 20261001180000_create_platform_audit_logs.sql
-- Criação da tabela de logs de auditoria/edição da plataforma e trigger em produtos
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.platform_audit_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  entity_type TEXT NOT NULL DEFAULT 'product',
  entity_id UUID,
  entity_name TEXT,
  action_type TEXT NOT NULL,
  action_label TEXT NOT NULL,
  actor_id UUID,
  actor_name TEXT,
  actor_email TEXT,
  actor_role TEXT,
  changes JSONB NOT NULL DEFAULT '[]'::jsonb,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Índices para buscas rápidas e ordenação cronológica
CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_created_at
  ON public.platform_audit_logs(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_entity
  ON public.platform_audit_logs(entity_type, entity_id);

CREATE INDEX IF NOT EXISTS idx_platform_audit_logs_action_type
  ON public.platform_audit_logs(action_type);

-- RLS
ALTER TABLE public.platform_audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view platform audit logs" ON public.platform_audit_logs;
CREATE POLICY "Admins can view platform audit logs"
  ON public.platform_audit_logs
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
  );

DROP POLICY IF EXISTS "Authenticated can insert platform audit logs" ON public.platform_audit_logs;
CREATE POLICY "Authenticated can insert platform audit logs"
  ON public.platform_audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Imutabilidade dos logs: ninguém pode alterar ou excluir logs
REVOKE UPDATE, DELETE ON public.platform_audit_logs FROM anon, authenticated;

-- =============================================================================
-- Função Trigger para auditoria automática de produtos
-- =============================================================================
CREATE OR REPLACE FUNCTION public.fn_audit_products_changes()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth
AS $$
DECLARE
  v_actor_id UUID;
  v_actor_name TEXT;
  v_actor_email TEXT;
  v_actor_role TEXT;
  v_changes JSONB := '[]'::jsonb;
  v_action_type TEXT;
  v_action_label TEXT;
  v_entity_name TEXT;
  v_entity_id UUID;
BEGIN
  v_actor_id := auth.uid();

  -- Buscar dados do usuário executor
  IF v_actor_id IS NOT NULL THEN
    SELECT 
      COALESCE(NULLIF(TRIM(CONCAT(COALESCE(p.first_name, ''), ' ', COALESCE(p.last_name, ''))), ''), u.email, 'Usuário') AS full_name,
      u.email,
      p.role::text
    INTO v_actor_name, v_actor_email, v_actor_role
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
    WHERE u.id = v_actor_id;
  END IF;

  IF v_actor_name IS NULL OR v_actor_name = '' THEN
    v_actor_name := 'Sistema / Integração';
  END IF;

  -- OPERAÇÃO: INSERT (Novo produto cadastrado)
  IF TG_OP = 'INSERT' THEN
    v_entity_id := NEW.id;
    v_entity_name := NEW.name;
    v_action_type := 'product_create';
    v_action_label := 'Produto Cadastrado';

    v_changes := jsonb_build_array(
      jsonb_build_object('field', 'name', 'label', 'Nome', 'before', null, 'after', to_jsonb(NEW.name)),
      jsonb_build_object('field', 'status', 'label', 'Status', 'before', null, 'after', to_jsonb(CASE WHEN NEW.active THEN 'Ativo' ELSE 'Inativo' END)),
      jsonb_build_object('field', 'stock_quantity', 'label', 'Estoque Inicial', 'before', null, 'after', to_jsonb(COALESCE(NEW.stock_quantity, 0))),
      jsonb_build_object('field', 'price', 'label', 'Preço Inicial', 'before', null, 'after', to_jsonb(NEW.price))
    );

    INSERT INTO public.platform_audit_logs (
      entity_type,
      entity_id,
      entity_name,
      action_type,
      action_label,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      changes
    ) VALUES (
      'product',
      v_entity_id,
      v_entity_name,
      v_action_type,
      v_action_label,
      v_actor_id,
      v_actor_name,
      v_actor_email,
      v_actor_role,
      v_changes
    );

    RETURN NEW;
  END IF;

  -- OPERAÇÃO: DELETE (Produto removido)
  IF TG_OP = 'DELETE' THEN
    v_entity_id := OLD.id;
    v_entity_name := OLD.name;
    v_action_type := 'product_delete';
    v_action_label := 'Produto Removido';

    v_changes := jsonb_build_array(
      jsonb_build_object('field', 'name', 'label', 'Nome', 'before', to_jsonb(OLD.name), 'after', null),
      jsonb_build_object('field', 'sku', 'label', 'SKU', 'before', to_jsonb(OLD.sku), 'after', null)
    );

    INSERT INTO public.platform_audit_logs (
      entity_type,
      entity_id,
      entity_name,
      action_type,
      action_label,
      actor_id,
      actor_name,
      actor_email,
      actor_role,
      changes
    ) VALUES (
      'product',
      v_entity_id,
      v_entity_name,
      v_action_type,
      v_action_label,
      v_actor_id,
      v_actor_name,
      v_actor_email,
      v_actor_role,
      v_changes
    );

    RETURN OLD;
  END IF;

  -- OPERAÇÃO: UPDATE (Alteração de campos do produto)
  IF TG_OP = 'UPDATE' THEN
    v_entity_id := NEW.id;
    v_entity_name := NEW.name;

    -- 1. Status ativo/inativo
    IF OLD.active IS DISTINCT FROM NEW.active THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'active',
        'label', 'Status',
        'before', to_jsonb(CASE WHEN OLD.active THEN 'Ativo' ELSE 'Inativo' END),
        'after', to_jsonb(CASE WHEN NEW.active THEN 'Ativo' ELSE 'Inativo' END)
      );
      IF NEW.active THEN
        v_action_type := 'status_change';
        v_action_label := 'Produto Ativado';
      ELSE
        v_action_type := 'status_change';
        v_action_label := 'Produto Desativado';
      END IF;
    END IF;

    -- 2. Estoque
    IF OLD.stock_quantity IS DISTINCT FROM NEW.stock_quantity THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'stock_quantity',
        'label', 'Estoque',
        'before', to_jsonb(OLD.stock_quantity),
        'after', to_jsonb(NEW.stock_quantity)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'stock_change';
        IF COALESCE(NEW.stock_quantity, 0) < COALESCE(OLD.stock_quantity, 0) THEN
          v_action_label := 'Remoção / Saída de Estoque';
        ELSE
          v_action_label := 'Entrada / Adição de Estoque';
        END IF;
      END IF;
    END IF;

    -- 3. Preço de venda
    IF OLD.price IS DISTINCT FROM NEW.price THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'price',
        'label', 'Preço de Venda',
        'before', to_jsonb(OLD.price),
        'after', to_jsonb(NEW.price)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'price_change';
        v_action_label := 'Alteração de Preço';
      END IF;
    END IF;

    -- 4. Preço de Custo / Custo Fornecedor
    IF OLD.cost_price IS DISTINCT FROM NEW.cost_price THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'cost_price',
        'label', 'Preço de Custo',
        'before', to_jsonb(OLD.cost_price),
        'after', to_jsonb(NEW.cost_price)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'cost_change';
        v_action_label := 'Alteração de Custo';
      END IF;
    END IF;

    IF OLD.supplier_cost_price IS DISTINCT FROM NEW.supplier_cost_price THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'supplier_cost_price',
        'label', 'Custo Fornecedor',
        'before', to_jsonb(OLD.supplier_cost_price),
        'after', to_jsonb(NEW.supplier_cost_price)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'cost_change';
        v_action_label := 'Alteração de Custo Fornecedor';
      END IF;
    END IF;

    -- 5. Nome do Produto
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'name',
        'label', 'Nome do Produto',
        'before', to_jsonb(OLD.name),
        'after', to_jsonb(NEW.name)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'product_update';
        v_action_label := 'Alteração de Nome';
      END IF;
    END IF;

    -- 6. SKU
    IF OLD.sku IS DISTINCT FROM NEW.sku THEN
      v_changes := v_changes || jsonb_build_object(
        'field', 'sku',
        'label', 'SKU',
        'before', to_jsonb(OLD.sku),
        'after', to_jsonb(NEW.sku)
      );
      IF v_action_type IS NULL THEN
        v_action_type := 'product_update';
        v_action_label := 'Alteração de SKU';
      END IF;
    END IF;

    -- Se houve alguma das alterações monitoradas acima, salva o log
    IF jsonb_array_length(v_changes) > 0 THEN
      IF v_action_type IS NULL THEN
        v_action_type := 'product_update';
        v_action_label := 'Edição de Produto';
      END IF;

      INSERT INTO public.platform_audit_logs (
        entity_type,
        entity_id,
        entity_name,
        action_type,
        action_label,
        actor_id,
        actor_name,
        actor_email,
        actor_role,
        changes
      ) VALUES (
        'product',
        v_entity_id,
        v_entity_name,
        v_action_type,
        v_action_label,
        v_actor_id,
        v_actor_name,
        v_actor_email,
        v_actor_role,
        v_changes
      );
    END IF;

    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$;

-- Criar o trigger na tabela products
DROP TRIGGER IF EXISTS trg_audit_products_changes ON public.products;
CREATE TRIGGER trg_audit_products_changes
  AFTER INSERT OR UPDATE OR DELETE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_audit_products_changes();
