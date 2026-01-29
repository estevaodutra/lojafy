

# Plano: Adicionar Feature "Top 10 Produtos Vencedores"

## Objetivo

Registrar a feature `top_10_produtos` na tabela `features` do banco de dados para permitir que o SuperAdmin atribua esta funcionalidade a usuários.

---

## Dados da Feature

| Campo | Valor |
|-------|-------|
| slug | `top_10_produtos` |
| nome | Top 10 Produtos Vencedores |
| descricao | Desafio gamificado para publicar 11 produtos vencedores em marketplaces e começar a vender! |
| icone | `Trophy` |
| categoria | `acessos` |
| ordem_exibicao | 1 |
| preco_mensal | 0.00 (gratuito) |
| preco_anual | 0.00 |
| preco_vitalicio | 0.00 |
| trial_dias | 0 |
| ativo | true |
| visivel_catalogo | false (atribuído manualmente) |
| roles_permitidas | `['reseller', 'customer']` |
| requer_features | `[]` (sem dependências) |

---

## Migration SQL

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
  'top_10_produtos',
  'Top 10 Produtos Vencedores',
  'Desafio gamificado para publicar 11 produtos vencedores em marketplaces e começar a vender!',
  'Trophy',
  'acessos',
  1,
  0.00,
  0.00,
  0.00,
  0,
  true,
  false,
  ARRAY['reseller', 'customer'],
  ARRAY[]::text[]
);
```

---

## Resultado Esperado

Após a migration:

1. A feature aparecerá no painel SuperAdmin em `/super-admin/features`
2. SuperAdmin poderá atribuir a feature a usuários via modal "Atribuir Feature"
3. Usuários com a feature ativa verão o card "Top 10 Produtos Vencedores" na página "Meus Acessos"
4. A rota `/minha-conta/top-produtos-vencedores` será acessível apenas para quem tem a feature

---

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| Nova migration SQL | Inserir feature no banco de dados |

Nenhum código frontend precisa ser alterado - a lógica de exibição condicional já foi implementada anteriormente.

