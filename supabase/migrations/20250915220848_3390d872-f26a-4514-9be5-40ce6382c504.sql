-- Add new footer configuration fields to store_config table
ALTER TABLE public.store_config 
ADD COLUMN IF NOT EXISTS footer_description TEXT DEFAULT 'Sua loja online de confiança com os melhores produtos e preços do mercado.',
ADD COLUMN IF NOT EXISTS company_cnpj TEXT DEFAULT '12.345.678/0001-90',
ADD COLUMN IF NOT EXISTS company_address TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_phone TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS company_email TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS business_hours TEXT DEFAULT 'Seg-Sex: 8h às 18h | Sáb: 8h às 14h',
ADD COLUMN IF NOT EXISTS instagram_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS facebook_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS twitter_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS youtube_url TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS footer_developed_text TEXT DEFAULT 'Desenvolvido com ❤️ para você';