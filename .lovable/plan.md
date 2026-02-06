
# Simplificar despublicação do Mercado Livre (sem webhook)

## Problema

Atualmente, ao despublicar um produto do Mercado Livre, o sistema tenta chamar o webhook `MercadoLivre_Unpublish` no n8n. Se o webhook não estiver configurado ou disponível, a operação falha com erro.

## Solução

Remover a chamada ao webhook de despublicação e apenas atualizar o status diretamente no banco de dados (`mercadolivre_published_products`), marcando o produto como `unpublished`.

## Detalhes Técnicos

### Arquivo: `src/hooks/useMercadoLivreIntegration.ts`

Na mutation `unpublishProductMutation` (linhas 198-301), simplificar o `mutationFn` para:

1. **Remover** a busca de dados da integração (linhas 202-212) -- não é mais necessário pois não vai chamar webhook
2. **Remover** a busca do `ml_item_id` (linhas 214-224) -- idem
3. **Remover** toda a chamada ao webhook `MercadoLivre_Unpublish` (linhas 226-261)
4. **Manter** apenas a atualização do status no banco (linhas 263-273), mudando de `published` para `unpublished`

O `mutationFn` ficará resumido a:
```typescript
mutationFn: async ({ productId }: { productId: string }) => {
  if (!user?.id) throw new Error('Usuário não autenticado');

  const { error: updateError } = await supabase
    .from('mercadolivre_published_products')
    .update({ status: 'unpublished' })
    .eq('user_id', user.id)
    .eq('product_id', productId);

  if (updateError) {
    console.error('Error updating published product status:', updateError);
    throw new Error('Erro ao atualizar status de publicação');
  }

  return { productId };
},
```

Os callbacks `onMutate`, `onSuccess`, `onError` e `onSettled` permanecem inalterados.
