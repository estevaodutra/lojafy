-- Create api_keys table for managing API keys
CREATE TABLE public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  api_key TEXT NOT NULL UNIQUE,
  permissions JSONB DEFAULT '{"produtos": {"read": true, "write": true}, "categorias": {"read": true, "write": true}}'::jsonb,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_used TIMESTAMP WITH TIME ZONE,
  expires_at TIMESTAMP WITH TIME ZONE,
  CONSTRAINT api_keys_user_id_key_name_unique UNIQUE (user_id, key_name)
);

-- Enable Row Level Security
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Create policies for api_keys
CREATE POLICY "Admins can manage their own API keys" 
ON public.api_keys 
FOR ALL 
USING (
  user_id = auth.uid() AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.user_id = auth.uid() 
    AND profiles.role = ANY(ARRAY['admin'::app_role, 'super_admin'::app_role])
  )
);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_api_keys_updated_at
BEFORE UPDATE ON public.api_keys
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'sk_' || encode(gen_random_bytes(32), 'hex');
END;
$$;