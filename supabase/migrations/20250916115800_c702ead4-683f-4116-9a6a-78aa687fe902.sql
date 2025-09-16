-- Create product_ranking table for external ranking management
CREATE TABLE public.product_ranking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES public.products(id) ON DELETE CASCADE,
  sku TEXT NOT NULL,
  position INTEGER NOT NULL,
  average_sales_value NUMERIC NOT NULL,
  average_profit NUMERIC NOT NULL, 
  daily_sales NUMERIC NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(sku),
  UNIQUE(position)
);

-- Enable RLS
ALTER TABLE public.product_ranking ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Admins can manage product ranking" 
ON public.product_ranking 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM profiles 
  WHERE user_id = auth.uid() 
  AND role IN ('admin', 'super_admin')
));

CREATE POLICY "Anyone can view product ranking for public data" 
ON public.product_ranking 
FOR SELECT 
USING (true);

-- Create trigger for updated_at
CREATE TRIGGER update_product_ranking_updated_at
BEFORE UPDATE ON public.product_ranking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Update API keys to include ranking permissions if not already set
UPDATE api_keys 
SET permissions = jsonb_set(
  permissions, 
  '{ranking}', 
  '{"read": true, "write": true}'::jsonb
) 
WHERE permissions IS NOT NULL 
AND NOT permissions ? 'ranking';