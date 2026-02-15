
-- =============================================
-- 1. ALTER TABLE products - Novos campos
-- =============================================
ALTER TABLE products ADD COLUMN IF NOT EXISTS attributes JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS variations JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS domain_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT DEFAULT 'not_specified';
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_source TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS catalog_source_id TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS enriched_at TIMESTAMPTZ;
ALTER TABLE products ADD COLUMN IF NOT EXISTS has_variations BOOLEAN DEFAULT false;

-- Índices
CREATE INDEX IF NOT EXISTS idx_products_domain_id ON products(domain_id);
CREATE INDEX IF NOT EXISTS idx_products_condition ON products(condition);
CREATE INDEX IF NOT EXISTS idx_products_has_variations ON products(has_variations);
CREATE INDEX IF NOT EXISTS idx_products_attributes ON products USING GIN(attributes);

-- Trigger de validação para condition (ao invés de CHECK)
CREATE OR REPLACE FUNCTION validate_product_condition()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.condition IS NOT NULL AND NEW.condition NOT IN ('new', 'used', 'refurbished', 'not_specified') THEN
    RAISE EXCEPTION 'Invalid condition value: %. Must be one of: new, used, refurbished, not_specified', NEW.condition;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_product_condition ON products;
CREATE TRIGGER trigger_validate_product_condition
  BEFORE INSERT OR UPDATE ON products
  FOR EACH ROW
  EXECUTE FUNCTION validate_product_condition();

-- =============================================
-- 2. CREATE TABLE product_domains
-- =============================================
CREATE TABLE IF NOT EXISTS product_domains (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  required_attributes TEXT[] DEFAULT '{}',
  recommended_attributes TEXT[] DEFAULT '{}',
  variation_attributes TEXT[] DEFAULT '{}',
  settings JSONB DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_domains_category ON product_domains(category_id);
CREATE INDEX IF NOT EXISTS idx_product_domains_active ON product_domains(active);

CREATE OR REPLACE FUNCTION update_product_domains_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_product_domains_updated_at ON product_domains;
CREATE TRIGGER trigger_product_domains_updated_at
  BEFORE UPDATE ON product_domains
  FOR EACH ROW
  EXECUTE FUNCTION update_product_domains_updated_at();

-- =============================================
-- 3. CREATE TABLE attribute_definitions
-- =============================================
CREATE TABLE IF NOT EXISTS attribute_definitions (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  value_type TEXT NOT NULL DEFAULT 'text',
  allowed_values JSONB DEFAULT '[]',
  unit TEXT,
  allows_variations BOOLEAN DEFAULT false,
  attribute_group TEXT DEFAULT 'basic',
  display_order INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Trigger de validação para value_type
CREATE OR REPLACE FUNCTION validate_attribute_value_type()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.value_type NOT IN ('text', 'list', 'number', 'boolean') THEN
    RAISE EXCEPTION 'Invalid value_type: %. Must be one of: text, list, number, boolean', NEW.value_type;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_validate_attribute_value_type ON attribute_definitions;
CREATE TRIGGER trigger_validate_attribute_value_type
  BEFORE INSERT OR UPDATE ON attribute_definitions
  FOR EACH ROW
  EXECUTE FUNCTION validate_attribute_value_type();

CREATE INDEX IF NOT EXISTS idx_attribute_definitions_group ON attribute_definitions(attribute_group);
CREATE INDEX IF NOT EXISTS idx_attribute_definitions_variations ON attribute_definitions(allows_variations);
CREATE INDEX IF NOT EXISTS idx_attribute_definitions_active ON attribute_definitions(active);

CREATE OR REPLACE FUNCTION update_attribute_definitions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_attribute_definitions_updated_at ON attribute_definitions;
CREATE TRIGGER trigger_attribute_definitions_updated_at
  BEFORE UPDATE ON attribute_definitions
  FOR EACH ROW
  EXECUTE FUNCTION update_attribute_definitions_updated_at();

-- =============================================
-- 4. Dados iniciais - Atributos
-- =============================================
INSERT INTO attribute_definitions (id, name, value_type, attribute_group, allows_variations, display_order) VALUES
  ('BRAND', 'Marca', 'text', 'basic', false, 1),
  ('MODEL', 'Modelo', 'text', 'basic', false, 2),
  ('GTIN', 'Código de Barras (EAN/GTIN)', 'text', 'basic', false, 3),
  ('MPN', 'Código do Fabricante (MPN)', 'text', 'basic', false, 4),
  ('COLOR', 'Cor', 'list', 'variations', true, 10),
  ('SIZE', 'Tamanho', 'list', 'variations', true, 11),
  ('VOLTAGE', 'Voltagem', 'list', 'variations', true, 12),
  ('MATERIAL', 'Material', 'text', 'physical', false, 20),
  ('WEIGHT', 'Peso', 'number', 'physical', false, 21),
  ('HEIGHT', 'Altura', 'number', 'physical', false, 22),
  ('WIDTH', 'Largura', 'number', 'physical', false, 23),
  ('LENGTH', 'Comprimento', 'number', 'physical', false, 24),
  ('POWER', 'Potência', 'text', 'technical', false, 30),
  ('CAPACITY', 'Capacidade', 'text', 'technical', false, 31),
  ('CONNECTIVITY', 'Conectividade', 'text', 'technical', false, 32),
  ('WARRANTY', 'Garantia', 'text', 'commercial', false, 40),
  ('ORIGIN', 'Origem', 'text', 'commercial', false, 41),
  ('CONDITION', 'Condição', 'list', 'commercial', false, 42)
ON CONFLICT (id) DO NOTHING;

UPDATE attribute_definitions SET allowed_values = '[
  {"id": "red", "name": "Vermelho"},
  {"id": "blue", "name": "Azul"},
  {"id": "green", "name": "Verde"},
  {"id": "yellow", "name": "Amarelo"},
  {"id": "black", "name": "Preto"},
  {"id": "white", "name": "Branco"},
  {"id": "gray", "name": "Cinza"},
  {"id": "pink", "name": "Rosa"},
  {"id": "purple", "name": "Roxo"},
  {"id": "orange", "name": "Laranja"},
  {"id": "brown", "name": "Marrom"},
  {"id": "beige", "name": "Bege"},
  {"id": "multicolor", "name": "Multicolorido"}
]' WHERE id = 'COLOR';

UPDATE attribute_definitions SET allowed_values = '[
  {"id": "pp", "name": "PP"},
  {"id": "p", "name": "P"},
  {"id": "m", "name": "M"},
  {"id": "g", "name": "G"},
  {"id": "gg", "name": "GG"},
  {"id": "xg", "name": "XG"},
  {"id": "xxg", "name": "XXG"},
  {"id": "xxxg", "name": "XXXG"},
  {"id": "unico", "name": "Único"}
]' WHERE id = 'SIZE';

