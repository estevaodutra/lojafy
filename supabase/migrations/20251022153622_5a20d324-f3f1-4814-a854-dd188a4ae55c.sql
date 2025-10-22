-- Registrar perguntas pendentes dos chats existentes
INSERT INTO ai_pending_questions (
  question,
  status,
  asked_count,
  ticket_id,
  user_role,
  keywords,
  first_asked_at,
  last_asked_at,
  similar_questions
)
SELECT 
  base_question,
  'pending' as status,
  asked_count,
  first_ticket_id,
  user_role,
  string_to_array(
    regexp_replace(LOWER(base_question), '[^a-záàãâäéèêëíìîïóòõôöúùûüç ]', '', 'g'),
    ' '
  ) as keywords,
  first_asked_at,
  last_asked_at,
  similar_questions
FROM (
  SELECT 
    TRIM(cm.content) as base_question,
    COUNT(*) as asked_count,
    (array_agg(cm.ticket_id ORDER BY cm.created_at))[1] as first_ticket_id,
    COALESCE((SELECT role::text FROM profiles WHERE user_id = st.user_id LIMIT 1), 'customer') as user_role,
    MIN(cm.created_at) as first_asked_at,
    MAX(cm.created_at) as last_asked_at,
    COALESCE(
      jsonb_agg(
        DISTINCT jsonb_build_object(
          'question', cm.content,
          'asked_at', cm.created_at,
          'ticket_id', cm.ticket_id
        )
      ) FILTER (WHERE cm.content != TRIM(cm.content)),
      '[]'::jsonb
    ) as similar_questions
  FROM chat_messages cm
  JOIN support_tickets st ON st.id = cm.ticket_id
  WHERE cm.sender_type = 'customer'
    AND cm.created_at >= NOW() - INTERVAL '30 days'
    AND LENGTH(TRIM(cm.content)) > 15
    AND (
      cm.content ILIKE '%?%'
      OR cm.content ILIKE '%como%'
      OR cm.content ILIKE '%onde%'
      OR cm.content ILIKE '%qual%'
      OR cm.content ILIKE '%quando%'
      OR cm.content ILIKE '%preciso%'
      OR cm.content ILIKE '%quero saber%'
      OR cm.content ILIKE '%gostaria%'
      OR cm.content ILIKE '%pode%'
      OR cm.content ILIKE '%posso%'
      OR cm.content ILIKE '%tem%'
    )
    AND LOWER(cm.content) NOT SIMILAR TO '%(^|\s)(oi|olá|ola|bom dia|boa tarde|boa noite|obrigad[oa])(\s|$)%'
  GROUP BY TRIM(cm.content), st.user_id
  HAVING COUNT(*) >= 1
  ORDER BY COUNT(*) DESC, MIN(cm.created_at) DESC
  LIMIT 50
) grouped_questions
WHERE base_question IS NOT NULL 
  AND base_question != ''
  AND NOT EXISTS (
    SELECT 1 FROM ai_pending_questions 
    WHERE question = grouped_questions.base_question
  );