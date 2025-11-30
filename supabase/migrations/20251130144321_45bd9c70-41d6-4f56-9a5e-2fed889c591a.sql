-- Create table for reseller onboarding progress
CREATE TABLE IF NOT EXISTS public.reseller_onboarding_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  step_id TEXT NOT NULL,
  completed_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, step_id)
);

-- Enable RLS
ALTER TABLE public.reseller_onboarding_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Users can manage their own onboarding progress
CREATE POLICY "Users can manage their own onboarding progress"
ON public.reseller_onboarding_progress FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Index for faster lookups
CREATE INDEX IF NOT EXISTS idx_reseller_onboarding_progress_user_id 
ON public.reseller_onboarding_progress(user_id);