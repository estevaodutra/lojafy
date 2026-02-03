

# Plano: Unificar Colunas Status e Ações

## Objetivo

Unificar as colunas "Status" e "Ações" em uma única coluna chamada "Status de Envio" que contém um menu suspenso (dropdown) para alterar o status do pedido.

---

## Alterações

### Arquivo: `src/pages/admin/Orders.tsx`

**1. Remover função getStatusBadge (linhas 169-181):**

Esta função não será mais necessária pois o status será exibido diretamente no Select.

**2. Atualizar o TableHeader (linhas 272-282):**

Remover a coluna "Status" e renomear "Ações" para "Status de Envio":

De:
```tsx
<TableHead>Status</TableHead>
<TableHead>Pagamento</TableHead>
<TableHead>Etiqueta</TableHead>
<TableHead>Total</TableHead>
<TableHead>Ações</TableHead>
```

Para:
```tsx
<TableHead>Pagamento</TableHead>
<TableHead>Etiqueta</TableHead>
<TableHead>Total</TableHead>
<TableHead>Ações</TableHead>
<TableHead>Status de Envio</TableHead>
```

**3. Atualizar as TableCell no body (linhas 299-347):**

Remover a célula de Status (Badge) e reorganizar a célula de Ações para conter apenas o botão de visualizar, enquanto a nova coluna "Status de Envio" terá o Select:

De:
```tsx
<TableCell>{getStatusBadge(order.status)}</TableCell>
<TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
<TableCell>...</TableCell>
<TableCell>R$ {order.total_amount.toFixed(2)}</TableCell>
<TableCell>
  <div className="flex gap-2">
    <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
      <Eye className="w-4 h-4" />
    </Button>
    <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
      ...
    </Select>
  </div>
</TableCell>
```

Para:
```tsx
<TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
<TableCell>...</TableCell>
<TableCell>R$ {order.total_amount.toFixed(2)}</TableCell>
<TableCell>
  <Button variant="outline" size="sm" onClick={() => setSelectedOrder(order)}>
    <Eye className="w-4 h-4" />
  </Button>
</TableCell>
<TableCell>
  <Select value={order.status} onValueChange={(value) => updateOrderStatus(order.id, value)}>
    <SelectTrigger className="w-[140px]">
      <SelectValue />
    </SelectTrigger>
    <SelectContent>
      <SelectItem value="pending">Pendente</SelectItem>
      <SelectItem value="processing">Em preparação</SelectItem>
      <SelectItem value="shipped">Despachado</SelectItem>
      <SelectItem value="delivered">Finalizado</SelectItem>
      <SelectItem value="cancelled">Cancelado</SelectItem>
      <SelectItem value="refunded">Reembolsado</SelectItem>
    </SelectContent>
  </Select>
</TableCell>
```

**4. Atualizar colSpan dos estados de loading e empty (linhas 287 e 293):**

Alterar de `colSpan={8}` para `colSpan={8}` (mantém igual pois removemos uma coluna e adicionamos outra).

---

## Layout Visual Esperado

```
┌────────────────┬──────────┬────────────┬─────────┬───────────┬─────────┬────────┬────────────────┐
│ Número Pedido  │ Cliente  │ Data       │ Pagamen │ Etiqueta  │ Total   │ Ações  │ Status Envio   │
├────────────────┼──────────┼────────────┼─────────┼───────────┼─────────┼────────┼────────────────┤
│ ORD-123...     │ RAFAEL   │ 03/02/2026 │ Pago    │ 📄 Enviad │ R$7.77  │   👁   │ Em preparação▼ │
│ ORD-456...     │ RAFAEL   │ 02/02/2026 │ Pago    │ 📄 Enviad │ R$7.77  │   👁   │ Despachado   ▼ │
└────────────────┴──────────┴────────────┴─────────┴───────────┴─────────┴────────┴────────────────┘
```

---

## Resumo das Alterações

| Linha | Alteração |
|-------|-----------|
| 169-181 | Manter função `getStatusBadge` (usada no filtro) |
| 277 | Remover `<TableHead>Status</TableHead>` |
| 281 | Renomear `<TableHead>Ações</TableHead>` e adicionar `<TableHead>Status de Envio</TableHead>` |
| 307 | Remover célula `{getStatusBadge(order.status)}` |
| 321-346 | Separar botão Eye e Select em células distintas |

---

## Benefícios

1. Interface mais limpa com menos colunas redundantes
2. Status diretamente editável pelo dropdown
3. Coluna "Status de Envio" com nome mais descritivo
4. Botão de visualização separado para melhor usabilidade

