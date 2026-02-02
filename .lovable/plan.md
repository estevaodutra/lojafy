
# Plano: Padronizar Status de Pedidos em Todo o Sistema

## Situacao Atual

O sistema apresenta **inconsistencia nos labels de status de pedidos** exibidos na interface. O banco de dados utiliza valores em ingles (`pending`, `processing`, `shipped`, `delivered`, `cancelled`, `refunded`), mas a API externa foi configurada para usar termos em portugues. Os labels exibidos na UI nao estao alinhados com a nova nomenclatura.

### Mapeamento Padrao a Ser Adotado

| Valor no Banco (EN) | Label Exibido na UI (PT) |
|---------------------|--------------------------|
| `pending` | **Pendente** |
| `processing` | **Em preparacao** |
| `shipped` | **Despachado** |
| `delivered` | **Finalizado** |
| `cancelled` | **Cancelado** |
| `refunded` | **Reembolsado** |

---

## Arquivos a Modificar

### 1. `src/pages/admin/Orders.tsx`
**Linhas 169-177, 257-263, 337-344**

Atualizar:
- `getStatusBadge()`: Alterar labels de `Processando/Enviado/Entregue` para `Em preparacao/Despachado/Finalizado`
- Filtros de status (Select): Atualizar opcoes
- Dropdown de edicao de status: Atualizar opcoes

### 2. `src/pages/reseller/Orders.tsx`
**Linhas 12-18, 91-96**

Atualizar:
- `statusConfig`: Alterar labels para o novo padrao
- Adicionar status `refunded` que esta faltando
- TabsList: Atualizar nomes das abas

### 3. `src/pages/supplier/OrderManagement.tsx`
**Linhas 24-31, 114-122**

Atualizar:
- `getStatusBadge()`: Alterar labels
- Filtros de status: Atualizar opcoes

### 4. `src/components/OrderDetailsModal.tsx`
**Linhas 430-446**

Atualizar:
- `getStatusLabel()`: Alterar labels para o novo padrao
- Mudar `Aguardando pagamento` para `Pendente`
- Mudar `Processando` para `Em preparacao`
- Mudar `Enviado` para `Despachado`
- Mudar `Entregue` para `Finalizado`

### 5. `src/pages/customer/Orders.tsx`
**Linhas 95-111**

Atualizar:
- `getStatusLabel()`: Alterar labels para o novo padrao

### 6. `src/pages/customer/Dashboard.tsx`
**Linhas 65-71**

Atualizar:
- `getStatusLabel()`: Alterar labels para o novo padrao

### 7. `src/components/admin/OrdersManagementSection.tsx`
**Linhas 158-166**

Atualizar:
- `getStatusLabel()`: Alterar labels para o novo padrao

### 8. `src/components/admin/UserDetailsModal.tsx`
**Linhas 218-227**

Atualizar:
- `getStatusBadge()`: Alterar labels para o novo padrao

### 9. `src/pages/RastrearPedido.tsx`
**Linhas 113-124**

Atualizar:
- `getStatusBadge()`: Alterar labels para o novo padrao (incluindo status adicionais)

---

## Abordagem Alternativa (Recomendada para Futuro)

Para evitar duplicacao de codigo e facilitar manutencao futura, seria ideal criar um arquivo centralizado de constantes:

**Arquivo futuro:** `src/constants/orderStatus.ts`
```typescript
export const ORDER_STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  processing: 'Em preparacao',
  shipped: 'Despachado',
  delivered: 'Finalizado',
  cancelled: 'Cancelado',
  refunded: 'Reembolsado',
};
```

Porem, para esta implementacao inicial, vamos atualizar cada arquivo individualmente para minimizar o impacto nas importacoes existentes.

---

## Resumo das Alteracoes

| Arquivo | Tipo de Alteracao |
|---------|-------------------|
| `src/pages/admin/Orders.tsx` | Labels + Filtros + Dropdown |
| `src/pages/reseller/Orders.tsx` | Labels + Tabs + Adicionar refunded |
| `src/pages/supplier/OrderManagement.tsx` | Labels + Filtros |
| `src/components/OrderDetailsModal.tsx` | Labels |
| `src/pages/customer/Orders.tsx` | Labels |
| `src/pages/customer/Dashboard.tsx` | Labels |
| `src/components/admin/OrdersManagementSection.tsx` | Labels |
| `src/components/admin/UserDetailsModal.tsx` | Labels |
| `src/pages/RastrearPedido.tsx` | Labels |

---

## Resultado Esperado

Apos as alteracoes, todos os locais do sistema exibirao os mesmos labels padronizados:
- **Pendente** (antes: Pendente/Aguardando pagamento)
- **Em preparacao** (antes: Processando)
- **Despachado** (antes: Enviado)
- **Finalizado** (antes: Entregue)
- **Cancelado** (sem alteracao)
- **Reembolsado** (sem alteracao)

