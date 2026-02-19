

## Reestruturar `product_marketplace_data` para Body Validado Completo

### Resumo

Substituir o campo `data` (JSONB generico) por `validated_body` (body completo ja validado pelo ML), adicionando campos de controle de validacao (`is_validated`, `validated_at`). Atualizar a Edge Function, o hook de publicacao e a documentacao da API.

### 1. Migracao SQL

Alterar a tabela `product_marketplace_data`:
- Renomear coluna `data` para `validated_body`
- Adicionar coluna `is_validated` (BOOLEAN, default false)
- Adicionar coluna `validated_at` (TIMESTAMPTZ)
- Adicionar indice em `is_validated`
- Atualizar as views `v_products_with_marketplace` e `v_products_mercadolivre`

```text
-- Renomear data -> validated_body
ALTER TABLE product_marketplace_data RENAME COLUMN data TO validated_body;

-- Novos campos de validacao
ALTER TABLE product_marketplace_data ADD COLUMN is_validated BOOLEAN DEFAULT false;
ALTER TABLE product_marketplace_data ADD COLUMN validated_at TIMESTAMPTZ;

-- Indice
CREATE INDEX IF NOT EXISTS idx_pmd_is_validated ON product_marketplace_data(is_validated);

-- Atualizar views
CREATE OR REPLACE VIEW v_products_with_marketplace AS
SELECT 
  p.id AS product_id,
  p.name AS product_name,
  p.price AS lojafy_price,
  p.stock_quantity AS lojafy_stock,
  p.images AS lojafy_images,
  p.attributes AS lojafy_attributes,
  pmd.id AS marketplace_data_id,
  pmd.marketplace,
  pmd.validated_body,
  pmd.is_validated,
  pmd.validated_at,
  pmd.validated_body->>'category_id' AS ml_category_id,
  pmd.validated_body->>'title' AS ml_title,
  pmd.listing_id,
  pmd.listing_url,
  pmd.listing_status,
  pmd.published_at,
  pmd.last_sync_at
FROM products p
LEFT JOIN product_marketplace_data pmd ON p.id = pmd.product_id;

CREATE OR REPLACE VIEW v_products_mercadolivre AS
SELECT * FROM v_products_with_marketplace
WHERE marketplace = 'mercadolivre' OR marketplace IS NULL;
```

### 2. Edge Function `lojafy-integra/index.ts`

Reescrever os endpoints de products para a nova estrutura:

**POST /products** - Recebe `validated_body` diretamente (body completo validado):
- Campos obrigatorios: `product_id`, `marketplace`, `validated_body`
- Upsert com `is_validated` e `validated_at`
- Remove constantes `CONTROL_FIELDS`, `FORBIDDEN_DATA_FIELDS`, `VALID_LISTING_TYPES`

**GET /products/:id/publish-body** - Novo endpoint:
- Recebe `?price=X&quantity=Y` como query params
- Retorna o `validated_body` com `price` e `available_quantity` substituidos
- Valida que `is_validated = true`

**GET /products** - Atualizado:
- Adiciona filtro `is_validated`
- Troca `data` por `validated_body` nos selects

**PUT /products/:id** - Atualizado:
- Aceita `validated_body` (atualiza `is_validated` e `validated_at` junto)
- Troca referencia de `data` por `validated_body`

**Endpoints mantidos sem alteracao significativa:** GET /:id, GET /by-product/:productId, GET /unpublished, DELETE /:id, GET /mercadolivre/expiring-tokens

### 3. Hook `useMercadoLivreIntegration.ts`

Atualizar o payload de publicacao:
- Trocar `marketplace_data: marketplaceData?.data` por `marketplace_data: marketplaceData?.validated_body`
- Adicionar `is_validated: marketplaceData?.is_validated` no payload

### 4. Documentacao API `src/data/apiEndpointsData.ts`

Atualizar os endpoints da secao `integraProductsEndpoints`:
- POST /products: mudar body de campos dispersos para `validated_body`
- GET /products: trocar `data` por `validated_body` nos exemplos
- GET /:id: idem
- GET /by-product/:productId: idem
- PUT /:id: adicionar `validated_body` como campo atualizavel
- Adicionar novo endpoint GET /:id/publish-body

### Secao Tecnica

**Arquivos modificados:**
1. Nova migracao SQL (via migration tool)
2. `supabase/functions/lojafy-integra/index.ts` - Edge Function completa
3. `src/hooks/useMercadoLivreIntegration.ts` - Troca `data` por `validated_body`
4. `src/data/apiEndpointsData.ts` - Documentacao da API

**Dados existentes:** A coluna `data` sera renomeada para `validated_body`, preservando todos os dados ja salvos. Registros existentes terao `is_validated = false` por padrao (podem ser marcados como validados via PUT).

**Compatibilidade:** O n8n devera ser atualizado para enviar `validated_body` ao inves de campos soltos. O novo endpoint `publish-body` facilita a obtencao do body pronto com preco/quantidade substituidos.

