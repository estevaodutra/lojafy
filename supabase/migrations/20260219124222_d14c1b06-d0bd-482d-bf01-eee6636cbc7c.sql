
-- Dropar views que referenciam a coluna 'data'
DROP VIEW IF EXISTS v_products_mercadolivre;
DROP VIEW IF EXISTS v_products_with_marketplace;

-- Renomear data -> validated_body
ALTER TABLE product_marketplace_data RENAME COLUMN data TO validated_body;

-- Novos campos de validação
ALTER TABLE product_marketplace_data ADD COLUMN is_validated BOOLEAN DEFAULT false;
ALTER TABLE product_marketplace_data ADD COLUMN validated_at TIMESTAMPTZ;

-- Índice
CREATE INDEX IF NOT EXISTS idx_pmd_is_validated ON product_marketplace_data(is_validated);

-- Recriar views com a nova coluna
CREATE OR REPLACE VIEW v_products_with_marketplace AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.price AS lojafy_price,
  p.stock_quantity AS lojafy_stock,
  p.images AS lojafy_images,
  p.attributes AS lojafy_attributes,
  pmd.id AS marketplace_data_id,
  pmd.marketplace,
  pmd.validated_body,
  pmd.is_validated,
  pmd.validated_at,
  pmd.validated_body->>'category_id' AS ml_category_id,
  pmd.validated_body->>'title' AS ml_title,
  pmd.listing_id,
  pmd.listing_url,
  pmd.listing_status,
  pmd.published_at,
  pmd.last_sync_at
FROM products p
LEFT JOIN product_marketplace_data pmd ON p.id = pmd.product_id;

CREATE OR REPLACE VIEW v_products_mercadolivre AS
SELECT * FROM v_products_with_marketplace
WHERE marketplace = 'mercadolivre' OR marketplace IS NULL;
