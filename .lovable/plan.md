

# Fix: Variações não aparecem ao reabrir o formulário de edição

## Causa raiz

O `ProductForm` está dentro de um `<Dialog>` que **não desmonta** o conteúdo quando fecha. O `useRef(variantsInitialized)` permanece `true` da edição anterior, impedindo o `useEffect` de popular as variações na próxima abertura.

## Correção

No `ProductForm.tsx`, adicionar um segundo `useEffect` que reseta `variantsInitialized.current = false` sempre que o `product?.id` mudar. Isso garante que quando o diálogo reabre com o mesmo ou outro produto, as variações serão carregadas novamente.

Além disso, limpar o estado `variants` quando o produto muda para evitar exibir variações do produto anterior.

### Arquivo: `src/components/admin/ProductForm.tsx`

Adicionar logo após a declaração do `variantsInitialized` ref:

```typescript
// Reset initialization when product changes
useEffect(() => {
  variantsInitialized.current = false;
  setVariants([]);
}, [product?.id]);
```

Isso garante que:
1. Ao abrir para editar produto A → variações de A são carregadas
2. Ao fechar e reabrir produto A → ref reseta, variações recarregam
3. Ao trocar de produto A para B → ref reseta, variações de B carregam

