

# Plano: Adicionar Botão Mercado Livre na Página "Meus Produtos"

## Resumo

Adicionar o mesmo botão "Publicar no Mercado Livre" na página de "Meus Produtos" (`/reseller/produtos`), seguindo o mesmo padrão visual e funcional já implementado no Catálogo.

---

## Alterações Necessárias

### 1. Modificar Página "Meus Produtos"

**Arquivo:** `src/pages/reseller/Products.tsx`

Alterações a fazer:

1. **Importar dependências:**
   - `useMercadoLivreIntegration` hook
   - `MercadoLivreButton` componente
   - `TooltipProvider` do Radix UI

2. **Integrar o hook:**
   - Chamar `useMercadoLivreIntegration()` para verificar integração ativa e produtos publicados

3. **Adicionar botão em cada card de produto:**
   - Posicionar na parte inferior do card, após as informações do produto
   - Ocupar largura total com texto "Publicar no Mercado Livre" + ícone
   - Mostrar apenas se usuário tem integração ML ativa

---

## Layout Atualizado do Card

```text
┌──────────────────────────────────────────────────────────┐
│  [Imagem]  │  Nome do Produto          │  [Ativo/Inativo] │
│            │  SKU: ABC123              │                  │
│            │  Preço Original | Seu Preço │  [Desativar]   │
│            │                           │  [Ver na Loja]   │
│            │                           │  [Remover]       │
├──────────────────────────────────────────────────────────┤
│  [🛫 Publicar no Mercado Livre]                          │  ← Novo botão
└──────────────────────────────────────────────────────────┘
```

---

## Diferença do Catálogo

Na página "Meus Produtos", todos os produtos já estão adicionados à loja, então:
- `isInStore` será sempre `true`
- `onAddToStore` não será necessário (função vazia)
- O botão apenas enviará para o webhook do Mercado Livre

---

## Detalhes Técnicos

### Imports a adicionar:
```typescript
import { TooltipProvider } from '@/components/ui/tooltip';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';
import { MercadoLivreButton } from '@/components/reseller/MercadoLivreButton';
```

### Uso do hook:
```typescript
const {
  hasActiveIntegration,
  isProductPublished,
  publishingProducts,
  publishProduct,
} = useMercadoLivreIntegration();
```

### Renderização do botão (dentro do card, após a div principal):
```jsx
{hasActiveIntegration && product.product && (
  <div className="mt-4 pt-4 border-t">
    <MercadoLivreButton
      productId={product.product_id}
      isPublished={isProductPublished(product.product_id)}
      isPublishing={publishingProducts.has(product.product_id)}
      isInStore={true}
      onPublish={() => publishProduct(product.product_id)}
      onAddToStore={async () => {}}
    />
  </div>
)}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/Products.tsx` | Importar hook e componente, adicionar botão ML em cada card |
| `src/components/reseller/MercadoLivreButton.tsx` | Atualizar para versão com texto completo (já planejado anteriormente) |

---

## Resultado Esperado

1. Na página "Meus Produtos", cada card terá o botão "Publicar no Mercado Livre" na parte inferior
2. Botão só aparece se o usuário tem integração ML ativa
3. Mesmos estados visuais: amarelo (publicar), spinner (publicando), verde (publicado)
4. Comportamento idêntico ao do Catálogo

