

## Incluir dados de marketplace na publicacao do Mercado Livre

### Problema
Ao clicar em "Publicar", o hook `useMercadoLivreIntegration.ts` envia ao webhook apenas os dados da tabela `products` e os tokens de integracao. Os dados especificos do marketplace salvos em `product_marketplace_data` (category_id, domain_id, listing_type, condition, title customizado, pictures, variations, shipping, sale_terms) sao ignorados.

### Alteracao

**Arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

No `publishProductMutation` (mutationFn), apos buscar o produto e a integracao, adicionar uma terceira query:

1. Buscar dados do marketplace:
```text
supabase
  .from('product_marketplace_data')
  .select('*')
  .eq('product_id', productId)
  .eq('marketplace', 'mercadolivre')
  .maybeSingle()
```

2. Incluir os dados no payload enviado ao webhook, adicionando um campo `marketplace_data` ao JSON:

```text
body: JSON.stringify({
  product: productData,
  marketplace_data: marketplaceData?.data || null,   // <-- NOVO
  marketplace_listing: {                              // <-- NOVO (campos de controle)
    listing_id: marketplaceData?.listing_id,
    listing_status: marketplaceData?.listing_status,
  },
  integration: { access_token, refresh_token, ... },
  user_id: user.id
})
```

3. Se nao houver dados de marketplace (`marketplaceData` for null), a publicacao continua normalmente -- o webhook/n8n usa os dados do produto como fallback.

### Resultado
O webhook recebe o payload completo com:
- `product`: dados do produto Lojafy (price, stock_quantity, attributes, images, etc.)
- `marketplace_data`: dados especificos do ML (category_id, domain_id, listing_type, condition, title customizado, pictures, shipping, sale_terms)
- `marketplace_listing`: campos de controle (listing_id existente, status)
- `integration`: tokens OAuth do ML
