
## Enviar "Seu Preco" no payload de publicacao do Mercado Livre

### Problema
Quando o revendedor publica um produto no Mercado Livre, o payload enviado ao webhook n8n contem apenas os dados da tabela `products` (preco original). O campo `custom_price` da tabela `reseller_products` (que e o "Seu Preco" definido pelo revendedor) nao e incluido.

### Solucao

**Arquivo: `src/hooks/useMercadoLivreIntegration.ts`**

Adicionar uma consulta a tabela `reseller_products` dentro da `publishProductMutation` para buscar o `custom_price` do revendedor, e incluir esse valor no payload enviado ao webhook.

Alteracoes:
1. Apos buscar os dados do produto (passo 1), adicionar uma consulta:
```text
const { data: resellerProduct } = await supabase
  .from('reseller_products')
  .select('custom_price')
  .eq('reseller_id', user.id)
  .eq('product_id', productId)
  .maybeSingle();
```

2. Incluir o campo `reseller_price` no payload do webhook:
```text
const webhookPayload = {
  product: productData,
  reseller_price: resellerProduct?.custom_price || null,
  marketplace_data: ...,
  // ... restante do payload
};
```

### Resultado
O n8n recebera o campo `reseller_price` com o valor de "Seu Preco", podendo usa-lo como preco do anuncio no Mercado Livre.

### Secao Tecnica
- Tabela consultada: `reseller_products` (campo `custom_price`)
- Campo adicionado ao payload: `reseller_price`
- Usa `maybeSingle()` pois o produto pode nao estar na loja do revendedor (nesse caso envia `null`)
- Nenhuma alteracao na Edge Function necessaria - o proxy repassa qualquer campo do body