UPDATE attribute_definitions SET allowed_values = '[
  {"id": "110v", "name": "110V"},
  {"id": "220v", "name": "220V"},
  {"id": "bivolt", "name": "Bivolt"}
]' WHERE id = 'VOLTAGE';

UPDATE attribute_definitions SET unit = 'kg' WHERE id = 'WEIGHT';
UPDATE attribute_definitions SET unit = 'cm' WHERE id IN ('HEIGHT', 'WIDTH', 'LENGTH');
UPDATE attribute_definitions SET unit = 'W' WHERE id = 'POWER';

-- =============================================
-- 5. Dados iniciais - Domínios
-- =============================================
INSERT INTO product_domains (id, name, description, required_attributes, recommended_attributes, variation_attributes) VALUES
  ('LJF-WAFFLE_MAKERS', 'Máquinas de Waffle', 'Máquinas elétricas para fazer waffles', 
   ARRAY['BRAND', 'VOLTAGE'], ARRAY['MODEL', 'POWER', 'MATERIAL'], ARRAY['VOLTAGE', 'COLOR']),
  ('LJF-POSTURE_CORRECTORS', 'Corretores Posturais', 'Coletes e cintas para correção postural',
   ARRAY['BRAND', 'MATERIAL'], ARRAY['MODEL', 'COLOR'], ARRAY['SIZE', 'COLOR']),
  ('LJF-ORAL_IRRIGATORS', 'Irrigadores Bucais', 'Irrigadores e limpadores dentais',
   ARRAY['BRAND'], ARRAY['MODEL', 'CAPACITY', 'POWER'], ARRAY['COLOR']),
  ('LJF-JEWELRY', 'Joias e Bijuterias', 'Correntes, pulseiras, anéis e acessórios',
   ARRAY['MATERIAL'], ARRAY['COLOR', 'SIZE'], ARRAY['SIZE', 'COLOR']),
  ('LJF-SHAPEWEAR', 'Cintas Modeladoras', 'Cintas e modeladores corporais',
   ARRAY['MATERIAL'], ARRAY['COLOR'], ARRAY['SIZE', 'COLOR']),
  ('LJF-ROBOT_VACUUMS', 'Aspiradores Robô', 'Robôs aspiradores e varredores automáticos',
   ARRAY['BRAND', 'VOLTAGE'], ARRAY['MODEL', 'POWER', 'CAPACITY'], ARRAY['COLOR']),
  ('LJF-TOYS', 'Brinquedos', 'Brinquedos infantis diversos',
   ARRAY['BRAND'], ARRAY['MATERIAL', 'COLOR'], ARRAY['COLOR'])
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- 6. Migração de dados existentes
-- =============================================
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
      UPDATE products 
      SET attributes = new_attributes, enriched_at = now(), catalog_source = 'migration'
      WHERE id = product_record.id;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

SELECT migrate_specifications_to_attributes();

UPDATE products SET condition = 'new' WHERE condition IS NULL;

-- =============================================
-- 7. Views
-- =============================================
CREATE OR REPLACE VIEW v_products_with_attributes AS
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

CREATE OR REPLACE VIEW v_products_needs_enrichment AS
SELECT 
  p.id, p.name, p.category_id, c.name as category_name,
  p.gtin_ean13, p.brand, p.specifications, p.attributes, p.enriched_at
FROM products p
LEFT JOIN categories c ON p.category_id = c.id
WHERE (p.attributes IS NULL OR p.attributes = '[]'::jsonb)
  AND p.active = true
ORDER BY p.created_at DESC;

-- =============================================
-- 8. Funções auxiliares
-- =============================================
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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

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
$$ LANGUAGE plpgsql;

-- =============================================
-- 9. RLS Policies
-- =============================================
ALTER TABLE product_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read product_domains"
  ON product_domains FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert product_domains"
  ON product_domains FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update product_domains"
  ON product_domains FOR UPDATE
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins can delete product_domains"
  ON product_domains FOR DELETE
  TO authenticated
  USING (public.is_admin_user());

ALTER TABLE attribute_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read attribute_definitions"
  ON attribute_definitions FOR SELECT
  USING (true);

CREATE POLICY "Admins can insert attribute_definitions"
  ON attribute_definitions FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin_user());

CREATE POLICY "Admins can update attribute_definitions"
  ON attribute_definitions FOR UPDATE
  TO authenticated
  USING (public.is_admin_user());

CREATE POLICY "Admins can delete attribute_definitions"
  ON attribute_definitions FOR DELETE
  TO authenticated
  USING (public.is_admin_user());
