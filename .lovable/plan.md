

## Corrigir exibicao de atributos no formulario de produto

### Problema
A coluna `specifications` dos produtos contem chaves com valores `null` (ex: `{"cor": null, "tamanho": null, "material": null}`). O codigo atual verifica apenas se `Object.keys(specifications).length > 0`, o que retorna `true` porque as chaves existem, mesmo com todos os valores nulos. Isso faz o sistema usar o formato legado (com valores vazios) em vez de carregar os dados do campo `attributes` que contem os valores reais.

### Solucao
Alterar a logica de inicializacao do estado `specifications` em `ProductForm.tsx` para verificar se ha pelo menos um valor nao-nulo antes de usar o formato legado.

### Alteracao tecnica

**Arquivo:** `src/components/admin/ProductForm.tsx` (linhas 66-78)

Trocar a verificacao de:
```typescript
if (product?.specifications && typeof product.specifications === 'object' && Object.keys(product.specifications).length > 0) {
```

Para:
```typescript
const specEntries = Object.entries(product.specifications).filter(([_, v]) => v != null && v !== '');
if (product?.specifications && typeof product.specifications === 'object' && specEntries.length > 0) {
  return specEntries.map(([key, value]) => ({ key, value: value as string }));
}
```

Isso filtra as chaves com valor `null` ou vazio antes de decidir qual fonte de dados usar. Se todas as chaves forem nulas, o sistema cai no fallback para `attributes`.

