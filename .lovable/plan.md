

## Corrigir parsing da resposta de clonagem

### Problema

A resposta do webhook retorna um **array** com objetos no formato `[{ success: true, data: {...} }]`, mas o codigo atual espera um objeto simples `{ success: true, product: {...} }`. Isso faz com que a clonagem nunca seja reconhecida como sucesso.

### Solucao

Alterar o parsing da resposta (linhas 170-179) para:

1. Detectar se a resposta e um array e extrair o primeiro elemento
2. Verificar `item.success` em vez de `result.success`
3. Passar `item.data` (o produto atualizado) para `onCloneSuccess()` em vez de `result.product`

### Alteracao

**Arquivo: `src/components/admin/CloneFromMarketplace.tsx`** (linhas 170-179)

Substituir o bloco de parsing por:

```typescript
const result = await response.json();

// Resposta vem como array - extrair primeiro item
const item = Array.isArray(result) ? result[0] : result;
const isSuccess = item?.success === true;
const productData = item?.data || item?.product;

if (isSuccess) {
  setCloneResult({ success: true, message: "Produto clonado com sucesso!" });
  toast.success("Produto clonado com sucesso!", { description: "Os dados foram atualizados." });
  onCloneSuccess?.(productData);
} else {
  const errorMsg = item?.error || item?.message || "Erro ao clonar produto";
  setCloneResult({ success: false, message: errorMsg });
  toast.error("Erro ao clonar produto", { description: errorMsg });
}
```

Isso garante compatibilidade tanto com o formato array `[{success, data}]` quanto com o formato objeto `{success, product}`.

