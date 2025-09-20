-- Create reseller stores table
CREATE TABLE public.reseller_stores (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  store_name text NOT NULL,
  store_slug text UNIQUE,
  logo_url text,
  primary_color text DEFAULT '#000000',
  secondary_color text DEFAULT '#f3f4f6',
  accent_color text DEFAULT '#3b82f6',
  banner_image_url text,
  banner_title text DEFAULT 'Bem-vindos à nossa loja',
  banner_subtitle text DEFAULT 'Os melhores produtos com preços especiais',
  contact_phone text,
  contact_email text,
  contact_address text,
  whatsapp text,
  payment_methods jsonb DEFAULT '{"pix": true, "credit_card": true, "debit_card": false}'::jsonb,
  policies jsonb DEFAULT '{"shipping": "Entregamos em todo o Brasil", "returns": "7 dias para trocas e devoluções", "warranty": "Garantia conforme fabricante"}'::jsonb,
  active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create reseller products table  
CREATE TABLE public.reseller_products (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  reseller_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  active boolean DEFAULT true,
  custom_price numeric,
  custom_description text,
  position integer DEFAULT 1,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(reseller_id, product_id)
);

-- Enable Row Level Security
ALTER TABLE public.reseller_stores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reseller_products ENABLE ROW LEVEL SECURITY;

-- Create policies for reseller_stores
CREATE POLICY "Resellers can manage their own store" 
ON public.reseller_stores 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'reseller' 
    AND profiles.user_id = reseller_stores.reseller_id
  )
);

CREATE POLICY "Anyone can view active reseller stores" 
ON public.reseller_stores 
FOR SELECT 
USING (active = true);

-- Create policies for reseller_products
CREATE POLICY "Resellers can manage their own products" 
ON public.reseller_products 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = 'reseller' 
    AND profiles.user_id = reseller_products.reseller_id
  )
);

CREATE POLICY "Anyone can view active reseller products" 
ON public.reseller_products 
FOR SELECT 
USING (
  active = true 
  AND EXISTS (
    SELECT 1 FROM public.reseller_stores 
    WHERE reseller_stores.reseller_id = reseller_products.reseller_id 
    AND reseller_stores.active = true
  )
);

-- Create updated_at trigger for reseller_stores
CREATE TRIGGER update_reseller_stores_updated_at
BEFORE UPDATE ON public.reseller_stores
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for reseller_products
CREATE TRIGGER update_reseller_products_updated_at
BEFORE UPDATE ON public.reseller_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();