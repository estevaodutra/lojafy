-- =============================================================================
-- Módulo Fornecedor P1 — Catálogo em dois estágios
--
-- Estágio 1 (básico): foto, título, descrição, dimensões, preço — produto
-- inativo, invisível na loja. Estágio 2 (enriquecido): dados importados de um
-- anúncio de referência do Mercado Livre + GTIN validado ⇒ habilitado.
--
-- Também remove o GTIN falso auto-gerado ('789'+aleatório, sem dígito
-- verificador) e substitui a geração de SKU concorrente (MAX()) por
-- sequência com row lock.
-- =============================================================================

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS stage TEXT CHECK (stage IN (
    'stage_1_basic', 'stage_2_enriching', 'stage_2_requires_review', 'stage_2_enabled', 'stage_2_blocked'
  )),
  ADD COLUMN IF NOT EXISTS gtin_status TEXT CHECK (gtin_status IN (
    'pending_confirmation', 'requires_review', 'legitimately_absent', 'required_missing', 'confirmed'
  )),
  ADD COLUMN IF NOT EXISTS gtin_source TEXT,
  ADD COLUMN IF NOT EXISTS sku_locked BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS original_stage1_data JSONB,
  ADD COLUMN IF NOT EXISTS reference_item_id TEXT,
  ADD COLUMN IF NOT EXISTS reference_imported_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_products_stage ON public.products(stage);

-- =============================================================================
-- Fim do GTIN falso: remover o trigger antigo (BEFORE INSERT OR UPDATE)
-- =============================================================================

DROP TRIGGER IF EXISTS auto_generate_product_codes_trigger ON public.products;

