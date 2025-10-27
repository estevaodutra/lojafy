-- Atualizar todas as API keys existentes para incluir permissão de pedidos
UPDATE api_keys 
SET permissions = jsonb_set(
  permissions,
  '{pedidos}',
  '{"read": true, "write": false}'::jsonb,
  true
)
WHERE NOT permissions ? 'pedidos';