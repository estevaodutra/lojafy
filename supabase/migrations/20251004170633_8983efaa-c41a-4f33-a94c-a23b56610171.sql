-- Ativar benefício "Envio em 24hrs" (Truck) na homepage
UPDATE store_config 
SET benefits_config = jsonb_set(
  jsonb_set(
    benefits_config,
    '{0,active}',
    'true'::jsonb
  ),
  '{0,title}',
  '"Envio em 24hrs"'::jsonb
),
updated_at = now()
WHERE active = true;