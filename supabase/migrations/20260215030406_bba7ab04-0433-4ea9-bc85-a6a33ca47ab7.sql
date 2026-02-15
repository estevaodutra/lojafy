
-- Fix SECURITY DEFINER views - set to SECURITY INVOKER
CREATE OR REPLACE VIEW v_products_with_attributes WITH (security_invoker = true) AS
SELECT 
  p.id, p.name, p.price, p.stock_quantity, p.domain_id,
  pd.name as domain_name, p.condition, p.has_variations,
  jsonb_array_length(p.variations) as variation_count,
  (SELECT attr->>'value' FROM jsonb_array_elements(p.attributes) attr WHERE attr->>'id' = 'BRAND') as brand_value,
  (SELECT attr->>'value' FROM jsonb_array_elements(p.attributes) attr WHERE attr->>'id' = 'COLOR') as color_value,
  (SELECT attr->>'value' FROM jsonb_array_elements(p.attributes) attr WHERE attr->>'id' = 'SIZE') as size_value,
  p.attributes, p.variations, p.enriched_at, p.catalog_source
FROM products p
LEFT JOIN product_domains pd ON p.domain_id = pd.id;

CREATE OR REPLACE VIEW v_products_needs_enrichment WITH (security_invoker = true) AS
SELECT 
  p.id, p.name, p.category_id, c.name as category_name,
  p.gtin_ean13, p.brand, p.specifications, p.attributes, p.enriched_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE (p.attributes IS NULL OR p.attributes = '[]'::jsonb)
  AND p.active = true
ORDER BY p.created_at DESC;

-- Fix search_path on new functions
CREATE OR REPLACE FUNCTION validate_product_condition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.condition IS NOT NULL AND NEW.condition NOT IN ('new', 'used', 'refurbished', 'not_specified') THEN
    RAISE EXCEPTION 'Invalid condition value: %. Must be one of: new, used, refurbished, not_specified', NEW.condition;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION validate_attribute_value_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value_type NOT IN ('text', 'list', 'number', 'boolean') THEN
    RAISE EXCEPTION 'Invalid value_type: %. Must be one of: text, list, number, boolean', NEW.value_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION update_product_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION update_attribute_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION migrate_specifications_to_attributes()
RETURNS void AS $$
DECLARE
  product_record RECORD;
  new_attributes JSONB;
  spec_value TEXT;
BEGIN
  FOR product_record IN 
    SELECT id, specifications, brand, gtin_ean13 
    FROM products 
    WHERE specifications IS NOT NULL 
      AND specifications != '{}'::jsonb
      AND (attributes IS NULL OR attributes = '[]'::jsonb)
  LOOP
    new_attributes := '[]'::jsonb;
    spec_value := product_record.specifications->>'cor';
    IF spec_value IS NOT NULL AND spec_value != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'COLOR', 'name', 'Cor', 'value', spec_value));
    END IF;
    spec_value := product_record.specifications->>'tamanho';
    IF spec_value IS NOT NULL AND spec_value != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'SIZE', 'name', 'Tamanho', 'value', spec_value));
    END IF;
    spec_value := product_record.specifications->>'material';
    IF spec_value IS NOT NULL AND spec_value != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'MATERIAL', 'name', 'Material', 'value', spec_value));
    END IF;
    spec_value := product_record.specifications->>'garantia';
    IF spec_value IS NOT NULL AND spec_value != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'WARRANTY', 'name', 'Garantia', 'value', spec_value));
    END IF;
    spec_value := product_record.specifications->>'tecnologia';
    IF spec_value IS NOT NULL AND spec_value != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'CONNECTIVITY', 'name', 'Conectividade', 'value', spec_value));
    END IF;
    IF product_record.brand IS NOT NULL AND product_record.brand != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'BRAND', 'name', 'Marca', 'value', product_record.brand));
    END IF;
    IF product_record.gtin_ean13 IS NOT NULL AND product_record.gtin_ean13 != '' THEN
      new_attributes := new_attributes || jsonb_build_array(jsonb_build_object('id', 'GTIN', 'name', 'Código de Barras', 'value', product_record.gtin_ean13));
    END IF;
    IF jsonb_array_length(new_attributes) > 0 THEN
      UPDATE products SET attributes = new_attributes, enriched_at = now(), catalog_source = 'migration' WHERE id = product_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION add_product_attribute(
  p_product_id UUID, p_attribute_id TEXT, p_value TEXT, p_value_id TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  attr_def RECORD;
  new_attr JSONB;
  current_attrs JSONB;
  result JSONB;
BEGIN
  SELECT * INTO attr_def FROM attribute_definitions WHERE id = p_attribute_id;
  IF attr_def IS NULL THEN
    RAISE EXCEPTION 'Atributo % não encontrado', p_attribute_id;
  END IF;
  new_attr := jsonb_build_object('id', p_attribute_id, 'name', attr_def.name, 'value', p_value, 'value_id', p_value_id);
  SELECT COALESCE(attributes, '[]'::jsonb) INTO current_attrs FROM products WHERE id = p_product_id;
  current_attrs := (
    SELECT COALESCE(jsonb_agg(attr), '[]'::jsonb)
    FROM jsonb_array_elements(current_attrs) attr
    WHERE attr->>'id' != p_attribute_id
  );
  result := current_attrs || jsonb_build_array(new_attr);
  UPDATE products SET attributes = result, enriched_at = now() WHERE id = p_product_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION add_product_variation(
  p_product_id UUID, p_sku TEXT, p_attributes JSONB, p_stock INTEGER, p_price DECIMAL DEFAULT NULL, p_gtin TEXT DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
  new_variation JSONB;
  current_variations JSONB;
  product_price DECIMAL;
  result JSONB;
BEGIN
  IF p_price IS NULL THEN
    SELECT price INTO product_price FROM products WHERE id = p_product_id;
    p_price := product_price;
  END IF;
  new_variation := jsonb_build_object('sku', p_sku, 'attributes', p_attributes, 'stock', p_stock, 'price', p_price, 'gtin', p_gtin);
  SELECT COALESCE(variations, '[]'::jsonb) INTO current_variations FROM products WHERE id = p_product_id;
  current_variations := (
    SELECT COALESCE(jsonb_agg(var), '[]'::jsonb)
    FROM jsonb_array_elements(current_variations) var
    WHERE var->>'sku' != p_sku
  );
  result := current_variations || jsonb_build_array(new_variation);
  UPDATE products SET variations = result, has_variations = true, enriched_at = now() WHERE id = p_product_id;
  RETURN result;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION get_product_total_stock(p_product_id UUID)
RETURNS INTEGER AS $$
DECLARE
  product_record RECORD;
  total_stock INTEGER := 0;
BEGIN
  SELECT has_variations, variations, stock_quantity INTO product_record FROM products WHERE id = p_product_id;
  IF product_record.has_variations AND jsonb_array_length(product_record.variations) > 0 THEN
    SELECT COALESCE(SUM((var->>'stock')::integer), 0) INTO total_stock
    FROM jsonb_array_elements(product_record.variations) var;
  ELSE
    total_stock := COALESCE(product_record.stock_quantity, 0);
  END IF;
  RETURN total_stock;
END;
$$ LANGUAGE plpgsql SET search_path = public;
