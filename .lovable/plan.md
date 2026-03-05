

# Fix: Links dos produtos apontando para o domínio errado

## Problema

O botão "Abrir Lojafy" usa `window.open(product.productUrl, '_blank')` com URL relativa (`/produto/ID`), que abre no domínio atual (preview). O "Copiar link" usa `window.location.origin`, que também pega o domínio do preview.

O correto é apontar para o domínio publicado: `https://lojafy.lovable.app`.

## Correção

No `TopProdutosVencedores.tsx`:

1. Definir uma constante com o domínio publicado:
```typescript
const PUBLISHED_DOMAIN = 'https://lojafy.lovable.app';
```

2. Atualizar `productUrl` no `useMemo` para usar URL absoluta:
```typescript
productUrl: `${PUBLISHED_DOMAIN}/produto/${fp.produto_id}`,
```

3. Atualizar `handleCopyLink` para copiar a URL diretamente (sem `window.location.origin`):
```typescript
navigator.clipboard.writeText(url);
```

### Arquivo: `src/pages/reseller/TopProdutosVencedores.tsx`

