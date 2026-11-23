-- Keep existing partner journeys and the editable route in sync with the customer-facing name.
CREATE OR REPLACE FUNCTION public.rename_onboarding_group_step(p_steps jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    jsonb_agg(
      CASE WHEN item->>'id' = 'qualify-group' THEN
        item || jsonb_build_object(
          'title', 'Criar Grupo',
          'description', 'Depois de validar seus dados pessoais, vamos criar seu grupo e disponibilizar o convite.',
          'completion_criteria', 'Link de convite disponível para entrar no grupo.'
        )
      ELSE item END
      ORDER BY position
    ),
    '[]'::jsonb
  )
  FROM jsonb_array_elements(p_steps) WITH ORDINALITY AS step(item, position);
$$;

UPDATE public.onboarding_journey_config
SET steps = public.rename_onboarding_group_step(steps)
WHERE steps @> '[{"id":"qualify-group"}]'::jsonb;

UPDATE public.partner_onboarding_journey
SET steps = public.rename_onboarding_group_step(steps)
WHERE steps @> '[{"id":"qualify-group"}]'::jsonb;

DROP FUNCTION public.rename_onboarding_group_step(jsonb);
