

# Fix: "Produto não encontrado" ao clicar nos Top 10 Produtos

## Causa raiz

O produto "Tela Ampliadora 3D para Celular" (e possivelmente outros) tem `active = false` no banco de dados. A página `/produto/:id` filtra com `.eq('active', true)`, então retorna "Produto não encontrado".

Além disso, a página `TopProdutosVencedores.tsx` usa **URLs hardcoded** com UUIDs fixos (linhas 18-95), em vez de buscar dinamicamente da tabela `feature_produtos`. Isso significa que qualquer mudança nos produtos (desativação, exclusão, novos produtos) quebra os links.

## Plano

### 1. Tornar a lista de produtos dinâmica no `TopProdutosVencedores.tsx`

Substituir o array `initialProducts` hardcoded por dados dinâmicos da tabela `feature_produtos` (usando o slug `top_10_produtos`):

- Buscar o `feature_id` da feature com slug `top_10_produtos`
- Usar `useFeatureProducts(featureId)` para obter os produtos vinculados com nome, URL e ordem
- Manter a funcionalidade de checklist/progresso no localStorage, mas indexada por `produto_id` em vez de IDs fixos
- Gerar `productUrl` dinamicamente como `/produto/{produto_id}`

### 2. Remover filtro `active = true` para produtos acessados por link direto (opcional)

Na página `Produto.tsx`, considerar remover o `.eq('active', true)` da query principal, já que se o usuário tem o link direto, deveria poder ver o produto. Alternativamente, ativar os produtos que estão no Top 10.

**Recomendação:** A abordagem mais segura é tornar a lista dinâmica (passo 1) e garantir que apenas produtos ativos sejam vinculados à feature. Isso evita o problema na raiz.

### Arquivos a editar

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/TopProdutosVencedores.tsx` | Substituir dados hardcoded por query dinâmica usando `feature_produtos` |

