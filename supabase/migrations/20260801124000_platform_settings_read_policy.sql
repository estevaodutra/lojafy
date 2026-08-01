-- 20260801124000_platform_settings_read_policy.sql
-- Habilita a leitura pública (SELECT) na tabela platform_settings para que fornecedores, 
-- afiliados e a loja pública consigam ler as taxas e calcular a precificação corretamente.

DROP POLICY IF EXISTS "Anyone can view platform settings" ON public.platform_settings;
CREATE POLICY "Anyone can view platform settings" ON public.platform_settings
  FOR SELECT USING (true);
