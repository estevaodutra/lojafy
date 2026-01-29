
# Plano: Remover Dados Fictícios do Dashboard do Revendedor

## Problema Identificado

O Dashboard do Revendedor (`src/pages/reseller/Dashboard.tsx`) exibe dados **hardcoded** em duas seções:

| Seção | Problema |
|-------|----------|
| **Metas do Mês** | Valores fixos: "89/120 (74%)", "R$ 2.450/R$ 3.000 (82%)", "5/10 (50%)" |
| **Vendas Recentes** | Lista gerada com `[1, 2, 3, 4, 5].map()` com valores fictícios |

---

## Solução

### Opção A: Remover Completamente as Seções (Recomendado)
Como não existe uma tabela de metas no banco de dados e não há pedidos reais de revendedores, a melhor abordagem é **remover as seções fictícias** e manter apenas os dados reais vindos do hook `useResellerSales`.

### Opção B: Substituir por Dados Reais
Criar um hook para buscar os últimos 5 pedidos reais do revendedor e calcular metas com base em dados do banco.

---

## Alterações (Opção A - Recomendada)

### 1. Dashboard.tsx — Remover Seções Fictícias

**Linhas 160-237** — Remover todo o grid com "Metas do Mês" e "Vendas Recentes":

```typescript
// REMOVER este bloco inteiro:
<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
  {/* Goals Section - Now First */}
  <Card>... Metas do Mês ...</Card>
  
  {/* Recent Sales Section - Now Second */}  
  <Card>... Vendas Recentes ...</Card>
</div>
```

**Imports não utilizados** — Remover `Target` e `UserPlus` dos imports do lucide-react

---

## Alternativa (Opção B - Dados Reais)

Se preferir manter as seções com dados reais:

### 1. Criar Hook `useResellerRecentOrders`

```typescript
// src/hooks/useResellerRecentOrders.ts
export const useResellerRecentOrders = () => {
  // Buscar últimos 5 pedidos do revendedor
  // Incluir nome do cliente e valor da comissão
};
```

### 2. Atualizar "Vendas Recentes" no Dashboard

- Usar dados reais do hook
- Mostrar estado vazio se não houver pedidos: "Nenhuma venda ainda. Compartilhe sua loja!"

### 3. Para "Metas do Mês"

- **Problema:** Não existe tabela de metas no banco de dados
- **Solução:** Remover completamente OU criar sistema de metas (tabela + CRUD)

---

## Arquivos Modificados

| Arquivo | Alteração |
|---------|-----------|
| `src/pages/reseller/Dashboard.tsx` | Remover seções com dados fictícios |

---

## Decisão Necessária

Qual abordagem você prefere?

| Opção | Resultado |
|-------|-----------|
| **A - Remover** | Dashboard limpo, apenas com dados reais do "Resumo do Mês" |
| **B - Dados Reais** | Manter seções, mas com dados do banco (requer criar hook) |

A **Opção A** é mais rápida e evita exibir seções vazias/incompletas. A **Opção B** requer mais trabalho mas mantém o layout original.
