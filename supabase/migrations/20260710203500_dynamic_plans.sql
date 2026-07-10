-- Convert subscription_plan to TEXT
ALTER TABLE public.profiles 
  ALTER COLUMN subscription_plan TYPE TEXT 
  USING subscription_plan::text;

-- Drop the enum type
DROP TYPE IF EXISTS public.subscription_plan CASCADE;

-- Insert default plans if they don't exist
INSERT INTO public.plans (nome, slug, descricao, preco_mensal, preco_anual, preco_vitalicio, cor, icone, destaque, ativo, ordem)
SELECT 'Free', 'free', 'Plano gratuito básico', 0, 0, 0, '#94a3b8', 'star', false, true, 1
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE slug = 'free');

INSERT INTO public.plans (nome, slug, descricao, preco_mensal, preco_anual, preco_vitalicio, cor, icone, destaque, ativo, ordem)
SELECT 'Premium', 'premium', 'Plano completo com todos os recursos', 49.90, 499.00, 999.00, '#eab308', 'crown', true, true, 2
WHERE NOT EXISTS (SELECT 1 FROM public.plans WHERE slug = 'premium');
