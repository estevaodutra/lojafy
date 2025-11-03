-- Create ai_corrections table for tracking AI response corrections
CREATE TABLE IF NOT EXISTS public.ai_corrections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  original_message_id UUID REFERENCES public.chat_messages(id) ON DELETE CASCADE,
  customer_question TEXT NOT NULL,
  ai_response TEXT NOT NULL,
  correct_response TEXT NOT NULL,
  corrected_by UUID REFERENCES auth.users(id),
  created_standard_answer_id UUID REFERENCES public.ai_standard_answers(id),
  created_knowledge_id UUID REFERENCES public.ai_knowledge_base(id),
  keywords TEXT[],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.ai_corrections ENABLE ROW LEVEL SECURITY;

-- Policy: Only admins can view and manage corrections
CREATE POLICY "Admins can manage corrections"
ON public.ai_corrections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  )
);

-- Indexes for performance
CREATE INDEX idx_corrections_ticket ON public.ai_corrections(ticket_id);
CREATE INDEX idx_corrections_message ON public.ai_corrections(original_message_id);
CREATE INDEX idx_corrections_created_at ON public.ai_corrections(created_at DESC);

-- Trigger to update updated_at
CREATE TRIGGER update_ai_corrections_updated_at
  BEFORE UPDATE ON public.ai_corrections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();