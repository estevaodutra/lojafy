-- Create ai_standard_answers table for reusable named answers
CREATE TABLE IF NOT EXISTS public.ai_standard_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  answer TEXT NOT NULL,
  button_text TEXT,
  button_link TEXT,
  related_course_id UUID REFERENCES public.courses(id) ON DELETE SET NULL,
  related_module_id UUID REFERENCES public.course_modules(id) ON DELETE SET NULL,
  related_lesson_id UUID REFERENCES public.course_lessons(id) ON DELETE SET NULL,
  keywords TEXT[] DEFAULT '{}',
  usage_count INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Add standard_answer_id to ai_pending_questions
ALTER TABLE public.ai_pending_questions
ADD COLUMN IF NOT EXISTS standard_answer_id UUID REFERENCES public.ai_standard_answers(id) ON DELETE SET NULL;

-- Enable RLS
ALTER TABLE public.ai_standard_answers ENABLE ROW LEVEL SECURITY;

-- Policies for ai_standard_answers
CREATE POLICY "Super admins can manage standard answers"
ON public.ai_standard_answers
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  )
);

CREATE POLICY "Service role can access standard answers"
ON public.ai_standard_answers
FOR SELECT
USING (true);

-- Trigger for updated_at
CREATE TRIGGER update_ai_standard_answers_updated_at
BEFORE UPDATE ON public.ai_standard_answers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_standard_answers_name ON public.ai_standard_answers(name);
CREATE INDEX IF NOT EXISTS idx_standard_answers_active ON public.ai_standard_answers(active);
CREATE INDEX IF NOT EXISTS idx_pending_questions_standard_answer ON public.ai_pending_questions(standard_answer_id);