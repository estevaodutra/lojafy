-- Duplicar benefício "Troca Fácil" na homepage
UPDATE store_config 
SET benefits_config = benefits_config || 
  '[{
    "id": "troca-2",
    "icon": "RefreshCw",
    "color": "#0ea5e9",
    "title": "Troca Fácil",
    "active": true,
    "position": 5,
    "description": "30 dias para trocar"
  }]'::jsonb,
  updated_at = now()
WHERE active = true;