-- =============================================================================
-- SKU interno: LJF-{org_code|ADM}-{CAT|GEN}-{SEQ} com sequência por prefixo
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.supplier_sku_sequences (
  prefix TEXT NOT NULL PRIMARY KEY,
  organization_id UUID REFERENCES public.supplier_organizations(id) ON DELETE CASCADE,
  last_seq INTEGER NOT NULL DEFAULT 0
);
ALTER TABLE public.supplier_sku_sequences ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Service role manages sku sequences"
  ON public.supplier_sku_sequences FOR ALL
  TO service_role
  USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.next_internal_sku(p_org_id UUID, p_category_name TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_org_code TEXT;
  v_cat TEXT;
  v_prefix TEXT;
  v_seq INTEGER;
BEGIN
  SELECT org_code INTO v_org_code FROM public.supplier_organizations WHERE id = p_org_id;
  v_org_code := COALESCE(v_org_code, 'ADM');

  v_cat := COALESCE(
    NULLIF(upper(left(regexp_replace(COALESCE(p_category_name, ''), '[^a-zA-Z]', '', 'g'), 3)), ''),
    'GEN'
  );

  v_prefix := 'LJF-' || v_org_code || '-' || v_cat;

  INSERT INTO public.supplier_sku_sequences (prefix, organization_id, last_seq)
  VALUES (v_prefix, p_org_id, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_seq = supplier_sku_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || '-' || lpad(v_seq::text, 5, '0');
END;
$$;

CREATE OR REPLACE FUNCTION public.auto_generate_internal_sku()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_category_name TEXT;
BEGIN
  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    SELECT name INTO v_category_name FROM public.categories WHERE id = NEW.category_id;
    NEW.sku := public.next_internal_sku(NEW.supplier_organization_id, v_category_name);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS auto_generate_internal_sku_trigger ON public.products;
CREATE TRIGGER auto_generate_internal_sku_trigger
  BEFORE INSERT ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_internal_sku();

-- Lock de SKU após movimentação de estoque
CREATE OR REPLACE FUNCTION public.enforce_sku_lock()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.sku_locked AND NEW.sku IS DISTINCT FROM OLD.sku THEN
    RAISE EXCEPTION 'SKU não pode ser alterado após movimentações de estoque';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_sku_lock_trigger ON public.products;
CREATE TRIGGER enforce_sku_lock_trigger
  BEFORE UPDATE OF sku ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_sku_lock();

-- =============================================================================
-- GTIN: validação real de dígito verificador (GTIN-8/12/13/14, mod-10)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.validate_gtin_check_digit(p_gtin TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_len INTEGER;
  v_sum INTEGER := 0;
  v_digit INTEGER;
  v_weight INTEGER;
  i INTEGER;
BEGIN
  IF p_gtin IS NULL OR p_gtin !~ '^[0-9]+$' THEN
    RETURN false;
  END IF;

  v_len := length(p_gtin);
  IF v_len NOT IN (8, 12, 13, 14) THEN
    RETURN false;
  END IF;

  -- pesos alternados 3/1 da direita para a esquerda, ignorando o dígito verificador
  FOR i IN 1..(v_len - 1) LOOP
    v_digit := substr(p_gtin, v_len - i, 1)::int;
    v_weight := CASE WHEN i % 2 = 1 THEN 3 ELSE 1 END;
    v_sum := v_sum + v_digit * v_weight;
  END LOOP;

  RETURN ((10 - (v_sum % 10)) % 10) = substr(p_gtin, v_len, 1)::int;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_product_gtin()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.gtin_ean13 IS NOT NULL AND NEW.gtin_ean13 <> ''
     AND (TG_OP = 'INSERT' OR NEW.gtin_ean13 IS DISTINCT FROM OLD.gtin_ean13) THEN
    IF NOT public.validate_gtin_check_digit(NEW.gtin_ean13) THEN
      RAISE EXCEPTION 'GTIN inválido (dígito verificador incorreto): %', NEW.gtin_ean13;
    END IF;

    IF EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.gtin_ean13 = NEW.gtin_ean13 AND p.id IS DISTINCT FROM NEW.id
    ) THEN
      NEW.gtin_status := 'requires_review';
    ELSIF NEW.gtin_status IS NULL OR NEW.gtin_status IN ('legitimately_absent', 'required_missing') THEN
      NEW.gtin_status := 'pending_confirmation';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS validate_product_gtin_trigger ON public.products;
CREATE TRIGGER validate_product_gtin_trigger
  BEFORE INSERT OR UPDATE OF gtin_ean13 ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_product_gtin();

-- =============================================================================
-- Guarda de estágio: produto no Estágio 1 nunca fica ativo na loja
-- =============================================================================

CREATE OR REPLACE FUNCTION public.enforce_product_stage_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.stage IN ('stage_1_basic', 'stage_2_enriching', 'stage_2_requires_review', 'stage_2_blocked') THEN
    NEW.active := false;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_product_stage_guard_trigger ON public.products;
CREATE TRIGGER enforce_product_stage_guard_trigger
  BEFORE INSERT OR UPDATE ON public.products
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_product_stage_guard();

-- =============================================================================
-- Candidatos e imports de referência (Mercado Livre)
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.product_reference_candidates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ml_item_id TEXT NOT NULL,
  title TEXT,
  price NUMERIC,
  image_url TEXT,
  ml_category_id TEXT,
  brand TEXT,
  model TEXT,
  attribute_count INTEGER,
  has_gtin BOOLEAN,
  compatibility_score NUMERIC,
  search_query TEXT,
  raw_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (product_id, ml_item_id)
);
CREATE INDEX IF NOT EXISTS idx_product_reference_candidates_product
  ON public.product_reference_candidates(product_id, compatibility_score DESC);

CREATE TABLE IF NOT EXISTS public.product_reference_imports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  candidate_id UUID REFERENCES public.product_reference_candidates(id) ON DELETE SET NULL,
  ml_item_id TEXT,
  imported_fields JSONB,
  snapshot_before JSONB,
  snapshot_after JSONB,
  imported_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_product_reference_imports_product
  ON public.product_reference_imports(product_id, created_at DESC);

ALTER TABLE public.product_reference_candidates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_reference_imports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage reference candidates"
  ON public.product_reference_candidates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.supplier_id = auth.uid() OR public.is_admin_user())
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.supplier_id = auth.uid() OR public.is_admin_user())
    )
  );

CREATE POLICY "Owners view reference imports"
  ON public.product_reference_imports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.products p
      WHERE p.id = product_id AND (p.supplier_id = auth.uid() OR public.is_admin_user())
    )
  );

CREATE POLICY "Service role manages reference data"
  ON public.product_reference_candidates FOR ALL
  TO service_role USING (true) WITH CHECK (true);
CREATE POLICY "Service role manages reference imports"
  ON public.product_reference_imports FOR ALL
  TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- Import transacional de dados de referência
-- Aplica só o que veio de candidato persistido; falha externa (rede/ML) nunca
-- corrompe o Estágio 1. Foto, dimensões e preço são preservados por padrão
-- (p_overrides: {"apply_image": bool, "apply_price": bool, "category_id": uuid}).
-- =============================================================================

