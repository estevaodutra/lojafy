-- O roteiro permanece configurável, mas a jornada real começa desligada.
ALTER TABLE public.onboarding_journey_config
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'new' CHECK (audience IN ('all', 'new')),
  ADD COLUMN IF NOT EXISTS activated_at timestamptz;

CREATE OR REPLACE FUNCTION public.set_onboarding_activation_time()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.enabled AND NEW.audience = 'new'
     AND (NOT OLD.enabled OR OLD.audience IS DISTINCT FROM NEW.audience) THEN
    NEW.activated_at := now();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_onboarding_activation_time ON public.onboarding_journey_config;
CREATE TRIGGER set_onboarding_activation_time
BEFORE UPDATE OF enabled, audience ON public.onboarding_journey_config
FOR EACH ROW EXECUTE FUNCTION public.set_onboarding_activation_time();
