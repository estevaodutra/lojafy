
# Plano: Incluir Etiqueta de Envio no Webhook order.paid

## Diagnóstico

O pedido `d03f2443-b353-4be7-8b62-2eaae8632eef` possui uma etiqueta de envio registrada na tabela `order_shipping_files`:

```
file_name: bruna michelle.pdf
file_path: d03f2443-b353-4be7-8b62-2eaae8632eef/order_d03f2443-b353-4be7-8b62-2eaae8632eef_1770032189816.pdf
file_size: 57265 bytes
```

Porém, essa informação não está sendo incluída no payload do webhook `order.paid`.

**Causa Raiz:**

As funções que montam o payload manualmente (`dispatch-order-webhook`, `webhook-n8n-payment`, `check-pending-payments`) não buscam a etiqueta de envio na tabela `order_shipping_files` nem geram a URL assinada.

---

## Arquivos a Modificar

### 1. `supabase/functions/dispatch-order-webhook/index.ts`

Adicionar busca da etiqueta de envio e geração de URL assinada:

```typescript
// Buscar etiqueta de envio
let shippingLabel = null;
const { data: shippingFile } = await supabase
  .from('order_shipping_files')
  .select('file_name, file_path, file_size, uploaded_at')
  .eq('order_id', fullOrder.id)
  .limit(1)
  .maybeSingle();

if (shippingFile?.file_path) {
  // Gerar URL assinada (válida por 7 dias)
  const { data: signedUrlData } = await supabase.storage
    .from('shipping-files')
    .createSignedUrl(shippingFile.file_path, 604800);
  
  shippingLabel = {
    file_name: shippingFile.file_name,
    file_size: shippingFile.file_size,
    uploaded_at: shippingFile.uploaded_at,
    download_url: signedUrlData?.signedUrl || null,
  };
}

// Adicionar ao payload
const webhookPayload = {
  // ... campos existentes ...
  shipping_label: shippingLabel,
};
```

### 2. `supabase/functions/webhook-n8n-payment/index.ts`

Mesma lógica: adicionar busca de `order_shipping_files` e inclusão de `shipping_label` no payload.

### 3. `supabase/functions/check-pending-payments/index.ts`

Mesma lógica: adicionar busca de `order_shipping_files` e inclusão de `shipping_label` no payload.

---

## Payload Final Esperado

```json
{
  "event": "order.paid",
  "timestamp": "2026-02-02T16:12:50.490Z",
  "data": {
    "order_id": "d03f2443-b353-4be7-8b62-2eaae8632eef",
    "order_number": "ORD-1770032188907_0492ACDE",
    "total_amount": 7.77,
    "payment_method": "pix",
    "customer": {
      "user_id": "...",
      "email": "rafaelleao88@yahoo.com.br",
      "name": "RAFAEL LEAO",
      "phone": "5514997384355"
    },
    "reseller": null,
    "items": [
      {
        "product_id": "...",
        "name": "Urinol Feminino...",
        "sku": "CASA-001",
        "quantity": 1,
        "unit_price": 7.77
      }
    ],
    "shipping_label": {
      "file_name": "bruna michelle.pdf",
      "file_size": 57265,
      "uploaded_at": "2026-02-02T11:36:31.338Z",
      "download_url": "https://...supabase.co/.../signed-url..."
    }
  }
}
```

---

## Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `dispatch-order-webhook/index.ts` | Adicionar busca de etiqueta + URL assinada |
| `webhook-n8n-payment/index.ts` | Adicionar busca de etiqueta + URL assinada |
| `check-pending-payments/index.ts` | Adicionar busca de etiqueta + URL assinada |

---

## Detalhes Técnicos

**Bucket de armazenamento:** `shipping-files` (privado)

**Validade da URL assinada:** 7 dias (604800 segundos)

**Estrutura do shipping_label:**
- `file_name`: Nome original do arquivo
- `file_size`: Tamanho em bytes
- `uploaded_at`: Data/hora do upload
- `download_url`: URL assinada para download (válida por 7 dias)

---

## Resultado Esperado

Após as correções, todos os webhooks `order.paid` incluirão a etiqueta de envio (quando existir) com uma URL de download válida por 7 dias, permitindo que o N8N e outros sistemas automatizados acessem o arquivo diretamente.
