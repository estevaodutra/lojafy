-- Cada parceiro recebe uma cópia do roteiro vigente ao iniciar a jornada.
-- Escritas são feitas somente pela Edge Function autenticada (service role).
CREATE TABLE IF NOT EXISTS public.partner_onboarding_journey (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  steps jsonb NOT NULL CHECK (jsonb_typeof(steps) = 'array'),
  step_index integer NOT NULL DEFAULT 0 CHECK (step_index >= 0),
  request_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
  group_status text NOT NULL DEFAULT 'idle' CHECK (group_status IN ('idle', 'requested', 'ready')),
  group_id text,
  group_title text,
  group_description text,
  group_photo_url text,
  group_invite_url text,
  group_created_at timestamptz,
  group_joined_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.partner_onboarding_journey ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Partner can read own onboarding journey" ON public.partner_onboarding_journey;
CREATE POLICY "Partner can read own onboarding journey"
ON public.partner_onboarding_journey FOR SELECT TO authenticated
USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'super_admin'));

DROP TRIGGER IF EXISTS update_partner_onboarding_journey_updated_at ON public.partner_onboarding_journey;
CREATE TRIGGER update_partner_onboarding_journey_updated_at
BEFORE UPDATE ON public.partner_onboarding_journey
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.start_partner_onboarding_journey()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.role = 'reseller' THEN
    INSERT INTO public.partner_onboarding_journey (user_id, steps)
    SELECT NEW.user_id, config.steps
    FROM public.onboarding_journey_config AS config WHERE config.id = 1
    ON CONFLICT (user_id) DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS start_partner_onboarding_after_profile ON public.profiles;
CREATE TRIGGER start_partner_onboarding_after_profile
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.start_partner_onboarding_journey();

-- Usuários que já eram parceiros recebem a jornada ao aplicar a migration.
INSERT INTO public.partner_onboarding_journey (user_id, steps)
SELECT profile.user_id, config.steps
FROM public.profiles AS profile
CROSS JOIN public.onboarding_journey_config AS config
WHERE profile.role = 'reseller' AND config.id = 1
ON CONFLICT (user_id) DO NOTHING;
