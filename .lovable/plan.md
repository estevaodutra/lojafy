
# Plano: Adicionar Opção de Despublicar do Mercado Livre

## Resumo

Adicionar um botão "Despublicar" que aparece quando o produto já está publicado no Mercado Livre, permitindo ao usuário remover o anúncio da plataforma.

---

## Comportamento do Botão

| Estado | Aparência | Ação |
|--------|-----------|------|
| Não publicado | Amarelo - "Mercado Livre" | Publica o produto |
| Publicando | Amarelo com spinner - "Publicando..." | Desabilitado |
| Publicado | Verde - "Publicado" + Botão "Despublicar" | Permite despublicar |
| Despublicando | Vermelho com spinner - "Despublicando..." | Desabilitado |

---

## Alterações Necessárias

### 1. Hook `useMercadoLivreIntegration.ts`

Adicionar nova mutation para despublicar:

```typescript
// Adicionar estado para produtos sendo despublicados
const [unpublishingProducts, setUnpublishingProducts] = useState<Set<string>>(new Set());

// Nova mutation para despublicar
const unpublishProductMutation = useMutation({
  mutationFn: async ({ productId }: { productId: string }) => {
    // 1. Buscar dados da integração
    const { data: integrationData } = await supabase
      .from('mercadolivre_integrations')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true)
      .single();

    // 2. Buscar ml_item_id do produto publicado
    const { data: publishedData } = await supabase
      .from('mercadolivre_published_products')
      .select('ml_item_id')
      .eq('user_id', user.id)
      .eq('product_id', productId)
      .single();

    // 3. Chamar webhook de despublicação
    await fetch('https://n8n-n8n.nuwfic.easypanel.host/webhook/MercadoLivre_Unpublish', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ml_item_id: publishedData?.ml_item_id,
        integration: { access_token, ml_user_id, ... },
        user_id: user.id,
        product_id: productId
      })
    });

    // 4. Atualizar status para 'unpublished' ou deletar registro
    await supabase
      .from('mercadolivre_published_products')
      .update({ status: 'unpublished' })
      .eq('user_id', user.id)
      .eq('product_id', productId);
  }
});

// Exportar novas funções
return {
  // ... existentes
  isProductUnpublishing,
  unpublishProduct
};
```

### 2. Componente `MercadoLivreButton.tsx`

Atualizar para mostrar opção de despublicar quando publicado:

```tsx
interface MercadoLivreButtonProps {
  // ... props existentes
  onUnpublish?: () => Promise<void>;
  isUnpublishing?: boolean;
}

// Quando publicado, mostrar dois botões ou dropdown
if (isPublished) {
  if (isUnpublishing) {
    return (
      <Button className="w-full bg-red-500 text-white" disabled>
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        {compact ? "Despublicando..." : "Despublicando..."}
      </Button>
    );
  }
  
  return (
    <div className="flex flex-col gap-1 w-full">
      <Button className="w-full bg-green-500 text-white" disabled>
        <Check className="h-4 w-4 mr-2" />
        {compact ? "Publicado" : "Publicado no ML"}
      </Button>
      <Button 
        size="sm"
        variant="outline" 
        className="w-full text-red-600 border-red-300 hover:bg-red-50"
        onClick={onUnpublish}
      >
        <X className="h-3 w-3 mr-1" />
        Despublicar
      </Button>
    </div>
  );
}
```

### 3. Página `Products.tsx`

Passar as novas props para o componente:

```tsx
<MercadoLivreButton
  productId={product.product_id}
  isPublished={isProductPublished(product.product_id)}
  isPublishing={isProductPublishing(product.product_id)}
  isUnpublishing={isProductUnpublishing(product.product_id)}
  isInStore={true}
  onPublish={async () => { await publishProduct(product.product_id); }}
  onUnpublish={async () => { await unpublishProduct(product.product_id); }}
  onAddToStore={async () => {}}
  compact
/>
```

---

## Estrutura do Payload para Webhook de Despublicação

```json
{
  "ml_item_id": "MLB123456789",
  "integration": {
    "access_token": "APP_USR-xxx...",
    "refresh_token": "TG-xxx...",
    "ml_user_id": 123456789
  },
  "user_id": "uuid-do-usuario",
  "product_id": "uuid-do-produto"
}
```

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/hooks/useMercadoLivreIntegration.ts` | Adicionar mutation e funções para despublicar |
| `src/components/reseller/MercadoLivreButton.tsx` | Adicionar botão de despublicar quando publicado |
| `src/pages/reseller/Products.tsx` | Passar novas props para o componente |

---

## Resultado Esperado

1. Produtos publicados mostram badge verde "Publicado" + botão "Despublicar"
2. Ao clicar em despublicar, mostra spinner "Despublicando..."
3. Webhook recebe dados para remover anúncio do Mercado Livre
4. Status atualiza para 'unpublished' no banco
5. Botão volta a mostrar opção de publicar novamente
