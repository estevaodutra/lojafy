-- Update the editable route and existing partner snapshots without resetting progress.
CREATE OR REPLACE FUNCTION public.update_onboarding_step_content(p_steps jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(jsonb_agg(
    CASE item->>'id'
      WHEN 'join-group' THEN item || jsonb_build_object(
        'description', 'Abra o convite do seu grupo e confirme sua entrada.',
        'completion_criteria', 'Entrada confirmada pelo parceiro.'
      )
      WHEN 'import-top10' THEN item || jsonb_build_object(
        'title', 'Agora vamos importar Top Produtos',
        'description', 'Nós já separamos uma lista com os produtos mais vendidos da plataforma para subir na sua conta'
      )
      WHEN 'ml-address-lesson' THEN item || jsonb_build_object(
        'title', 'Configurar endereço no Mercado Livre',
        'description', 'Assista à aula e cadastre o endereço do nosso estoque na sua conta do Mercado Livre. Essa configuração permite que nossa equipe prepare e envie os pedidos diretamente aos seus clientes.'
      )
      ELSE item
    END ORDER BY position
  ), '[]'::jsonb)
  FROM jsonb_array_elements(p_steps) WITH ORDINALITY AS step(item, position);
$$;

UPDATE public.onboarding_journey_config
SET steps = public.update_onboarding_step_content(steps)
WHERE id = 1;

UPDATE public.partner_onboarding_journey
SET steps = public.update_onboarding_step_content(steps)
WHERE steps @> '[{"id":"import-top10"}]'::jsonb;

DROP FUNCTION public.update_onboarding_step_content(jsonb);
