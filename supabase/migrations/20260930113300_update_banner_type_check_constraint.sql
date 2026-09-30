-- Update check constraints for banner_type on banners and reseller_banners to include 'footer'
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_banner_type_check;
ALTER TABLE banners ADD CONSTRAINT banners_banner_type_check CHECK (banner_type IN ('carousel', 'featured', 'footer'));

ALTER TABLE reseller_banners DROP CONSTRAINT IF EXISTS reseller_banners_banner_type_check;
ALTER TABLE reseller_banners ADD CONSTRAINT reseller_banners_banner_type_check CHECK (banner_type IN ('carousel', 'featured', 'footer'));

-- Fix unique position constraint on banners table so each banner_type has independent positions
DROP INDEX IF EXISTS unique_active_banner_position;
CREATE UNIQUE INDEX IF NOT EXISTS unique_active_banner_position 
ON public.banners (banner_type, position) 
WHERE active = true;
