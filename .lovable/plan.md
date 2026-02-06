

# Plano: Adicionar Funcionalidade de Despublicar na Página de Catálogo

## Resumo

Adicionar as props `onUnpublish` e `isUnpublishing` ao componente `MercadoLivreButton` na página de Catálogo, permitindo que produtos publicados no Mercado Livre sejam despublicados diretamente desta página.

---

## Problema Atual

O `MercadoLivreButton` na página de Catálogo (linhas 497-511) está incompleto:

```tsx
// Código atual - faltam props de despublicar
<MercadoLivreButton
  productId={product.id}
  isPublished={isProductPublished(product.id)}
  isPublishing={isProductPublishing(product.id)}
  isInStore={product.isInMyStore}
  onPublish={...}
  onAddToStore={...}
  // ❌ Faltando: isUnpublishing
  // ❌ Faltando: onUnpublish
/>
```

---

## Alterações Necessárias

### Arquivo: `src/pages/reseller/Catalog.tsx`

1. **Adicionar imports do hook** (linha 84):
   - Adicionar `isProductUnpublishing` e `unpublishProduct` no destructuring do `useMercadoLivreIntegration`

2. **Passar novas props para o componente** (linhas 497-511):
   - Adicionar `isUnpublishing={isProductUnpublishing(product.id)}`
   - Adicionar `onUnpublish={async () => { await unpublishProduct(product.id); }}`

---

## Código Atualizado

**Linha 79-85 (hook destructuring):**
```tsx
const {
  hasActiveIntegration: hasMLIntegration,
  isProductPublished,
  isProductPublishing,
  isProductUnpublishing,  // ✅ Novo
  publishProduct,
  unpublishProduct,       // ✅ Novo
} = useMercadoLivreIntegration();
```

**Linhas 497-511 (componente):**
```tsx
{hasMLIntegration && (
  <MercadoLivreButton
    productId={product.id}
    isPublished={isProductPublished(product.id)}
    isPublishing={isProductPublishing(product.id)}
    isUnpublishing={isProductUnpublishing(product.id)}  // ✅ Novo
    isInStore={product.isInMyStore}
    onPublish={async (addToStoreFirst) => {
      await publishProduct(product.id, addToStoreFirst);
    }}
    onUnpublish={async () => {                          // ✅ Novo
      await unpublishProduct(product.id);
    }}
    onAddToStore={async () => {
      const price = getSuggestedPrice(product);
      await addProduct(product.id, price);
    }}
  />
)}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/Catalog.tsx` | Adicionar imports e props de despublicar ao MercadoLivreButton |

---

## Resultado Esperado

1. Produtos publicados no ML mostrarão badge verde "Publicado no ML" + botão "Despublicar"
2. Usuário pode despublicar produtos diretamente da página de Catálogo
3. Comportamento idêntico à página "Meus Produtos"

