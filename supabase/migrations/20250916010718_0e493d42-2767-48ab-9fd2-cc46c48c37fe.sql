-- Update API keys permissions to include ranking endpoints
UPDATE api_keys 
SET permissions = jsonb_set(
  permissions, 
  '{ranking}', 
  '{"read": true, "write": true}'::jsonb
) 
WHERE permissions IS NOT NULL;