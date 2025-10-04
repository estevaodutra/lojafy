-- Adicionar coluna benefits_config na tabela reseller_stores
ALTER TABLE reseller_stores 
ADD COLUMN IF NOT EXISTS benefits_config jsonb DEFAULT '[
  {
    "id": "frete",
    "icon": "Truck",
    "color": "#22c55e",
    "title": "Frete Grátis",
    "active": true,
    "position": 1,
    "description": "Acima de R$ 199"
  },
  {
    "id": "garantia",
    "icon": "Shield",
    "color": "#10b981",
    "title": "Garantia",
    "active": true,
    "position": 2,
    "description": "Produtos garantidos"
  },
  {
    "id": "troca",
    "icon": "RefreshCw",
    "color": "#f59e0b",
    "title": "Troca Fácil",
    "active": true,
    "position": 3,
    "description": "30 dias para trocar"
  },
  {
    "id": "pagamento",
    "icon": "CreditCard",
    "color": "#3b82f6",
    "title": "Pagamento Seguro",
    "active": true,
    "position": 4,
    "description": "Ambiente protegido"
  }
]'::jsonb;