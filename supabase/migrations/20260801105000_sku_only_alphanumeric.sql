-- 20260801105000_sku_only_alphanumeric.sql
-- Ajuste de SKU: Apenas letras e números, sem caracteres especiais (como traços ou barras)

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
  
  -- Remover qualquer caractere não alfanumérico do código da organização
  v_org_code := upper(regexp_replace(v_org_code, '[^a-zA-Z0-9]', '', 'g'));
  
  -- Prefixo sem traço
  v_prefix := 'LJF' || v_org_code;

  INSERT INTO public.supplier_sku_sequences (prefix, organization_id, last_seq)
  VALUES (v_prefix, p_org_id, 1)
  ON CONFLICT (prefix) DO UPDATE SET last_seq = supplier_sku_sequences.last_seq + 1
  RETURNING last_seq INTO v_seq;

  RETURN v_prefix || lpad(v_seq::text, 6, '0');
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
  
  -- Garantir que o SKU pai não tenha traços (limpeza preventiva)
  v_parent_sku := upper(regexp_replace(v_parent_sku, '[^a-zA-Z0-9]', '', 'g'));

  IF NEW.sku IS NULL OR NEW.sku = '' THEN
    v_suffix := public.generate_variant_sku_suffix(NEW.value);
    
    -- Concatenar sem traço
    v_final_sku := v_parent_sku || v_suffix;
    
    WHILE EXISTS (SELECT 1 FROM public.product_variants WHERE sku = v_final_sku AND id IS DISTINCT FROM NEW.id) LOOP
      v_counter := v_counter + 1;
      v_final_sku := v_parent_sku || v_suffix || v_counter;
    END LOOP;
    
    NEW.sku := v_final_sku;
  ELSE
    -- Se o usuário digitou SKU manualmente com caracteres especiais, limpar
    NEW.sku := upper(regexp_replace(NEW.sku, '[^a-zA-Z0-9]', '', 'g'));
  END IF;
  RETURN NEW;
END;
$$;
