-- Add new columns to banners table for carousel/featured functionality
ALTER TABLE banners 
ADD COLUMN IF NOT EXISTS banner_type text DEFAULT 'carousel' CHECK (banner_type IN ('carousel', 'featured')),
ADD COLUMN IF NOT EXISTS link_url text,
ADD COLUMN IF NOT EXISTS open_new_tab boolean DEFAULT false;

-- Create reseller_banners table
CREATE TABLE IF NOT EXISTS reseller_banners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id uuid NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  banner_type text NOT NULL DEFAULT 'carousel' CHECK (banner_type IN ('carousel', 'featured')),
  desktop_image_url text NOT NULL,
  mobile_image_url text,
  link_url text,
  open_new_tab boolean DEFAULT false,
  position integer NOT NULL DEFAULT 1,
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE reseller_banners ENABLE ROW LEVEL SECURITY;

-- RLS Policies for reseller_banners
CREATE POLICY "Resellers can manage their own banners"
ON reseller_banners
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'reseller'
    AND profiles.user_id = reseller_banners.reseller_id
  )
);

CREATE POLICY "Anyone can view active banners from active stores"
ON reseller_banners
FOR SELECT
USING (
  active = true
  AND EXISTS (
    SELECT 1 FROM reseller_stores
    WHERE reseller_stores.reseller_id = reseller_banners.reseller_id
    AND reseller_stores.active = true
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_reseller_banners_reseller ON reseller_banners(reseller_id);
CREATE INDEX IF NOT EXISTS idx_reseller_banners_type ON reseller_banners(banner_type, active);
CREATE INDEX IF NOT EXISTS idx_reseller_banners_position ON reseller_banners(reseller_id, banner_type, position);

-- Create trigger for updated_at
CREATE TRIGGER update_reseller_banners_updated_at
  BEFORE UPDATE ON reseller_banners
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();