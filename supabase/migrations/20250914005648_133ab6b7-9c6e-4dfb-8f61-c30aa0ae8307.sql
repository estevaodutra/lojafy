-- Create store configuration table
CREATE TABLE public.store_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  header_message TEXT DEFAULT 'Frete grátis para todo o Brasil acima de R$ 199',
  header_message_color TEXT DEFAULT '#ffffff',
  header_background_color TEXT DEFAULT '#000000',
  logo_url TEXT,
  store_name TEXT DEFAULT 'Minha Loja',
  primary_color TEXT DEFAULT '#000000',
  secondary_color TEXT DEFAULT '#f3f4f6',
  accent_color TEXT DEFAULT '#3b82f6',
  buy_button_color TEXT DEFAULT '#22c55e',
  buy_button_text_color TEXT DEFAULT '#ffffff',
  product_info_color TEXT DEFAULT '#374151',
  benefits_config JSONB DEFAULT '[
    {"id": "frete", "title": "Frete Grátis", "description": "Acima de R$ 199", "icon": "Truck", "color": "#22c55e", "active": true, "position": 1},
    {"id": "parcelamento", "title": "Parcelamento", "description": "Em até 10x sem juros", "icon": "CreditCard", "color": "#3b82f6", "active": true, "position": 2},
    {"id": "seguranca", "title": "Compra Segura", "description": "Site protegido", "icon": "Shield", "color": "#8b5cf6", "active": true, "position": 3},
    {"id": "troca", "title": "Troca Fácil", "description": "30 dias para trocar", "icon": "RefreshCw", "color": "#f59e0b", "active": true, "position": 4}
  ]'::jsonb,
  order_summary_highlight_color TEXT DEFAULT '#22c55e',
  order_summary_highlight_text TEXT DEFAULT 'Economize com o frete grátis!',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.store_config ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage store config" 
ON public.store_config 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE profiles.user_id = auth.uid() 
  AND profiles.role IN ('admin', 'super_admin')
));

CREATE POLICY "Anyone can view active store config" 
ON public.store_config 
FOR SELECT 
USING (active = true);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_store_config_updated_at
BEFORE UPDATE ON public.store_config
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default configuration
INSERT INTO public.store_config (id) 
VALUES (gen_random_uuid());