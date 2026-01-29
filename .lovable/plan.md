

# Plano: Inserir Feature "Lojafy Academy" no Banco de Dados

## Situação Atual

A feature `lojafy_academy` foi configurada no código (Header, CustomerLayout, App.tsx), mas ainda não existe no banco de dados. Por isso, ela não aparece na página de Features da Plataforma.

## Alteração Necessária

### Migration SQL

Inserir a feature na tabela `features`:

```sql
INSERT INTO features (
  slug,
  nome,
  descricao,
  icone,
  categoria,
  ordem_exibicao,
  preco_mensal,
  preco_anual,
  preco_vitalicio,
  trial_dias,
  ativo,
  visivel_catalogo,
  roles_permitidas,
  requer_features
) VALUES (
  'lojafy_academy',
  'Lojafy Academy',
  'Acesso aos cursos e treinamentos da plataforma',
  'GraduationCap',
  'recursos',
  2,
  0.00,
  0.00,
  0.00,
  0,
  true,
  true,
  ARRAY['reseller', 'customer'],
  ARRAY[]::text[]
);
```

## Resultado Esperado

Após a migration, a feature aparecerá na página de Features:

| Categoria | Feature |
|-----------|---------|
| 🏪 Loja | Loja Completa |
| 🏆 Recursos | Top 10 Produtos |
| 🏆 Recursos | **Lojafy Academy** ← Nova |

## Próximos Passos Após Inserção

1. A feature aparecerá automaticamente na página `/super-admin/features`
2. Você poderá atribuí-la a usuários pelo modal de atribuição
3. Usuários com a feature verão o menu da Academy

