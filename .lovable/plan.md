

## Remover botao "Publicar no Mercado Livre" do catalogo

### O que sera feito

Remover o botao do Mercado Livre que aparece nos cards de produto do catalogo do revendedor. O botao continuara disponivel na pagina "Meus Produtos".

### Alteracao

**Arquivo: `src/pages/reseller/Catalog.tsx`**

- Remover o bloco condicional das linhas 499-517 que renderiza o `MercadoLivreButton`
- Remover os imports nao utilizados: `MercadoLivreButton` (linha 41) e `useMercadoLivreIntegration` (linha 40)
- Remover as variaveis do hook `useMercadoLivreIntegration` que ficarem sem uso (como `hasMLIntegration`, `isProductPublished`, `publishProduct`, etc.)

Nenhum outro arquivo sera alterado. O botao permanece funcional em "Meus Produtos" (`src/pages/reseller/Products.tsx`).

