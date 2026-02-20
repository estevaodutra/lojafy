

## Corrigir Acesso ao Gerenciamento de Produtos

### Problema

A tabela `feature_produtos` e as colunas `gerencia_produtos`/`limite_produtos` foram criadas no banco, mas o cache do PostgREST (API do Supabase) nao foi recarregado apos a migracao. Isso faz com que as operacoes de salvar esses novos campos falhem silenciosamente -- por isso, mesmo apos ativar "Gerencia Produtos" e salvar, o valor nao persiste no banco.

### Solucao

Executar o comando SQL abaixo para forcar o PostgREST a reconhecer as novas colunas e tabela:

```text
NOTIFY pgrst, 'reload schema';
```

Isso sera feito via uma migracao SQL simples.

### Alteracao

**Arquivo: Nova migracao SQL**
- Criar migracao contendo apenas `NOTIFY pgrst, 'reload schema';`
- Apos aplicada, o PostgREST passara a reconhecer `gerencia_produtos`, `limite_produtos` na tabela `features` e a tabela `feature_produtos`

### Resultado esperado

1. O superadmin salva a feature com "Gerencia Produtos" ativado -- o valor persiste no banco
2. O card da feature mostra "X produtos vinculados"
3. O menu exibe a opcao "Gerenciar Produtos"
4. Ao clicar, o modal abre e permite buscar/adicionar/reordenar produtos

### Secao Tecnica

- Nenhuma alteracao de codigo frontend necessaria
- Apenas 1 migracao SQL com `NOTIFY pgrst, 'reload schema'`
- Causa raiz: PostgREST mantem cache do schema e nao detecta automaticamente novas colunas/tabelas criadas por DDL

