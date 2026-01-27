

# Ocultar Categorias com Zero Produtos

## Problema Identificado

Categorias sem produtos ativos (exibindo "(0)") estão sendo mostradas na página `/categorias` e no componente `CategorySection`, poluindo a visualização com opções que não possuem produtos.

---

## Locais Afetados

| Arquivo | Local | Comportamento Atual |
|---------|-------|---------------------|
| `src/pages/Categorias.tsx` | Sidebar de filtros (linha 239-249) | Mostra todas categorias, incluindo as com "(0)" |
| `src/components/CategorySection.tsx` | Grid de categorias (linha 151-176) | Mostra todas categorias, apenas oculta o texto da contagem quando é 0 |

---

## Solução

Filtrar as categorias para exibir **apenas aquelas com pelo menos 1 produto ativo**.

---

## Alterações Necessárias

### 1. Arquivo: `src/pages/Categorias.tsx`

**Filtrar categorias na sidebar** (linha ~239):

```typescript
// ANTES (linha 239-249):
{categories.map((category) => (
  <Link ... >
    {category.name} ({category.real_product_count || 0})
  </Link>
))}

// DEPOIS:
{categories
  .filter(category => (category.real_product_count || 0) > 0)
  .map((category) => (
  <Link ... >
    {category.name} ({category.real_product_count})
  </Link>
))}
```

### 2. Arquivo: `src/components/CategorySection.tsx`

**Filtrar categorias no grid** (linha ~151):

```typescript
// ANTES (linha 151):
{categories.map((category) => {

// DEPOIS:
{categories
  .filter(category => (category.real_product_count || 0) > 0)
  .map((category) => {
```

**Atualizar verificação de lista vazia** (linha ~143):

```typescript
// ANTES:
} : categories.length === 0 ? (

// DEPOIS - verificar se há categorias COM produtos:
} : categories.filter(c => (c.real_product_count || 0) > 0).length === 0 ? (
```

---

## Resultado Esperado

| Cenário | Antes | Depois |
|---------|-------|--------|
| Categoria "Eletrônicos" com 5 produtos | Exibe "Eletrônicos (5)" | Exibe "Eletrônicos (5)" |
| Categoria "Moda" com 0 produtos | Exibe "Moda (0)" | **Oculta** |
| Todas categorias vazias | Mostra cards vazios | Mostra mensagem "Nenhuma categoria encontrada" |

---

## Resumo das Alterações

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `src/pages/Categorias.tsx` | ~239 | Adicionar `.filter(category => (category.real_product_count \|\| 0) > 0)` antes do `.map()` |
| `src/components/CategorySection.tsx` | ~143 | Atualizar verificação de lista vazia para considerar apenas categorias com produtos |
| `src/components/CategorySection.tsx` | ~151 | Adicionar `.filter(category => (category.real_product_count \|\| 0) > 0)` antes do `.map()` |

