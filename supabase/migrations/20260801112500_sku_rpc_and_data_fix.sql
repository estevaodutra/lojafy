-- 20260801112500_sku_rpc_and_data_fix.sql
-- Atualiza a RPC generate_sku para não conter hífens e executa data fix em SKUs antigos com caracteres especiais.

CREATE OR REPLACE FUNCTION public.generate_sku(category_name TEXT DEFAULT NULL, brand_name TEXT DEFAULT NULL)
RETURNS TEXT 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sku_prefix TEXT := '';
  sku_counter INTEGER;
  final_sku TEXT;
BEGIN
  -- Monta prefixo a partir da categoria (apenas letras/números)
  IF category_name IS NOT NULL THEN
    sku_prefix := sku_prefix || UPPER(LEFT(REGEXP_REPLACE(category_name, '[^a-zA-Z0-9]', '', 'g'), 4));
  END IF;
  
  -- Adiciona a marca concatenada diretamente sem traço
  IF brand_name IS NOT NULL THEN
    sku_prefix := sku_prefix || UPPER(LEFT(REGEXP_REPLACE(brand_name, '[^a-zA-Z0-9]', '', 'g'), 4));
  END IF;
  
  IF sku_prefix = '' THEN
    sku_prefix := 'PROD';
  END IF;
  
  -- Obter próximo contador
  SELECT COALESCE(MAX(CAST(REGEXP_REPLACE(RIGHT(sku, 3), '[^0-9]', '', 'g') AS INTEGER)), 0) + 1
  INTO sku_counter
  FROM products 
  WHERE sku LIKE sku_prefix || '%';
  
  -- Concatenar sem traço
  final_sku := sku_prefix || LPAD(sku_counter::TEXT, 3, '0');
  
  -- Garantir limpeza final alfanumérica por segurança
  final_sku := upper(regexp_replace(final_sku, '[^a-zA-Z0-9]', '', 'g'));
  
  RETURN final_sku;
END;
$$;

-- DATA FIX RETROATIVO:
-- Remover caracteres especiais (como traços, barras ou espaços) de todos os SKUs existentes no catálogo.
UPDATE public.products 
SET sku = upper(regexp_replace(sku, '[^a-zA-Z0-9]', '', 'g'))
WHERE sku IS NOT NULL AND sku ~ '[^a-zA-Z0-9]';

UPDATE public.product_variants 
SET sku = upper(regexp_replace(sku, '[^a-zA-Z0-9]', '', 'g'))
WHERE sku IS NOT NULL AND sku ~ '[^a-zA-Z0-9]';
