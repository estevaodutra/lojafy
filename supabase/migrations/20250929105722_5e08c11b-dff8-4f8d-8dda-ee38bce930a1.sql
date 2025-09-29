-- Add mobile-specific fields to banners table
ALTER TABLE public.banners 
ADD COLUMN mobile_image_url text,
ADD COLUMN mobile_height integer DEFAULT 50;