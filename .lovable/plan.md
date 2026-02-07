

# Incluir Credenciais OAuth no Endpoint `/products/unpublished`

## Resumo

Modificar o endpoint `GET /products/unpublished` para tambem retornar as credenciais OAuth do Mercado Livre (da tabela `mercadolivre_integrations`), permitindo que automacoes como n8n recebam tudo em uma unica chamada: produto + token de acesso.

## Logica

- Se o parametro `user_id` foi informado: buscar a integracao ativa daquele usuario
- Se `user_id` nao foi informado: buscar qualquer integracao ativa do marketplace
- Se nao houver integracao ativa, retornar erro 404 informando que nenhuma integracao esta configurada

## Alteracoes

### 1. Edge Function (`supabase/functions/lojafy-integra/index.ts`)

No handler `GET /products/unpublished`, apos buscar o produto, adicionar uma query na tabela `mercadolivre_integrations` para trazer as credenciais OAuth:

```typescript
// Buscar credenciais OAuth ativas
let oauthQuery = supabase
  .from('mercadolivre_integrations')
  .select('user_id, access_token, token_type, refresh_token, expires_at, ml_user_id, is_active')
  .eq('is_active', true);

if (filterUserId) {
  oauthQuery = oauthQuery.eq('user_id', filterUserId);
}

const { data: oauth, error: oauthError } = await oauthQuery.limit(1).maybeSingle();
```

O objeto `oauth` sera incluido na resposta junto com o produto:

```json
{
  "success": true,
  "data": { "id": "...", "name": "..." },
  "marketplace": "mercadolivre",
  "oauth": {
    "user_id": "uuid-do-usuario",
    "access_token": "APP_USR-123...",
    "token_type": "Bearer",
    "refresh_token": "TG-abc...",
    "expires_at": "2026-02-08T12:00:00Z",
    "ml_user_id": 123456789
  },
  "remaining": "Existem mais produtos pendentes"
}
```

Se nenhuma integracao ativa for encontrada, `oauth` sera `null` na resposta (sem bloquear o retorno do produto).

### 2. Documentacao (`src/data/apiEndpointsData.ts`)

Atualizar o endpoint "Buscar Produto Nao Publicado" no array `integraProductsEndpoints`:

- Atualizar a `description` para mencionar que retorna credenciais OAuth
- Atualizar o `responseExample` para incluir o campo `oauth` com exemplo realista
- Adicionar um `errorExample` para o caso de integracao nao encontrada (retorna produto com `oauth: null`)

### Arquivos Modificados

1. **`supabase/functions/lojafy-integra/index.ts`** - Adicionar query em `mercadolivre_integrations` e incluir `oauth` na resposta
2. **`src/data/apiEndpointsData.ts`** - Atualizar documentacao do endpoint com novo campo `oauth`

## Resposta Final do Endpoint

```json
{
  "success": true,
  "data": {
    "id": "uuid-produto",
    "name": "Mini Máquina de Waffles",
    "price": 24.90,
    "sku": "PROD-001",
    "gtin_ean13": "7891234567890",
    "main_image_url": "https://exemplo.com/imagem.jpg",
    "brand": "Genérica",
    "stock_quantity": 50,
    "category_id": "uuid-categoria"
  },
  "marketplace": "mercadolivre",
  "oauth": {
    "user_id": "uuid-do-usuario",
    "access_token": "APP_USR-123456-abcdef",
    "token_type": "Bearer",
    "refresh_token": "TG-abc123-xyz",
    "expires_at": "2026-02-08T12:00:00.000Z",
    "ml_user_id": 123456789
  },
  "remaining": "Existem mais produtos pendentes"
}
```

Quando nao ha produto pendente:
```json
{
  "success": true,
  "data": null,
  "marketplace": "mercadolivre",
  "oauth": { "..." },
  "remaining": "Todos os produtos já estão cadastrados"
}
```

