

## Simplificar tabela `product_marketplace_data` para formato JSONB

### Contexto
A tabela `product_marketplace_data` ja existe com muitas colunas individuais (title, description, price, attributes, variations, stock_quantity, images, etc.). Esta vazia (0 registros), entao a migracao e segura. Nenhum componente frontend referencia a tabela diretamente - apenas a Edge Function `lojafy-integra`.

### Etapa 1: Migracao SQL

Dropar a tabela atual e recriar com a estrutura simplificada:

- **Remover** colunas individuais: title, description, price, promotional_price, category_id, category_name, attributes, variations, stock_quantity, images, status, listing_type, last_sync_status, sync_error_log, marketplace_metadata, user_id
- **Adicionar** campo `data JSONB NOT NULL DEFAULT '{}'` para armazenar todos os dados especificos do marketplace
- **Manter** campos de controle: listing_id, listing_url, listing_status, published_at, last_sync_at
- **Criar** indices para product_id, marketplace, listing_id, listing_status
- **Criar** views `v_products_with_marketplace` e `v_products_mercadolivre`

### Etapa 2: Reescrever Edge Function `lojafy-integra`

Simplificar drasticamente a Edge Function para trabalhar com o campo `data` JSONB:

- **POST /products**: Recebe product_id, marketplace, listing_id/url/status (campos de controle) e todo o resto vai para o campo `data`. Usa upsert com onConflict `product_id,marketplace`
- **GET /products**: Listar com filtros (product_id, marketplace, listing_status) com join no produto base
- **GET /products/:id**: Buscar por ID com join no produto base
- **GET /products/by-product/:productId**: Manter endpoint existente
- **GET /products/unpublished**: Manter logica existente (buscar produto nao publicado + OAuth)
- **PUT /products/:id**: Atualizar campos de controle e/ou campo data
- **DELETE /products/:id**: Remover registro
- **GET /mercadolivre/expiring-tokens**: Manter endpoint existente

### Etapa 3: Atualizar documentacao API

Atualizar os exemplos e descricoes dos endpoints em `src/data/apiEndpointsData.ts` para refletir o novo formato com campo `data` JSONB.

### Detalhes tecnicos

**Estrutura final da tabela:**

```text
product_marketplace_data
+------------------+-------------+----------------------------------+
| Coluna           | Tipo        | Descricao                        |
+------------------+-------------+----------------------------------+
| id               | UUID PK     | Identificador unico              |
| product_id       | UUID FK     | Referencia ao produto base       |
| marketplace      | TEXT        | mercadolivre, shopee, amazon...  |
| data             | JSONB       | Dados especificos do marketplace |
| listing_id       | TEXT        | ID do anuncio (MLB123456789)     |
| listing_url      | TEXT        | URL publica do anuncio           |
| listing_status   | TEXT        | draft/pending/active/paused/etc  |
| created_at       | TIMESTAMPTZ | Criacao                          |
| updated_at       | TIMESTAMPTZ | Atualizacao                      |
| published_at     | TIMESTAMPTZ | Quando foi publicado             |
| last_sync_at     | TIMESTAMPTZ | Ultima sincronizacao             |
+------------------+-------------+----------------------------------+
| UNIQUE(product_id, marketplace)                                    |
+--------------------------------------------------------------------+
```

**Logica do POST simplificada:**
- Campos de controle (product_id, marketplace, listing_id, listing_url, listing_status) sao extraidos do body
- Todo o restante do body vai automaticamente para o campo `data`
- Usa upsert para criar ou atualizar automaticamente

