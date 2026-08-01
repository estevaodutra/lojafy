-- 20260801104500_supplier_settings_pricing_estoque.sql
-- Módulo Fornecedor P1/P2: Precificação, SKU Automático, Validação de GTIN e Importação Transacional

-- =============================================================================
-- 1. Alterações na tabela supplier_settings
-- =============================================================================
ALTER TABLE public.supplier_settings
  ADD COLUMN IF NOT EXISTS default_profit_margin_percentage NUMERIC(5,2) NOT NULL DEFAULT 20.00,
  ADD COLUMN IF NOT EXISTS default_min_stock_level INTEGER NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS auto_pricing_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS pricing_mode TEXT NOT NULL DEFAULT 'markup',
  ADD COLUMN IF NOT EXISTS price_rounding_strategy TEXT NOT NULL DEFAULT '90',
  ADD COLUMN IF NOT EXISTS allow_product_margin_override BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS low_stock_alert_enabled BOOLEAN NOT NULL DEFAULT TRUE;

-- =============================================================================
-- 2. Alterações na tabela categories
-- =============================================================================
ALTER TABLE public.categories
  ADD COLUMN IF NOT EXISTS gtin_required BOOLEAN NOT NULL DEFAULT TRUE;

-- =============================================================================
-- 3. Alterações na tabela products
-- =============================================================================
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS use_default_profit_margin BOOLEAN NOT NULL DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS custom_profit_margin_percentage NUMERIC(5,2),
  ADD COLUMN IF NOT EXISTS calculated_price NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS estimated_net_profit NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS pricing_calculation_snapshot JSONB,
  ADD COLUMN IF NOT EXISTS ml_category_id TEXT,
  ADD COLUMN IF NOT EXISTS ml_domain_id TEXT,
  ADD COLUMN IF NOT EXISTS internal_category_id UUID REFERENCES public.categories(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS selected_reference_candidate_id UUID;

-- Limpar SKUs duplicados ou vazios antes de adicionar constraint de unicidade (caso existam)
UPDATE public.products SET sku = 'LJF-TEMP-' || id::text WHERE sku IS NULL OR sku = '' OR sku IN (
  SELECT sku FROM public.products GROUP BY sku HAVING count(*) > 1
);

-- Constraint UNIQUE (supplier_organization_id, sku) na tabela products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_supplier_organization_id_sku_key;
ALTER TABLE public.products ADD CONSTRAINT products_supplier_organization_id_sku_key UNIQUE (supplier_organization_id, sku);

-- =============================================================================
-- 4. Alterações na tabela product_variants
-- =============================================================================
ALTER TABLE public.product_variants
  ADD COLUMN IF NOT EXISTS sku TEXT;

-- Garantir unicidade global de SKU de variantes
ALTER TABLE public.product_variants DROP CONSTRAINT IF EXISTS product_variants_sku_key;
ALTER TABLE public.product_variants ADD CONSTRAINT product_variants_sku_key UNIQUE (sku);

-- =============================================================================
-- 5. Alterações na tabela product_reference_candidates
-- =============================================================================
ALTER TABLE public.product_reference_candidates
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'selected', 'discarded', 'expired')),
  ADD COLUMN IF NOT EXISTS selected_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS selected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Relacionar selected_reference_candidate_id na tabela products
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS fk_products_selected_reference;
ALTER TABLE public.products ADD CONSTRAINT fk_products_selected_reference 
  FOREIGN KEY (selected_reference_candidate_id) REFERENCES public.product_reference_candidates(id) ON DELETE SET NULL;

-- =============================================================================
-- 6. Ajuste das Constraints CHECK de stage e gtin_status em products
-- =============================================================================
ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_stage_check;
ALTER TABLE public.products ADD CONSTRAINT products_stage_check CHECK (stage IN (
  'stage_1_basic', 'stage_1_searching_references', 'stage_1_reference_available', 
  'stage_1_reference_selected', 'stage_2_enriching', 'stage_2_requires_review', 
  'stage_2_enabled', 'stage_2_blocked'
));

ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_gtin_status_check;
ALTER TABLE public.products ADD CONSTRAINT products_gtin_status_check CHECK (gtin_status IN (
  'confirmed', 'pending_confirmation', 'not_found', 'not_applicable', 'required_missing', 'invalid'
));

