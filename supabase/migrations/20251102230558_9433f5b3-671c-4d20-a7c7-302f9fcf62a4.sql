-- Adicionar thumbnails e melhorar campos de descrição em módulos e aulas
ALTER TABLE course_modules 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

ALTER TABLE course_lessons 
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- Comentários explicativos
COMMENT ON COLUMN course_modules.thumbnail_url IS 'URL da imagem de capa do módulo para exibição em card (recomendado: 16:9, 1280x720px)';
COMMENT ON COLUMN course_lessons.thumbnail_url IS 'URL da imagem de capa da aula para exibição em card (recomendado: 16:9, 1280x720px)';