CREATE OR REPLACE FUNCTION public.import_reference_data(
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
BEGIN
  SELECT * INTO v_product FROM public.products WHERE id = p_product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  IF NOT (v_product.supplier_id = auth.uid() OR public.is_admin_user() OR auth.uid() IS NULL) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para este produto');
  END IF;

  SELECT * INTO v_candidate
  FROM public.product_reference_candidates
  WHERE id = p_candidate_id AND product_id = p_product_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Candidato de referência não encontrado');
  END IF;

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

  -- originais do Estágio 1 gravados apenas na primeira importação
  IF v_product.original_stage1_data IS NULL THEN
    UPDATE public.products
    SET original_stage1_data = v_snapshot_before
    WHERE id = p_product_id;
  END IF;

  -- título/descrição otimizados a partir da referência
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

  IF v_gtin IS NOT NULL AND NOT public.validate_gtin_check_digit(v_gtin) THEN
    v_gtin := NULL;
  END IF;

  IF v_gtin IS NOT NULL AND (v_product.gtin_ean13 IS NULL OR v_product.gtin_ean13 = '') THEN
    v_new_gtin_status := 'pending_confirmation';
  ELSIF v_product.gtin_ean13 IS NOT NULL AND v_product.gtin_ean13 <> '' THEN
    v_new_gtin_status := COALESCE(v_product.gtin_status, 'pending_confirmation');
    v_gtin := NULL;
  ELSE
    v_new_gtin_status := 'legitimately_absent';
    v_gtin := NULL;
  END IF;

  -- completude decide o estágio final
  IF v_new_gtin_status IN ('pending_confirmation', 'confirmed', 'legitimately_absent')
     AND COALESCE(v_candidate.title, v_product.name) IS NOT NULL
     AND COALESCE(v_product.main_image_url, v_product.image_url) IS NOT NULL THEN
    v_new_stage := 'stage_2_enabled';
  ELSE
    v_new_stage := 'stage_2_requires_review';
  END IF;

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
    reference_imported_at = now()
  WHERE id = p_product_id;

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

-- Restauração: reaplica snapshot_before apenas nos campos de enriquecimento
CREATE OR REPLACE FUNCTION public.restore_reference_import(p_import_id UUID)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_import public.product_reference_imports%ROWTYPE;
  v_product public.products%ROWTYPE;
  v_snap JSONB;
BEGIN
  SELECT * INTO v_import FROM public.product_reference_imports WHERE id = p_import_id;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Import não encontrado');
  END IF;

  SELECT * INTO v_product FROM public.products WHERE id = v_import.product_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Produto não encontrado');
  END IF;

  IF NOT (v_product.supplier_id = auth.uid() OR public.is_admin_user() OR auth.uid() IS NULL) THEN
    RETURN json_build_object('success', false, 'error', 'Sem permissão para este produto');
  END IF;

  v_snap := v_import.snapshot_before;

  UPDATE public.products
  SET
    name = COALESCE(v_snap->>'name', name),
    description = v_snap->>'description',
    brand = v_snap->>'brand',
    attributes = v_snap->'attributes',
    specifications = v_snap->'specifications',
    gtin_ean13 = v_snap->>'gtin_ean13',
    gtin_status = v_snap->>'gtin_status',
    gtin_source = v_snap->>'gtin_source',
    category_id = (v_snap->>'category_id')::uuid,
    price = COALESCE((v_snap->>'price')::numeric, price),
    main_image_url = v_snap->>'main_image_url',
    stage = COALESCE(v_snap->>'stage', 'stage_1_basic'),
    reference_item_id = v_snap->>'reference_item_id',
    reference_imported_at = CASE WHEN v_snap->>'reference_item_id' IS NULL THEN NULL ELSE reference_imported_at END
  WHERE id = v_import.product_id;

  PERFORM public.log_supplier_audit(
    v_product.supplier_organization_id,
    'reference_restore',
    'product',
    v_import.product_id,
    NULL, NULL,
    jsonb_build_object('import_id', p_import_id)
  );

  RETURN json_build_object('success', true);
END;
$$;

-- =============================================================================
-- View da loja passa a excluir produtos não habilitados no fluxo de estágios
-- (NULL = legado/admin, tratado como habilitado)
-- =============================================================================

CREATE OR REPLACE VIEW public.store_products AS
SELECT
  p.id,
  p.name,
  p.description,
  p.price,
  p.original_price,
  p.category_id,
  p.subcategory_id,
  p.brand,
  p.sku,
  p.gtin_ean13,
  p.stock_quantity,
  p.min_stock_level,
  p.image_url,
  p.main_image_url,
  p.images,
  p.specifications,
  p.attributes,
  p.badge,
  p.rating,
  p.review_count,
  p.featured,
  p.active,
  p.condition,
  p.has_variations,
  p.variations,
  p.height,
  p.width,
  p.length,
  p.weight,
  p.permalink,
  p.created_at,
  p.updated_at
FROM public.products p
WHERE p.active = true
  AND (p.supplier_id IS NULL OR p.approval_status = 'approved')
  AND (p.stage IS NULL OR p.stage = 'stage_2_enabled');
