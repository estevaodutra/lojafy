-- Alterar ícone do benefício duplicado para Shield
UPDATE store_config 
SET benefits_config = jsonb_set(
  benefits_config,
  '{3}',
  jsonb_build_object(
    'id', 'troca-2',
    'icon', 'Shield',
    'color', '#10b981',
    'title', 'Garantia',
    'active', true,
    'position', 5,
    'description', 'Produtos garantidos'
  )
)
WHERE active = true;