-- =============================================================================
-- 7. Autogeração de SKU Simplificado para Fornecedor
-- =============================================================================
CREATE OR REPLACE FUNCTION public.next_internal_sku(p_org_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_code TEXT;
  v_seq INTEGER;
  v_prefix TEXT;
BEGIN
  SELECT org_code INTO v_org_code FROM public.supplier_organizations WHERE id = p_org_id;
  v_org_code := COALESCE(v_org_code, 'ADM');
  v_prefix := 'LJF-' || v_org_code;

  INSERT INTO public.supplier_sku_sequences (prefix, organization_id, last_seq)
  VALUES (v_prefix, p_org_id, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_seq = supplier_sku_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || '-' || lpad(v_seq::text, 6, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_internal_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    NEW.sku := public.next_internal_sku(NEW.supplier_organization_id);
  END IF;
  RETURN NEW;
END;
$$;

-- Lock de SKU após uso operacional (venda ou alteração manual proibida)
CREATE OR REPLACE FUNCTION public.enforce_sku_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sku_locked AND NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'SKU não pode ser alterado após movimentações de estoque ou uso operacional';
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 8. Geração e Autogeração de SKU para Variantes
-- =============================================================================
CREATE OR REPLACE FUNCTION public.generate_variant_sku_suffix(p_value TEXT)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  v_clean TEXT;
  v_suffix TEXT;
BEGIN
  v_clean := upper(regexp_replace(translate(p_value, 'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ', 'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC'), '[^a-zA-Z0-9]', '', 'g'));
  IF length(v_clean) >= 2 THEN
    v_suffix := left(v_clean, 2);
  ELSE
    v_suffix := COALESCE(v_clean, 'VAR');
  END IF;
  RETURN v_suffix;
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_variant_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_parent_sku TEXT;
  v_suffix TEXT;
  v_final_sku TEXT;
  v_counter INTEGER := 0;
BEGIN
  SELECT sku INTO v_parent_sku FROM public.products WHERE id = NEW.product_id;
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    v_suffix := public.generate_variant_sku_suffix(NEW.value);
    v_final_sku := v_parent_sku || '-' || v_suffix;
    
    WHILE EXISTS (SELECT 1 FROM public.product_variants WHERE sku = v_final_sku AND id IS DISTINCT FROM NEW.id) LOOP
      v_counter := v_counter + 1;
      v_final_sku := v_parent_sku || '-' || v_suffix || v_counter;
    END LOOP;
    
    NEW.sku := v_final_sku;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_variant_sku_trigger ON public.product_variants;
CREATE TRIGGER auto_generate_variant_sku_trigger
  BEFORE INSERT ON public.product_variants
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_variant_sku();

-- =============================================================================
-- 9. Validador de GTIN real (Módulo 10 com novos estados)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.validate_product_gtin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_gtin_required BOOLEAN := true;
BEGIN
  IF NEW.gtin_ean13 IS NOT NULL AND NEW.gtin_ean13 <> ''
     AND (TG_OP = 'INSERT' OR NEW.gtin_ean13 IS DISTINCT FROM OLD.gtin_ean13) THEN
    IF NOT public.validate_gtin_check_digit(NEW.gtin_ean13) THEN
      NEW.gtin_status := 'invalid';
    ELSE
      -- GTIN formatado correto é salvo como pending_confirmation
      NEW.gtin_status := 'pending_confirmation';
    END IF;
  ELSIF NEW.gtin_ean13 IS NULL OR NEW.gtin_ean13 = '' THEN
    -- GTIN ausente: verificar regra da categoria
    IF NEW.category_id IS NOT NULL THEN
      SELECT COALESCE(gtin_required, true) INTO v_gtin_required FROM public.categories WHERE id = NEW.category_id;
    END IF;
    
    IF v_gtin_required THEN
      NEW.gtin_status := 'required_missing';
    ELSE
      NEW.gtin_status := 'not_applicable';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- =============================================================================
-- 10. RPC de Importação Transacional import_reference_data_v2
-- =============================================================================
CREATE OR REPLACE FUNCTION public.import_reference_data_v2(
  p_product_id UUID,
  p_candidate_id UUID,
  p_overrides JSONB DEFAULT '{}'::jsonb
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_product public.products%ROWTYPE;
  v_candidate public.product_reference_candidates%ROWTYPE;
  v_snapshot_before JSONB;
  v_imported JSONB := '{}'::jsonb;
  v_gtin TEXT;
  v_new_stage TEXT;
  v_new_gtin_status TEXT;
  v_import_id UUID;
  v_attrs JSONB;
  v_gtin_required BOOLEAN := true;
BEGIN
  -- Obter produto com row lock
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  -- Checar permissões
  IF NOT (v_product.supplier_id = auth.uid() OR public.is_admin_user() OR auth.uid() IS NULL) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para este produto');
  END IF;

  -- Obter candidato
  SELECT * INTO v_candidate
  FROM public.product_reference_candidates
  WHERE id = p_candidate_id AND product_id = p_product_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Candidato de referência não encontrado');
  END IF;

  -- Tirar snapshot antes
  v_snapshot_before := jsonb_build_object(
    'name', v_product.name,
    'description', v_product.description,
    'brand', v_product.brand,
    'attributes', v_product.attributes,
    'specifications', v_product.specifications,
    'gtin_ean13', v_product.gtin_ean13,
    'gtin_status', v_product.gtin_status,
    'gtin_source', v_product.gtin_source,
    'category_id', v_product.category_id,
    'price', v_product.price,
    'image_url', v_product.image_url,
    'main_image_url', v_product.main_image_url,
    'stage', v_product.stage,
    'reference_item_id', v_product.reference_item_id
  );

  -- Salvar original do Estágio 1 se for a primeira importação
  IF v_product.original_stage1_data IS NULL THEN
    UPDATE public.products
    SET original_stage1_data = v_snapshot_before
    WHERE id = p_product_id;
  END IF;

  -- Rastrear campos importados
  IF v_candidate.title IS NOT NULL AND v_candidate.title <> '' THEN
    v_imported := v_imported || jsonb_build_object('name',
      jsonb_build_object('old', v_product.name, 'new', v_candidate.title, 'source', 'ml_reference'));
  END IF;
  IF v_candidate.brand IS NOT NULL THEN
    v_imported := v_imported || jsonb_build_object('brand',
      jsonb_build_object('old', v_product.brand, 'new', v_candidate.brand, 'source', 'ml_reference'));
  END IF;

  v_attrs := COALESCE(v_candidate.raw_data->'attributes', '[]'::jsonb);
  v_gtin := v_candidate.raw_data->>'gtin';

  -- Validar GTIN
  IF v_gtin IS NOT NULL AND NOT public.validate_gtin_check_digit(v_gtin) THEN
    v_new_gtin_status := 'invalid';
  ELSIF v_gtin IS NOT NULL THEN
    v_new_gtin_status := 'pending_confirmation';
  ELSE
    -- Sem GTIN: verificar categoria
    IF v_product.category_id IS NOT NULL THEN
      SELECT COALESCE(gtin_required, true) INTO v_gtin_required FROM public.categories WHERE id = v_product.category_id;
    END IF;
    IF v_gtin_required THEN
      v_new_gtin_status := 'required_missing';
    ELSE
      v_new_gtin_status := 'not_applicable';
    END IF;
    v_gtin := NULL;
  END IF;

  -- Determinar estágio
  IF v_new_gtin_status IN ('confirmed', 'pending_confirmation', 'not_applicable')
     AND COALESCE(v_candidate.title, v_product.name) IS NOT NULL
     AND COALESCE(v_product.main_image_url, v_product.image_url) IS NOT NULL 
     AND v_product.sku IS NOT NULL THEN
    v_new_stage := 'stage_2_enabled';
  ELSE
    v_new_stage := 'stage_2_requires_review';
  END IF;

  -- 1. Atualizar produto enriquecido
  UPDATE public.products
  SET
    name = COALESCE(NULLIF(v_candidate.title, ''), name),
    brand = COALESCE(v_candidate.brand, brand),
    attributes = CASE
      WHEN jsonb_typeof(v_attrs) = 'array' AND jsonb_array_length(v_attrs) > 0
        THEN jsonb_build_object('ml_reference_attributes', v_attrs,
                                'ml_category_id', v_candidate.ml_category_id,
                                'model', v_candidate.model)
      ELSE attributes
    END,
    specifications = COALESCE(v_candidate.raw_data->'specifications', specifications),
    description = COALESCE(NULLIF(v_candidate.raw_data->>'description', ''), description),
    category_id = COALESCE((p_overrides->>'category_id')::uuid, category_id),
    price = CASE WHEN COALESCE((p_overrides->>'apply_price')::boolean, false)
                 THEN COALESCE(v_candidate.price, price) ELSE price END,
    main_image_url = CASE WHEN COALESCE((p_overrides->>'apply_image')::boolean, false)
                           THEN COALESCE(v_candidate.image_url, main_image_url) ELSE main_image_url END,
    gtin_ean13 = COALESCE(v_gtin, gtin_ean13),
    gtin_status = v_new_gtin_status,
    gtin_source = CASE WHEN v_gtin IS NOT NULL THEN 'ml_reference' ELSE gtin_source END,
    stage = v_new_stage,
    reference_item_id = v_candidate.ml_item_id,
    selected_reference_candidate_id = p_candidate_id,
    reference_imported_at = now()
  WHERE id = p_product_id;

  -- 2. Atualizar status dos candidatos
  -- O escolhido vira selected
  UPDATE public.product_reference_candidates
  SET 
    status = 'selected',
    selected_at = now(),
    selected_by = auth.uid()
  WHERE id = p_candidate_id;

  -- Os outros viram discarded
  UPDATE public.product_reference_candidates
  SET status = 'discarded'
  WHERE product_id = p_product_id AND id IS DISTINCT FROM p_candidate_id;

  -- 3. Salvar histórico de importação
  INSERT INTO public.product_reference_imports (
    product_id, candidate_id, ml_item_id, imported_fields, snapshot_before, snapshot_after, imported_by
  )
  SELECT p_product_id, p_candidate_id, v_candidate.ml_item_id, v_imported, v_snapshot_before,
    jsonb_build_object(
      'name', p.name, 'description', p.description, 'brand', p.brand,
      'attributes', p.attributes, 'specifications', p.specifications,
      'gtin_ean13', p.gtin_ean13, 'gtin_status', p.gtin_status, 'gtin_source', p.gtin_source,
      'category_id', p.category_id, 'price', p.price,
      'image_url', p.image_url, 'main_image_url', p.main_image_url,
      'stage', p.stage, 'reference_item_id', p.reference_item_id
    ), auth.uid()
  FROM public.products p WHERE p.id = p_product_id
  RETURNING id INTO v_import_id;

  -- 4. Registrar auditoria
  PERFORM public.log_supplier_audit(
    v_product.supplier_organization_id,
    'reference_import',
    'product',
    p_product_id,
    v_snapshot_before,
    NULL,
    jsonb_build_object('ml_item_id', v_candidate.ml_item_id, 'import_id', v_import_id)
  );

  RETURN json_build_object('success', true, 'import_id', v_import_id, 'stage', v_new_stage);
END;
$$;
