

# Plano: Enviar Dados Completos do Produto e Integração para o Webhook

## Resumo

Modificar o hook `useMercadoLivreIntegration` para que, ao publicar um anúncio, envie ao webhook todas as informações do produto e os dados da integração (incluindo access_token).

---

## Dados a Serem Enviados

### Informações do Produto (tabela `products`)
- `id`, `name`, `description`, `price`, `original_price`, `cost_price`
- `sku`, `gtin_ean13`, `brand`, `badge`
- `stock_quantity`, `min_stock_level`
- `weight`, `width`, `height`, `length`
- `main_image_url`, `images[]`
- `category_id`, `subcategory_id`
- `specifications` (JSON)
- `active`, `featured`, `high_rotation`

### Informações da Integração (tabela `mercadolivre_integrations`)
- `access_token`
- `refresh_token`
- `token_type`
- `expires_at`
- `ml_user_id`
- `scope`

---

## Alterações Necessárias

### Arquivo: `src/hooks/useMercadoLivreIntegration.ts`

1. **Buscar dados completos do produto** antes de enviar ao webhook
2. **Buscar dados da integração** (incluindo access_token) antes de enviar
3. **Enviar payload completo** para o webhook

---

## Código Atual vs Novo

**Antes (linhas 90-101):**
```typescript
const response = await fetch(
  'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product_id: productId,
      user_id: user.id
    })
  }
);
```

**Depois:**
```typescript
// 1. Buscar dados completos do produto
const { data: productData, error: productError } = await supabase
  .from('products')
  .select(`
    *,
    category:categories(id, name),
    subcategory:subcategories(id, name)
  `)
  .eq('id', productId)
  .single();

if (productError || !productData) {
  throw new Error('Produto não encontrado');
}

// 2. Buscar dados da integração (incluindo access_token)
const { data: integrationData, error: integrationError } = await supabase
  .from('mercadolivre_integrations')
  .select('*')
  .eq('user_id', user.id)
  .eq('is_active', true)
  .single();

if (integrationError || !integrationData) {
  throw new Error('Integração Mercado Livre não encontrada');
}

// 3. Enviar payload completo ao webhook
const response = await fetch(
  'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Advertise',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      product: productData,
      integration: {
        access_token: integrationData.access_token,
        refresh_token: integrationData.refresh_token,
        token_type: integrationData.token_type,
        expires_at: integrationData.expires_at,
        ml_user_id: integrationData.ml_user_id,
        scope: integrationData.scope
      },
      user_id: user.id
    })
  }
);
```

---

## Estrutura do Payload Enviado ao Webhook

```json
{
  "product": {
    "id": "uuid",
    "name": "Nome do Produto",
    "description": "Descrição completa...",
    "price": 199.90,
    "original_price": 249.90,
    "cost_price": 100.00,
    "sku": "SKU-001",
    "gtin_ean13": "7891234567890",
    "brand": "Marca",
    "stock_quantity": 50,
    "weight": 0.5,
    "width": 10,
    "height": 5,
    "length": 15,
    "main_image_url": "https://...",
    "images": ["url1", "url2", "url3"],
    "specifications": { ... },
    "category": { "id": "...", "name": "Categoria" },
    "subcategory": { "id": "...", "name": "Subcategoria" }
  },
  "integration": {
    "access_token": "APP_USR-xxx...",
    "refresh_token": "TG-xxx...",
    "token_type": "Bearer",
    "expires_at": "2025-02-20T10:00:00Z",
    "ml_user_id": 123456789,
    "scope": "read write offline_access"
  },
  "user_id": "uuid-do-usuario"
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useMercadoLivreIntegration.ts` | Buscar produto completo + dados integração antes de enviar ao webhook |

---

## Resultado Esperado

1. Webhook recebe TODOS os dados do produto (nome, descrição, preço, imagens, dimensões, etc.)
2. Webhook recebe dados da integração incluindo access_token para autenticar na API do ML
3. n8n pode criar o anúncio completo sem precisar fazer queries adicionais

