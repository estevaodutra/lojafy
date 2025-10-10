-- Fix new_lesson notification URL to use correct route with query parameter
UPDATE notification_templates 
SET 
  action_url_template = '/minha-conta/aulas/{COURSE_ID}?lesson={LESSON_ID}',
  action_label = 'Assistir Aula',
  updated_at = now()
WHERE trigger_type = 'new_lesson';