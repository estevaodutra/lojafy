-- Add high_rotation column to products table
ALTER TABLE public.products 
ADD COLUMN high_rotation boolean DEFAULT false;

-- Add comment to document the purpose
COMMENT ON COLUMN public.products.high_rotation IS 'Indica se o produto tem alta rotatividade/demanda, exigindo aviso especial no checkout';