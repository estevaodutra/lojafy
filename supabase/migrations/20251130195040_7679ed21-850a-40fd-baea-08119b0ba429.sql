-- Migration: Add reseller functionality tables

-- 1. Add reseller_id to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS reseller_id UUID REFERENCES profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_reseller_id ON orders(reseller_id);

-- 2. Create reseller_coupons table
CREATE TABLE IF NOT EXISTS reseller_coupons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES profiles(user_id) NOT NULL,
  code TEXT NOT NULL,
  discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value NUMERIC NOT NULL CHECK (discount_value > 0),
  min_order_value NUMERIC DEFAULT 0 CHECK (min_order_value >= 0),
  max_uses INTEGER CHECK (max_uses IS NULL OR max_uses > 0),
  current_uses INTEGER DEFAULT 0 CHECK (current_uses >= 0),
  starts_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  CONSTRAINT unique_reseller_coupon UNIQUE(reseller_id, code),
  CONSTRAINT valid_dates CHECK (expires_at IS NULL OR starts_at IS NULL OR expires_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_reseller_coupons_reseller_id ON reseller_coupons(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_coupons_code ON reseller_coupons(code);
CREATE INDEX IF NOT EXISTS idx_reseller_coupons_active ON reseller_coupons(active) WHERE active = true;

-- 3. Create reseller_shipping_rules table
CREATE TABLE IF NOT EXISTS reseller_shipping_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES profiles(user_id) NOT NULL UNIQUE,
  free_shipping_enabled BOOLEAN DEFAULT false,
  free_shipping_min_value NUMERIC DEFAULT 0 CHECK (free_shipping_min_value >= 0),
  additional_days INTEGER DEFAULT 0 CHECK (additional_days >= 0),
  regional_rates JSONB DEFAULT '{}',
  enabled_shipping_methods UUID[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reseller_shipping_rules_reseller_id ON reseller_shipping_rules(reseller_id);

-- 4. Create reseller_testimonials table
CREATE TABLE IF NOT EXISTS reseller_testimonials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID REFERENCES profiles(user_id) NOT NULL,
  customer_name TEXT NOT NULL,
  customer_avatar_url TEXT,
  customer_initials TEXT,
  rating INTEGER DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  product_purchased TEXT,
  position INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reseller_testimonials_reseller_id ON reseller_testimonials(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_testimonials_active ON reseller_testimonials(active) WHERE active = true;
CREATE INDEX IF NOT EXISTS idx_reseller_testimonials_position ON reseller_testimonials(position);

-- Enable RLS on all new tables
ALTER TABLE reseller_coupons ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE reseller_testimonials ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reseller_coupons
CREATE POLICY "Resellers can manage their own coupons"
  ON reseller_coupons
  FOR ALL
  USING (auth.uid() = reseller_id);

CREATE POLICY "Super admins can view all coupons"
  ON reseller_coupons
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- RLS Policies for reseller_shipping_rules
CREATE POLICY "Resellers can manage their own shipping rules"
  ON reseller_shipping_rules
  FOR ALL
  USING (auth.uid() = reseller_id);

CREATE POLICY "Super admins can view all shipping rules"
  ON reseller_shipping_rules
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- RLS Policies for reseller_testimonials
CREATE POLICY "Resellers can manage their own testimonials"
  ON reseller_testimonials
  FOR ALL
  USING (auth.uid() = reseller_id);

CREATE POLICY "Public can view active testimonials"
  ON reseller_testimonials
  FOR SELECT
  USING (active = true);

CREATE POLICY "Super admins can view all testimonials"
  ON reseller_testimonials
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Triggers for updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_reseller_coupons_updated_at
  BEFORE UPDATE ON reseller_coupons
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_shipping_rules_updated_at
  BEFORE UPDATE ON reseller_shipping_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_testimonials_updated_at
  BEFORE UPDATE ON reseller_testimonials
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();