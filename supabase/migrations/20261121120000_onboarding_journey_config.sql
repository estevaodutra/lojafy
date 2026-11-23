-- Roteiro administrativo da jornada. A execução por parceiro será armazenada separadamente.
CREATE TABLE public.onboarding_journey_config (
  id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  qualify_trigger_url text NOT NULL DEFAULT '',
  steps jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(steps) = 'array'),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.onboarding_journey_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage onboarding journey"
ON public.onboarding_journey_config FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'))
WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TRIGGER update_onboarding_journey_config_updated_at
BEFORE UPDATE ON public.onboarding_journey_config
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.onboarding_journey_config (id, qualify_trigger_url, steps)
VALUES (
  1,
  'https://qualify-supabase.d2x.site/functions/v1/trigger-sequence/63a920e2-8a47-452f-a17f-524926790973',
  $steps$[
    {"id":"personal-data","title":"Completar dados pessoais","description":"Preencher e validar nome, telefone e CPF na Lojafy.","owner":"Parceiro","completion_criteria":"Dados obrigatórios completos e válidos no perfil.","reference_url":""},
    {"id":"qualify-group","title":"Criar Grupo","description":"Depois de validar seus dados pessoais, vamos criar seu grupo e disponibilizar o convite.","owner":"Sistema","completion_criteria":"Link de convite disponível para entrar no grupo.","reference_url":""},
    {"id":"join-group","title":"Entrar no grupo","description":"Abra o convite do seu grupo e confirme sua entrada.","owner":"Parceiro","completion_criteria":"Entrada confirmada pelo parceiro.","reference_url":""},
    {"id":"connect-ml","title":"Integrar Mercado Livre","description":"Conectar a conta do Mercado Livre à Lojafy.","owner":"Parceiro","completion_criteria":"Integração ativa confirmada na plataforma.","reference_url":""},
    {"id":"import-top10","title":"Agora vamos importar Top Produtos","description":"Nós já separamos uma lista com os produtos mais vendidos da plataforma para subir na sua conta","owner":"Parceiro","completion_criteria":"Produtos importados registrados na conta do parceiro.","reference_url":""},
    {"id":"publish-ml","title":"Publicar no Mercado Livre","description":"Publicar os produtos importados e acompanhar o resultado de cada anúncio.","owner":"Parceiro","completion_criteria":"Resultados de publicação registrados, incluindo eventuais erros.","reference_url":""},
    {"id":"ml-address-lesson","title":"Configurar endereço no Mercado Livre","description":"Assista à aula e cadastre o endereço do nosso estoque na sua conta do Mercado Livre. Essa configuração permite que nossa equipe prepare e envie os pedidos diretamente aos seus clientes.","owner":"Parceiro","completion_criteria":"Aula marcada como concluída.","reference_url":""}
  ]$steps$::jsonb
);
