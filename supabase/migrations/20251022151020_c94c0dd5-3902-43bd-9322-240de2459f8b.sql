-- Create table for pending questions
CREATE TABLE ai_pending_questions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question TEXT NOT NULL,
  answer TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'answered')),
  asked_count INTEGER DEFAULT 1,
  similar_questions JSONB DEFAULT '[]'::jsonb,
  first_asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  answered_at TIMESTAMP WITH TIME ZONE,
  answered_by UUID REFERENCES auth.users(id),
  last_asked_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  ticket_id UUID REFERENCES support_tickets(id),
  user_role TEXT,
  keywords TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE ai_pending_questions ENABLE ROW LEVEL SECURITY;

-- Super admins can manage all questions
CREATE POLICY "Super admins can manage pending questions"
ON ai_pending_questions
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role = 'super_admin'
  )
);

-- Service role can insert questions
CREATE POLICY "Service role can insert questions"
ON ai_pending_questions
FOR INSERT
WITH CHECK (true);

-- Service role can update questions
CREATE POLICY "Service role can update questions"
ON ai_pending_questions
FOR UPDATE
USING (true);

-- Service role can select questions
CREATE POLICY "Service role can select questions"
ON ai_pending_questions
FOR SELECT
USING (true);

-- Create index for faster searches
CREATE INDEX idx_pending_questions_status ON ai_pending_questions(status);
CREATE INDEX idx_pending_questions_keywords ON ai_pending_questions USING GIN(keywords);
CREATE INDEX idx_pending_questions_asked_count ON ai_pending_questions(asked_count DESC);

-- Function to update updated_at
CREATE OR REPLACE FUNCTION update_pending_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
CREATE TRIGGER update_pending_questions_updated_at
BEFORE UPDATE ON ai_pending_questions
FOR EACH ROW
EXECUTE FUNCTION update_pending_questions_updated_at();