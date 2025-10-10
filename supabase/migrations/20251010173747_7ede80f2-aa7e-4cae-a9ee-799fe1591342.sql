-- Update new_lesson template to include LESSON_ID in action URL
UPDATE notification_templates 
SET 
  action_url_template = '/customer/courses/{COURSE_ID}/lesson/{LESSON_ID}',
  action_label = 'Assistir Aula'
WHERE trigger_type = 'new_lesson';