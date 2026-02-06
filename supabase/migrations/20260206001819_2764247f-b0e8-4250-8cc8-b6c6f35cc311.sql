-- Create table to track products published to Mercado Livre
CREATE TABLE public.mercadolivre_published_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  ml_item_id TEXT,
  published_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, product_id)
);

-- Enable RLS
ALTER TABLE public.mercadolivre_published_products ENABLE ROW LEVEL SECURITY;

-- Users can view their own published products
CREATE POLICY "Users can view own published products"
ON public.mercadolivre_published_products
FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own published products
CREATE POLICY "Users can insert own published products"
ON public.mercadolivre_published_products
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own published products
CREATE POLICY "Users can update own published products"
ON public.mercadolivre_published_products
FOR UPDATE
USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX idx_ml_published_products_user_id ON public.mercadolivre_published_products(user_id);
CREATE INDEX idx_ml_published_products_product_id ON public.mercadolivre_published_products(product_id);

-- Add trigger for updated_at
CREATE TRIGGER update_mercadolivre_published_products_updated_at
BEFORE UPDATE ON public.mercadolivre_published_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();