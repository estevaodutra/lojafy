-- 1. Redefinir a função do trigger para auto-calcular o estágio do produto com base nas regras de completude e atributos
CREATE OR REPLACE FUNCTION public.enforce_product_stage_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attr_count INTEGER := 0;
  v_ref_attrs JSONB;
BEGIN
  -- Contar número de atributos cadastrados
  IF NEW.attributes IS NOT NULL THEN
    IF jsonb_typeof(NEW.attributes) = 'array' THEN
      v_attr_count := jsonb_array_length(NEW.attributes);
    ELSIF jsonb_typeof(NEW.attributes) = 'object' THEN
      IF NEW.attributes ? 'ml_reference_attributes' THEN
        v_ref_attrs := NEW.attributes->'ml_reference_attributes';
        IF jsonb_typeof(v_ref_attrs) = 'array' THEN
          v_attr_count := jsonb_array_length(v_ref_attrs);
        END IF;
      END IF;
    END IF;
  END IF;

  -- Auto-promover ou demover estágio do produto (se não estiver bloqueado manualmente)
  IF NEW.stage IS DISTINCT FROM 'stage_2_blocked' THEN
    IF NEW.gtin_status IN ('confirmed', 'pending_confirmation', 'not_applicable')
       AND NEW.name IS NOT NULL AND NEW.name <> ''
       AND COALESCE(NEW.main_image_url, NEW.image_url) IS NOT NULL
       AND NEW.sku IS NOT NULL AND NEW.sku <> ''
       AND v_attr_count >= 2 THEN
      NEW.stage := 'stage_2_enabled';
    ELSE
      -- Se não cumpre os requisitos, decide o estágio com base na existência de dados de referência
      IF NEW.reference_item_id IS NOT NULL THEN
        NEW.stage := 'stage_2_requires_review';
      ELSE
        NEW.stage := 'stage_1_basic';
      END IF;
    END IF;
  END IF;

  -- Forçar inativo se o produto estiver em qualquer estágio que não seja habilitado
  IF NEW.stage IN ('stage_1_basic', 'stage_2_enriching', 'stage_2_requires_review', 'stage_2_blocked') THEN
    NEW.active := false;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Atualizar o RPC de importação de referência para exigir pelo menos 2 atributos para stage_2_enabled
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
  v_attr_count INTEGER := 0;
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

  -- Contar atributos que estão sendo importados
  IF jsonb_typeof(v_attrs) = 'array' THEN
    v_attr_count := jsonb_array_length(v_attrs);
  END IF;

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

  -- Determinar estágio exigindo pelo menos 2 atributos para stage_2_enabled
  IF v_new_gtin_status IN ('confirmed', 'pending_confirmation', 'not_applicable')
     AND COALESCE(v_candidate.title, v_product.name) IS NOT NULL
     AND COALESCE(v_product.main_image_url, v_product.image_url) IS NOT NULL 
     AND v_product.sku IS NOT NULL
     AND v_attr_count >= 2 THEN
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

  -- Registrar no log de auditoria
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

-- 3. Atualizar em massa todos os produtos existentes para recalcular o estágio
UPDATE public.products
SET stage = stage; -- Isso dispara o trigger BEFORE UPDATE que recalcula o estágio de todos os produtos
