-- Create table for managing homepage category highlights
CREATE TABLE public.homepage_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  category_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  active BOOLEAN NOT NULL DEFAULT true,
  custom_title TEXT,
  custom_description TEXT,
  custom_icon TEXT,
  custom_color TEXT,
  custom_image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(category_id)
);

-- Create table for managing featured products on homepage
CREATE TABLE public.featured_products (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID NOT NULL,
  position INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  is_auto_selected BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(product_id)
);

-- Create table for managing testimonials
CREATE TABLE public.testimonials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name TEXT NOT NULL,
  customer_avatar_url TEXT,
  customer_initials TEXT,
  rating INTEGER NOT NULL DEFAULT 5 CHECK (rating >= 1 AND rating <= 5),
  comment TEXT NOT NULL,
  product_purchased TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for newsletter/CTA configuration
CREATE TABLE public.newsletter_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL DEFAULT 'Ofertas Exclusivas',
  subtitle TEXT DEFAULT 'Receba ofertas especiais e novidades em primeira mão!',
  description TEXT DEFAULT 'Cadastre-se e seja o primeiro a saber sobre nossas promoções.',
  email_placeholder TEXT NOT NULL DEFAULT 'Seu melhor e-mail',
  button_text TEXT NOT NULL DEFAULT 'Quero receber ofertas',
  button_color TEXT DEFAULT 'primary',
  icon_name TEXT DEFAULT 'Gift',
  background_color TEXT,
  custom_image_url TEXT,
  privacy_text TEXT DEFAULT 'Não compartilhamos seus dados.',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.homepage_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.featured_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.testimonials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.newsletter_config ENABLE ROW LEVEL SECURITY;

-- Create policies for homepage_categories
CREATE POLICY "Admins can manage homepage categories" 
ON public.homepage_categories 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Anyone can view active homepage categories" 
ON public.homepage_categories 
FOR SELECT 
USING (active = true);

-- Create policies for featured_products
CREATE POLICY "Admins can manage featured products" 
ON public.featured_products 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Anyone can view active featured products" 
ON public.featured_products 
FOR SELECT 
USING (active = true);

-- Create policies for testimonials
CREATE POLICY "Admins can manage testimonials" 
ON public.testimonials 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Anyone can view active testimonials" 
ON public.testimonials 
FOR SELECT 
USING (active = true);

-- Create policies for newsletter_config
CREATE POLICY "Admins can manage newsletter config" 
ON public.newsletter_config 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
));

CREATE POLICY "Anyone can view active newsletter config" 
ON public.newsletter_config 
FOR SELECT 
USING (active = true);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_homepage_categories_updated_at
  BEFORE UPDATE ON public.homepage_categories
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_featured_products_updated_at
  BEFORE UPDATE ON public.featured_products
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_testimonials_updated_at
  BEFORE UPDATE ON public.testimonials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_newsletter_config_updated_at
  BEFORE UPDATE ON public.newsletter_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default newsletter configuration
INSERT INTO public.newsletter_config (
  title,
  subtitle,
  description,
  email_placeholder,
  button_text,
  button_color,
  icon_name,
  privacy_text,
  active
) VALUES (
  'Ofertas Exclusivas',
  'Receba ofertas especiais e novidades em primeira mão!',
  'Cadastre-se e seja o primeiro a saber sobre nossas promoções.',
  'Seu melhor e-mail',
  'Quero receber ofertas',
  'primary',
  'Gift',
  'Não compartilhamos seus dados.',
  true
);

-- Insert some default testimonials
INSERT INTO public.testimonials (customer_name, customer_initials, rating, comment, product_purchased, position, active) VALUES
('Maria Silva', 'MS', 5, 'Excelente atendimento e produtos de qualidade. Recomendo!', 'iPhone 15 Pro', 1, true),
('João Santos', 'JS', 5, 'Entrega super rápida e produto exatamente como descrito.', 'MacBook Pro', 2, true),
('Ana Costa', 'AC', 5, 'Melhor preço que encontrei e ainda parcelei sem juros!', 'Smartwatch', 3, true);