-- Create storage bucket for answer attachments
INSERT INTO storage.buckets (id, name, public)
VALUES ('answer-attachments', 'answer-attachments', true)
ON CONFLICT (id) DO NOTHING;

-- RLS Policy: Admins can upload answer attachments
CREATE POLICY "Admins can upload answer attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'answer-attachments' 
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- RLS Policy: Public can view answer attachments
CREATE POLICY "Public can view answer attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'answer-attachments');

-- RLS Policy: Admins can delete their uploaded attachments
CREATE POLICY "Admins can delete answer attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'answer-attachments'
  AND EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.user_id = auth.uid()
    AND profiles.role IN ('admin', 'super_admin')
  )
);

-- Add attachments column to ai_pending_questions
ALTER TABLE ai_pending_questions
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add attachments column to ai_knowledge_base
ALTER TABLE ai_knowledge_base
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add attachments column to ai_standard_answers
ALTER TABLE ai_standard_answers
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT '[]'::jsonb;

-- Add comment to explain the structure
COMMENT ON COLUMN ai_pending_questions.attachments IS 'Array of attachment objects: [{ name: string, size: number, url: string, type: string }]';
COMMENT ON COLUMN ai_knowledge_base.attachments IS 'Array of attachment objects: [{ name: string, size: number, url: string, type: string }]';
COMMENT ON COLUMN ai_standard_answers.attachments IS 'Array of attachment objects: [{ name: string, size: number, url: string, type: string }]';