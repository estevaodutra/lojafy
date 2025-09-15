-- Create shipping methods table
CREATE TABLE public.shipping_methods (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  estimated_days INTEGER NOT NULL DEFAULT 7,
  base_price NUMERIC NOT NULL DEFAULT 0,
  is_free_above_amount NUMERIC,
  is_label_method BOOLEAN NOT NULL DEFAULT false,
  requires_upload BOOLEAN NOT NULL DEFAULT false,
  max_file_size_mb INTEGER DEFAULT 5,
  transporter TEXT,
  priority INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipping zones table
CREATE TABLE public.shipping_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  zip_code_start TEXT NOT NULL,
  zip_code_end TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create shipping rules table
CREATE TABLE public.shipping_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shipping_method_id UUID NOT NULL REFERENCES shipping_methods(id) ON DELETE CASCADE,
  zone_id UUID REFERENCES shipping_zones(id) ON DELETE SET NULL,
  min_order_value NUMERIC,
  max_order_value NUMERIC,
  min_weight NUMERIC,
  max_weight NUMERIC,
  price_modifier NUMERIC NOT NULL DEFAULT 0,
  percentage_modifier NUMERIC,
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create order shipping files table
CREATE TABLE public.order_shipping_files (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add shipping fields to orders table
ALTER TABLE public.orders 
ADD COLUMN shipping_method_id UUID REFERENCES shipping_methods(id),
ADD COLUMN shipping_method_name TEXT,
ADD COLUMN shipping_estimated_days INTEGER,
ADD COLUMN has_shipping_file BOOLEAN DEFAULT false;

-- Enable RLS
ALTER TABLE public.shipping_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_zones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shipping_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_shipping_files ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for shipping_methods
CREATE POLICY "Admins can manage shipping methods" 
ON public.shipping_methods 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Anyone can view active shipping methods" 
ON public.shipping_methods 
FOR SELECT 
USING (active = true);

-- Create RLS policies for shipping_zones
CREATE POLICY "Admins can manage shipping zones" 
ON public.shipping_zones 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Anyone can view shipping zones" 
ON public.shipping_zones 
FOR SELECT 
USING (true);

-- Create RLS policies for shipping_rules
CREATE POLICY "Admins can manage shipping rules" 
ON public.shipping_rules 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Anyone can view shipping rules" 
ON public.shipping_rules 
FOR SELECT 
USING (true);

-- Create RLS policies for order_shipping_files
CREATE POLICY "Users can view their own shipping files" 
ON public.order_shipping_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_shipping_files.order_id 
  AND orders.user_id = auth.uid()
));

CREATE POLICY "Admins can view all shipping files" 
ON public.order_shipping_files 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Users can insert shipping files for their orders" 
ON public.order_shipping_files 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM orders 
  WHERE orders.id = order_shipping_files.order_id 
  AND orders.user_id = auth.uid()
));

-- Create storage bucket for shipping files
INSERT INTO storage.buckets (id, name, public) VALUES ('shipping-files', 'shipping-files', false);

-- Create storage policies for shipping files
CREATE POLICY "Users can upload shipping files for their orders" 
ON storage.objects 
FOR INSERT 
WITH CHECK (
  bucket_id = 'shipping-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can view their own shipping files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipping-files' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Admins can view all shipping files" 
ON storage.objects 
FOR SELECT 
USING (
  bucket_id = 'shipping-files' 
  AND EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'super_admin')
  )
);

-- Create update trigger
CREATE TRIGGER update_shipping_methods_updated_at
  BEFORE UPDATE ON public.shipping_methods
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_zones_updated_at
  BEFORE UPDATE ON public.shipping_zones
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_shipping_rules_updated_at
  BEFORE UPDATE ON public.shipping_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default shipping methods
INSERT INTO public.shipping_methods (name, description, estimated_days, base_price, is_free_above_amount, priority) VALUES
('Frete Grátis', 'Entrega gratuita em até 7 dias úteis', 7, 0, 199.00, 1),
('Frete Expresso', 'Entrega expressa em até 3 dias úteis', 3, 25.00, NULL, 2),
('Retirada na Loja', 'Retire seu pedido em nossa loja física', 0, 0, NULL, 3),
('Envio com Etiqueta', 'Envio personalizado com etiqueta própria', 5, 15.00, NULL, 4);

-- Update the label method
UPDATE public.shipping_methods 
SET is_label_method = true, requires_upload = true 
WHERE name = 'Envio com Etiqueta';