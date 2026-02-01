
# Plano: Corrigir Payload do Webhook order.paid

## Problema Identificado

Analisando o payload enviado no teste do webhook `order.paid`, encontrei 3 problemas:

| Campo | Valor Atual | Valor Esperado |
|-------|-------------|----------------|
| `customer.email` | `"email@exemplo.com"` | Email real do cliente |
| `items` | `[]` (vazio) | Lista de produtos do pedido |
| `etiqueta` | Não existe | URL da etiqueta (shipping label) |

---

## Causas Raiz

### 1. Email não vem
O código atual tem comentário dizendo que não consegue acessar `auth.users`:
```typescript
// Can't access auth.users directly
email: customerEmail || 'email@exemplo.com',
```

**Mas existe a função** `get_users_with_email()` que já resolve isso! Esta função retorna dados de usuários incluindo o email da tabela `auth.users`.

### 2. Items vazio
O código busca uma coluna que não existe:
```typescript
.select(`product_name_snapshot`) // Esta coluna NÃO existe!
```

A estrutura real de `order_items`:
- `product_snapshot` (JSONB) - contém `name`, `price`, `sku`, etc.
- NÃO existe `product_name_snapshot`

### 3. Etiqueta não incluída
O sistema já tem a etiqueta salva na tabela `order_shipping_files`:
```
file_name: "Etiqueta Antonio.pdf"
file_path: "c40b90a5-.../order_c40b90a5-..._1769828430108.pdf"
```

Mas o código não busca nem inclui no payload. Como o bucket é privado, precisamos gerar uma URL assinada.

---

## Solução

### Arquivo a Modificar

`supabase/functions/dispatch-webhook/index.ts`

### Alterações na função `fetchLastPaidOrder()`

```text
ANTES:
├── Busca order
├── Busca profile (sem email)
├── customerEmail = null (sempre!)
├── Busca items com coluna inexistente
└── NÃO busca etiqueta

DEPOIS:
├── Busca order
├── Usa RPC get_users_with_email() para pegar email
├── Busca items com product_snapshot (JSONB)
├── Busca etiqueta de order_shipping_files
└── Gera URL assinada para download da etiqueta
```

---

## Código Atualizado

### 1. Buscar Email Real

```typescript
// ANTES
const { data: customerProfile } = await supabase
  .from('profiles')
  .select('first_name, last_name, phone')
  .eq('user_id', order.user_id)
  .single();
let customerEmail = null;

// DEPOIS
const { data: usersWithEmail } = await supabase
  .rpc('get_users_with_email');

const userWithEmail = usersWithEmail?.find(u => u.user_id === order.user_id);
const customerEmail = userWithEmail?.email || null;
const customerProfile = userWithEmail ? {
  first_name: userWithEmail.first_name,
  last_name: userWithEmail.last_name,
  phone: userWithEmail.phone,
} : null;
```

### 2. Corrigir Busca de Items

```typescript
// ANTES
const { data: items } = await supabase
  .from('order_items')
  .select(`product_id, quantity, unit_price, product_name_snapshot`)
  .eq('order_id', order.id);

// DEPOIS
const { data: items } = await supabase
  .from('order_items')
  .select(`product_id, quantity, unit_price, product_snapshot`)
  .eq('order_id', order.id);

// Mapear usando product_snapshot
items: (items || []).map(item => ({
  product_id: item.product_id,
  name: item.product_snapshot?.name || 'Produto',
  sku: item.product_snapshot?.sku || null,
  image_url: item.product_snapshot?.image_url || null,
  quantity: item.quantity,
  unit_price: item.unit_price,
})),
```

### 3. Incluir Etiqueta com URL Assinada

```typescript
// Buscar etiqueta do pedido
const { data: shippingFiles } = await supabase
  .from('order_shipping_files')
  .select('file_name, file_path, file_size, uploaded_at')
  .eq('order_id', order.id)
  .limit(1)
  .maybeSingle();

let shippingLabel = null;
if (shippingFiles?.file_path) {
  // Gerar URL assinada (válida por 1 hora)
  const { data: signedUrl } = await supabase.storage
    .from('shipping-files')
    .createSignedUrl(shippingFiles.file_path, 3600);
  
  shippingLabel = {
    file_name: shippingFiles.file_name,
    file_size: shippingFiles.file_size,
    uploaded_at: shippingFiles.uploaded_at,
    download_url: signedUrl?.signedUrl || null,
  };
}
```

---

## Payload Final Esperado

```json
{
  "event": "order.paid",
  "timestamp": "2026-02-01T16:51:21.543Z",
  "data": {
    "order_id": "c40b90a5-bed9-4a11-bd34-358909574b57",
    "order_number": "ORD-1769828426038_865529AC",
    "total_amount": 19.98,
    "payment_method": "pix",
    "customer": {
      "user_id": "865529ac-c7cb-4f8b-9e97-8033b32a5876",
      "email": "dottabruno9@gmail.com",
      "name": "Bruno Dotta",
      "phone": "49999910306"
    },
    "reseller": {
      "user_id": null,
      "store_name": null
    },
    "items": [
      {
        "product_id": "0a8d1f8f-984a-4c52-8c2f-88250ac393ca",
        "name": "TELA MAIOR PARA CELULAR LUPA 3D AMPLIFICADOR 14 POLEGADAS",
        "sku": "CELU-001",
        "image_url": "https://cf.shopee.com.br/...",
        "quantity": 1,
        "unit_price": 19.98
      }
    ],
    "shipping_label": {
      "file_name": "Etiqueta Antonio.pdf",
      "file_size": 110670,
      "uploaded_at": "2026-01-31T03:00:28.389Z",
      "download_url": "https://...storage.../shipping-files/...?token=..."
    },
    "_test": true,
    "_test_message": "Dados reais do banco de dados (teste)"
  }
}
```

---

## Também Corrigir: Eventos de Usuário

Os eventos `user.created` e `user.inactive.*` também usam `'email@exemplo.com'` como placeholder.

Vou atualizar as funções `fetchLastCreatedUser()` e `fetchInactiveUser()` para usar `get_users_with_email()`:

```typescript
// fetchLastCreatedUser - usar RPC para pegar email
const { data: usersWithEmail } = await supabase.rpc('get_users_with_email');
const lastUser = usersWithEmail?.[0]; // já ordenado por created_at

// fetchInactiveUser - filtrar por last_sign_in_at
const inactiveUsers = usersWithEmail?.filter(u => {
  if (!u.last_sign_in_at) return false;
  const lastActivity = new Date(u.last_sign_in_at);
  const threshold = new Date();
  threshold.setDate(threshold.getDate() - days);
  return lastActivity < threshold;
});
```

---

## Resumo das Alterações

| Função | Alteração |
|--------|-----------|
| `fetchLastPaidOrder()` | Usar `get_users_with_email()`, corrigir `product_snapshot`, adicionar `shipping_label` |
| `fetchLastCreatedUser()` | Usar `get_users_with_email()` para email real |
| `fetchInactiveUser()` | Usar `get_users_with_email()` para email real |

---

## Arquivo a Modificar

| Arquivo | Descrição |
|---------|-----------|
| `supabase/functions/dispatch-webhook/index.ts` | Corrigir busca de email, items e adicionar etiqueta |
