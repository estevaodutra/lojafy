
# Plano: Adicionar Categoria "Recursos" e Feature "Top 10 Produtos"

## Estado Atual

| Local | Situação |
|-------|----------|
| Banco de dados | Apenas `loja_propria` existe |
| Features.tsx (categoryLabels) | `loja`, `acessos`, `geral` |
| FeatureFormModal.tsx (categorias) | Desatualizado (categorias antigas) |

---

## O Que Será Feito

### 1. Atualizar CategoryLabels (Features.tsx)

Adicionar a nova categoria **"Recursos"**:

```typescript
const categoryLabels: Record<string, string> = {
  loja: '🏪 Loja',
  recursos: '🏆 Recursos',  // NOVA
  acessos: '🎯 Acessos',
  geral: '⚙️ Geral',
};
```

### 2. Atualizar Lista de Categorias no Formulário (FeatureFormModal.tsx)

Simplificar e sincronizar com as categorias reais:

```typescript
const categorias = [
  { value: 'loja', label: 'Loja' },
  { value: 'recursos', label: 'Recursos' },  // NOVA
  { value: 'acessos', label: 'Acessos' },
  { value: 'geral', label: 'Geral' },
];
```

Adicionar ícone Trophy na lista de ícones:

```typescript
{ value: 'Trophy', label: 'Troféu' },
```

### 3. Inserir a Feature no Banco de Dados

Executar no SQL Editor do Supabase (ambiente Test):

```sql
INSERT INTO features (
  slug, nome, descricao, icone, categoria, ordem_exibicao,
  preco_mensal, preco_anual, preco_vitalicio, trial_dias,
  ativo, visivel_catalogo, roles_permitidas, requer_features
) VALUES (
  'top_10_produtos',
  'Top 10 Produtos',
  'Desafio gamificado para publicar seus produtos vencedores!',
  'Trophy',
  'recursos',
  1,
  0.00, 0.00, 0.00,
  0,
  true,
  false,
  ARRAY['reseller', 'customer'],
  ARRAY[]::text[]
);
```

---

## Resultado Final

```text
Features da Plataforma
├── 🏪 Loja
│   └── Loja Completa (loja_propria)
└── 🏆 Recursos
    └── Top 10 Produtos (top_10_produtos)
```

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/admin/Features.tsx` | Adicionar `recursos` no `categoryLabels` |
| `src/components/admin/FeatureFormModal.tsx` | Atualizar lista de categorias e adicionar ícone Trophy |

