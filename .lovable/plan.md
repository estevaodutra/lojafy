

# Criar rota pública `/top_10_produtos`

## O que será feito

Adicionar uma rota pública `/top_10_produtos` que renderiza o componente `TopProdutosVencedores` sem exigir autenticação, sem layout de painel (customer/reseller), e acessível por qualquer pessoa.

## Alterações

### `src/App.tsx`
- Adicionar uma nova rota pública `<Route path="/top_10_produtos" element={<ResellerTopProdutosVencedores />} />` junto das outras rotas públicas (após linha ~223, junto com `/auth`, `/faq`, etc.)
- O import de `ResellerTopProdutosVencedores` já existe no arquivo, então nada mais é necessário

A página será renderizada diretamente, sem `FeatureRoute`, `RoleBasedRoute` ou layout de painel — qualquer pessoa pode acessar via URL.

