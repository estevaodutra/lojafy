
-- Drop existing table and recreate with simplified JSONB structure
DROP TABLE IF EXISTS product_marketplace_data CASCADE;

CREATE TABLE product_marketplace_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  marketplace TEXT NOT NULL DEFAULT 'mercadolivre',
  data JSONB NOT NULL DEFAULT '{}',
  
  listing_id TEXT,
  listing_url TEXT,
  listing_status TEXT DEFAULT 'draft',
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  published_at TIMESTAMPTZ,
  last_sync_at TIMESTAMPTZ,
  
  UNIQUE(product_id, marketplace)
);

-- Indexes
CREATE INDEX idx_pmd_product_id ON product_marketplace_data(product_id);
CREATE INDEX idx_pmd_marketplace ON product_marketplace_data(marketplace);
CREATE INDEX idx_pmd_listing_id ON product_marketplace_data(listing_id);
CREATE INDEX idx_pmd_listing_status ON product_marketplace_data(listing_status);

-- Comments
COMMENT ON TABLE product_marketplace_data IS 'Dados exclusivos de cada marketplace por produto';
COMMENT ON COLUMN product_marketplace_data.data IS 'JSON com dados específicos do marketplace (category_id, attributes, etc)';
COMMENT ON COLUMN product_marketplace_data.listing_id IS 'ID do anúncio no marketplace (ex: MLB123456789)';
COMMENT ON COLUMN product_marketplace_data.listing_status IS 'Status: draft, pending, active, paused, closed, error';

-- Enable RLS
ALTER TABLE product_marketplace_data ENABLE ROW LEVEL SECURITY;

-- RLS policies (service role via edge function, so allow all for service role)
CREATE POLICY "Allow all for service role" ON product_marketplace_data
  FOR ALL USING (true) WITH CHECK (true);

-- Trigger for updated_at
CREATE TRIGGER update_product_marketplace_data_updated_at
  BEFORE UPDATE ON product_marketplace_data
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- View: products with marketplace data
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
  pmd.data,
  pmd.data->>'category_id' AS ml_category_id,
  pmd.data->>'category_name' AS ml_category_name,
  pmd.data->>'domain_id' AS ml_domain_id,
  (pmd.data->>'price')::numeric AS ml_price,
  pmd.listing_id,
  pmd.listing_url,
  pmd.listing_status,
  pmd.published_at,
  pmd.last_sync_at
FROM products p
LEFT JOIN product_marketplace_data pmd ON p.id = pmd.product_id;

-- View: only Mercado Livre
CREATE OR REPLACE VIEW v_products_mercadolivre AS
SELECT * FROM v_products_with_marketplace
WHERE marketplace = 'mercadolivre' OR marketplace IS NULL;
