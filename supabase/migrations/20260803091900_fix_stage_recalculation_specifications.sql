-- 1. Redefinir a função do trigger para contar também especificações manuais (specifications) e Marca (brand) como atributos
CREATE OR REPLACE FUNCTION public.enforce_product_stage_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_attr_count INTEGER := 0;
  v_spec_count INTEGER := 0;
  v_ref_attrs JSONB;
BEGIN
  -- 1. Contar atributos importados
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

  -- 2. Contar especificações manuais (chaves não vazias)
  IF NEW.specifications IS NOT NULL AND jsonb_typeof(NEW.specifications) = 'object' THEN
    SELECT count(*) INTO v_spec_count
    FROM jsonb_each_text(NEW.specifications)
    WHERE value IS NOT NULL AND value <> '';
  END IF;

  -- 3. Contar Marca (brand) como um atributo
  IF NEW.brand IS NOT NULL AND NEW.brand <> '' THEN
    v_spec_count := v_spec_count + 1;
  END IF;

  -- Auto-promover ou demover estágio do produto (se não estiver bloqueado manualmente)
  IF NEW.stage IS DISTINCT FROM 'stage_2_blocked' THEN
    IF NEW.gtin_status IN ('confirmed', 'pending_confirmation', 'not_applicable')
       AND NEW.name IS NOT NULL AND NEW.name <> ''
       AND COALESCE(NEW.main_image_url, NEW.image_url) IS NOT NULL
       AND NEW.sku IS NOT NULL AND NEW.sku <> ''
       AND (v_attr_count + v_spec_count) >= 2 THEN
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

-- 2. Atualizar em massa todos os produtos existentes para recalcular o estágio
UPDATE public.products
SET stage = stage;
