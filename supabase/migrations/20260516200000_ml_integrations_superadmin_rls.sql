-- Permite que super_admin veja todas as integrações ML (necessário para o painel Marketplaces)
CREATE POLICY "Super admins can view all integrations"
  ON public.mercadolivre_integrations FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));
