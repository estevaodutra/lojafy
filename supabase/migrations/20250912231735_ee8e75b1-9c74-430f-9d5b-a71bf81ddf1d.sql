-- Create banners table
CREATE TABLE public.banners (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subtitle TEXT,
  description TEXT,
  image_url TEXT NOT NULL,
  button_text TEXT,
  button_link TEXT,
  position INTEGER NOT NULL DEFAULT 1,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.banners ENABLE ROW LEVEL SECURITY;

-- Create policies for banners
CREATE POLICY "Anyone can view active banners"
ON public.banners
FOR SELECT
USING (active = true);

CREATE POLICY "Admins can manage banners"
ON public.banners
FOR ALL
USING (EXISTS (
  SELECT 1 FROM profiles
  WHERE profiles.user_id = auth.uid()
  AND profiles.role = ANY (ARRAY['admin'::app_role, 'super_admin'::app_role])
));

-- Create trigger for timestamps
CREATE TRIGGER update_banners_updated_at
BEFORE UPDATE ON public.banners
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add constraint for position (max 5 banners)
ALTER TABLE public.banners 
ADD CONSTRAINT check_position_range 
CHECK (position >= 1 AND position <= 5);

-- Add unique constraint for position among active banners
CREATE UNIQUE INDEX unique_active_banner_position 
ON public.banners (position) 
WHERE active = true;