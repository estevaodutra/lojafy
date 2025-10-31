-- Add related_course_id and related_module_id to ai_pending_questions
ALTER TABLE ai_pending_questions
ADD COLUMN related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN related_module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL;

-- Add related_course_id and related_module_id to ai_knowledge_base
ALTER TABLE ai_knowledge_base
ADD COLUMN related_course_id UUID REFERENCES courses(id) ON DELETE SET NULL,
ADD COLUMN related_module_id UUID REFERENCES course_modules(id) ON DELETE SET NULL;

-- Create indexes for performance
CREATE INDEX idx_pending_questions_course ON ai_pending_questions(related_course_id);
CREATE INDEX idx_pending_questions_module ON ai_pending_questions(related_module_id);
CREATE INDEX idx_knowledge_base_course ON ai_knowledge_base(related_course_id);
CREATE INDEX idx_knowledge_base_module ON ai_knowledge_base(related_module_id);