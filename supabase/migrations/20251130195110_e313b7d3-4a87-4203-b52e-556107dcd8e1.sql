-- Fix security warning: Set search_path for update_updated_at_column function
DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Recreate triggers with the fixed function
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