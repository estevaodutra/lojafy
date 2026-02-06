

# Diagnóstico: Erro ao Despublicar - "Failed to fetch"

## Problema Identificado

O erro "Failed to fetch" ocorre na chamada ao webhook `https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Unpublish` (linha 228 do hook).

Este erro indica que o webhook **não existe ou não está ativo** no n8n.

---

## Causa Raiz

O webhook de publicação (`MercadoLivre_Advertise`) foi configurado no n8n, mas o webhook de **despublicação** (`MercadoLivre_Unpublish`) ainda não foi criado.

---

## Solução

### Ação Necessária no n8n (não é código)

Você precisa criar um novo workflow no n8n com:

1. **Nome do Webhook**: `MercadoLivre_Unpublish`
2. **Método**: POST
3. **Payload esperado**:

```json
{
  "ml_item_id": "MLB123456789",
  "integration": {
    "access_token": "APP_USR-xxx...",
    "refresh_token": "TG-xxx...",
    "token_type": "Bearer",
    "expires_at": "2025-02-20T10:00:00Z",
    "ml_user_id": 123456789,
    "scope": "read write offline_access"
  },
  "user_id": "uuid-do-usuario",
  "product_id": "uuid-do-produto"
}
```

4. **Ação do Workflow**: Chamar a API do Mercado Livre para pausar/encerrar o anúncio

---

## API do Mercado Livre para Despublicar

Para pausar um anúncio no ML, use:

```text
PUT https://api.mercadolibre.com/items/{ml_item_id}
Headers:
  Authorization: Bearer {access_token}
Body:
  { "status": "paused" }
```

Para encerrar permanentemente:
```text
PUT https://api.mercadolibre.com/items/{ml_item_id}
Headers:
  Authorization: Bearer {access_token}
Body:
  { "status": "closed" }
```

---

## Alternativa: Melhorar Tratamento de Erro no Código

Enquanto o webhook não está pronto, podemos melhorar o código para:
1. Mostrar uma mensagem mais clara quando o webhook não existir
2. Adicionar log para debug

### Alteração sugerida em `useMercadoLivreIntegration.ts`:

```typescript
// Linha 227-251 - Melhorar tratamento de erro
try {
  const response = await fetch(
    'https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Unpublish',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ... })
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Webhook unpublish error:', response.status, errorText);
    throw new Error(`Erro ao despublicar: ${errorText}`);
  }
} catch (fetchError) {
  console.error('Fetch error:', fetchError);
  if (fetchError instanceof TypeError && fetchError.message === 'Failed to fetch') {
    throw new Error('Webhook de despublicação não está disponível. Configure-o no n8n.');
  }
  throw fetchError;
}
```

---

## Próximos Passos

| Prioridade | Ação |
|------------|------|
| 1 | Criar workflow `MercadoLivre_Unpublish` no n8n |
| 2 | Ativar o workflow para produção |
| 3 | (Opcional) Melhorar mensagem de erro no código |

---

## Resumo

**O código está correto.** O problema é que o webhook `MercadoLivre_Unpublish` não existe no n8n. Você precisa criar este workflow para que a despublicação funcione.

