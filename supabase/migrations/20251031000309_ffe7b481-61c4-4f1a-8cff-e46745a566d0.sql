-- Adicionar related_lesson_id em ai_pending_questions
ALTER TABLE ai_pending_questions
ADD COLUMN related_lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL;

-- Adicionar related_lesson_id em ai_knowledge_base
ALTER TABLE ai_knowledge_base
ADD COLUMN related_lesson_id UUID REFERENCES course_lessons(id) ON DELETE SET NULL;

-- Criar índices para performance
CREATE INDEX idx_pending_questions_lesson ON ai_pending_questions(related_lesson_id);
CREATE INDEX idx_knowledge_base_lesson ON ai_knowledge_base(related_lesson_id);