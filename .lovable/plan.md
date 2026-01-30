

# Plano: Inserir Feature "Lojafy Academy" no Banco de Dados

## Situação Atual

A feature `lojafy_academy` foi configurada no código (Header, CustomerLayout, App.tsx), mas **não existe no banco de dados**. Por isso, não aparece na página de Features.

## Alteração Necessária

### SQL para Inserir Feature

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

Após executar, a feature aparecerá na página `/super-admin/features`:

| Categoria | Feature |
|-----------|---------|
| 🏪 Loja | Loja Completa |
| 🏆 Recursos | Top 10 Produtos |
| 🏆 Recursos | **Lojafy Academy** ← Nova |

## Próximos Passos Após Inserção

1. A feature aparecerá automaticamente na listagem
2. Você poderá atribuí-la ao usuário `centraldeerros2@gmail.com`
3. Usuários com a feature verão o menu da Academy

