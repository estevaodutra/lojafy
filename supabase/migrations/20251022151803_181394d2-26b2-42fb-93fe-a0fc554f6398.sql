-- Drop trigger first, then recreate function with correct search_path
DROP TRIGGER IF EXISTS update_pending_questions_updated_at ON ai_pending_questions;
DROP FUNCTION IF EXISTS update_pending_questions_updated_at();

CREATE OR REPLACE FUNCTION update_pending_questions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Recreate trigger
CREATE TRIGGER update_pending_questions_updated_at
BEFORE UPDATE ON ai_pending_questions
FOR EACH ROW
EXECUTE FUNCTION update_pending_questions_updated_at();