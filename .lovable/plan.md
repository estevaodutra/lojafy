

# Scroll Direto ao Endpoint ao Clicar no Sidebar

## Problema
Ao clicar em um endpoint especifico no menu lateral, a pagina navega para a categoria mas nao rola ate o endpoint clicado. O usuario precisa procurar manualmente entre os cards.

## Solucao

Ao clicar num endpoint no sidebar, calcular em qual pagina ele esta (paginacao de 5 por pagina), navegar para essa pagina, e fazer scroll automatico ate o card correspondente.

## Alteracoes

### 1. `src/pages/admin/ApiDocumentation.tsx`
- Adicionar estado `scrollToEndpointIndex` (indice do endpoint dentro da lista completa da categoria)
- Criar handler `handleEndpointClick(categoryId, globalIndex)`:
  - Seta a secao para `categoryId`
  - Calcula a pagina correta: `Math.floor(globalIndex / ITEMS_PER_PAGE) + 1`
  - Armazena o indice local na pagina para scroll: `globalIndex % ITEMS_PER_PAGE`
- Passar `onEndpointClick` para o `ApiDocsSidebar`
- Passar `scrollToIndex` para o `ApiDocsContent`

### 2. `src/components/admin/ApiDocsSidebar.tsx`
- Adicionar prop `onEndpointClick?: (categoryId: string, endpointIndex: number) => void`
- Nos botoes de endpoint direto: chamar `onEndpointClick(category.id, index)` em vez de `onSectionChange(category.id)`
- Nos botoes de subcategoria: calcular o indice global somando os endpoints das subcategorias anteriores e chamar `onEndpointClick(category.id, globalIndex)`

### 3. `src/components/admin/ApiDocsContent.tsx`
- Adicionar prop `scrollToIndex?: number | null`
- Adicionar `id={`endpoint-card-${index}`}` em cada `EndpointCard` renderizado
- Usar `useEffect` que, quando `scrollToIndex` muda, executa `document.getElementById(`endpoint-card-${scrollToIndex}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })` com um pequeno delay para aguardar a renderizacao

### Resultado
- Clicar em qualquer endpoint no sidebar navega direto para a pagina e card correto
- Scroll suave ate o endpoint
- Funciona com a paginacao existente (calcula a pagina automaticamente)

