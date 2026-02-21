

## Corrigir Filtro "Top 10" - Problema de Permissao RLS

### Problema Identificado

Os dados existem corretamente no banco (10 produtos vinculados na tabela `feature_produtos`), mas a politica de seguranca (RLS) da tabela `feature_produtos` so permite leitura para administradores (`is_admin_user()`). Quando um revendedor tenta buscar os produtos Top 10, a query retorna vazio porque ele nao tem permissao de leitura.

### Solucao

Adicionar uma politica RLS de SELECT na tabela `feature_produtos` que permita todos os usuarios autenticados lerem registros ativos. Isso e seguro porque os dados de vinculacao de produtos a features nao sao sensiveis.

### Alteracao

**Migracao SQL** - Criar nova politica de leitura publica para `feature_produtos`:

```text
CREATE POLICY "Anyone can read active feature_produtos"
  ON feature_produtos
  FOR SELECT
  TO authenticated
  USING (ativo = true);
```

Isso permite que qualquer usuario autenticado (incluindo revendedores) leia os registros onde `ativo = true`, mantendo as restricoes de INSERT/UPDATE/DELETE apenas para admins.

### Arquivos alterados

1. Nova migracao SQL para adicionar a politica RLS

Nenhuma alteracao de codigo necessaria -- o hook `useResellerCatalog.ts` ja esta correto.

