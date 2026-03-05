-- Fix: Allow anonymous users to read active features
DROP POLICY IF EXISTS "Features visíveis para todos" ON public.features;
CREATE POLICY "Features visíveis para todos"
  ON public.features
  FOR SELECT
  TO public
  USING (ativo = true);

-- Fix: Allow anonymous users to read active feature_produtos
DROP POLICY IF EXISTS "Anyone can read active feature_produtos" ON public.feature_produtos;
CREATE POLICY "Anyone can read active feature_produtos"
  ON public.feature_produtos
  FOR SELECT
  TO public
  USING (ativo = true);