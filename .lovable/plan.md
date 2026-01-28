
# Plano: Verificação e Melhoria da Exibição de Features

## Situação Atual

O sistema de Features foi implementado corretamente no banco de dados, mas a interface pode não estar aparecendo por:
1. Cache do navegador (tente Ctrl+Shift+R para forçar atualização)
2. Deploy ainda não completou

## Verificações Necessárias

### 1. Menu "Features" no sidebar
O menu deveria aparecer entre "Financeiro" e "</> API Docs". Se não aparecer:
- Limpar cache do navegador
- Verificar se o build completou

### 2. Seção Features no Modal de Usuário
Para ver as features de um usuário:
1. Na lista de usuários, clique no ícone de olho (👁️) na coluna "Ações"
2. O modal de detalhes abrirá com uma seção "Features do Usuário" no final
3. Lá você pode atribuir ou revogar features

## Melhorias Propostas

### Adicionar indicador de features na tabela de usuários

Para facilitar a visualização, posso adicionar uma coluna "Features" na tabela de usuários mostrando um contador ou badges das features ativas.

#### Alterações necessárias:

**1. Modificar `UnifiedUsersTable.tsx`**
- Adicionar nova coluna "Features" após "Plano"
- Mostrar badge com contador de features ativas
- Tooltip com nomes das features ao passar o mouse

**2. Modificar `Clientes.tsx`**
- Buscar contagem de features por usuário (query adicional)
- Passar dados para a tabela

**3. Criar hook `useUsersFeatureCount.ts`** (opcional)
- Buscar contagem de features de todos usuários de forma eficiente

### Exemplo visual da nova coluna:

```text
| Email | Role | Plano | Features | Pedidos |
|-------|------|-------|----------|---------|
| user@mail.com | Revendedor | Premium | 🏪 3 | 5 |
| outro@mail.com | Cliente | - | - | 0 |
```

## Ordem de Execução

1. Atualizar UnifiedUsersTable para aceitar dados de features
2. Atualizar Clientes.tsx para buscar e passar dados de features
3. Criar query SQL ou RPC para buscar contagem de features em lote

## Arquivos a Modificar

| Arquivo | Alteração |
|---------|-----------|
| `src/components/admin/UnifiedUsersTable.tsx` | Adicionar coluna Features |
| `src/pages/admin/Clientes.tsx` | Buscar dados de features dos usuários |

## Solução Rápida Alternativa

Se preferir não adicionar a coluna, basta clicar no ícone de olho (👁️) na linha de qualquer usuário para ver e gerenciar suas features no modal de detalhes.
