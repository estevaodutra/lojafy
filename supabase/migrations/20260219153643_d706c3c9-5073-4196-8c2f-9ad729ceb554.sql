
-- Adicionar campos para dados originais do produto
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_name TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_description TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_images JSONB;
ALTER TABLE products ADD COLUMN IF NOT EXISTS original_saved_at TIMESTAMPTZ;

-- Comentários
COMMENT ON COLUMN products.original_name IS 'Nome original do produto (primeira versão, nunca sobrescrito)';
COMMENT ON COLUMN products.original_description IS 'Descrição original do produto (primeira versão, nunca sobrescrita)';
COMMENT ON COLUMN products.original_images IS 'Imagens originais do produto (primeira versão, nunca sobrescritas)';
COMMENT ON COLUMN products.original_saved_at IS 'Data em que os dados originais foram salvos';

-- Popular original_* para produtos existentes que ainda não têm (cast text[] to jsonb)
UPDATE products SET 
  original_name = name,
  original_description = description, 
  original_images = to_jsonb(images),
  original_saved_at = created_at 
WHERE original_name IS NULL;

-- Índice para consultas
CREATE INDEX IF NOT EXISTS idx_products_has_original ON products((original_name IS NOT NULL));
