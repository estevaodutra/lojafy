-- Add additional_costs column to platform_settings table
ALTER TABLE platform_settings 
ADD COLUMN IF NOT EXISTS additional_costs JSONB DEFAULT '[]'::jsonb;

COMMENT ON COLUMN platform_settings.additional_costs IS 'Array of additional costs to be added to product prices. Each cost has: id, name, value, type (fixed/percentage), active, created_at';

-- Example structure:
-- [
--   {
--     "id": "uuid",
--     "name": "Embalagem",
--     "value": 2.50,
--     "type": "fixed",
--     "active": true,
--     "created_at": "2025-01-23T..."
--   }
-- ]