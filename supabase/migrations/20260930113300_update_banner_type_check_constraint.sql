-- Update check constraints for banner_type on banners and reseller_banners to include 'footer'
ALTER TABLE banners DROP CONSTRAINT IF EXISTS banners_banner_type_check;
ALTER TABLE banners ADD CONSTRAINT banners_banner_type_check CHECK (banner_type IN ('carousel', 'featured', 'footer'));

ALTER TABLE reseller_banners DROP CONSTRAINT IF EXISTS reseller_banners_banner_type_check;
ALTER TABLE reseller_banners ADD CONSTRAINT reseller_banners_banner_type_check CHECK (banner_type IN ('carousel', 'featured', 'footer'));
