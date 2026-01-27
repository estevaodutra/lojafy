
## Plano: Simplificar Visualização de Preços para Clientes

### Objetivo
Remover as informações detalhadas de composição de preço (taxas, custos, lucro) da visualização de clientes em `/minha-conta/pedidos`, exibindo apenas "Valor" e o valor pago.

---

### Análise do Problema

Atualmente, o `OrderDetailsModal.tsx` mostra para **todos os usuários** (incluindo clientes):
- Composição de Preço por produto (Taxa de Transação, Contingenciamento, Custo, Lucro)
- Resumo Financeiro do Pedido (mesmas informações agregadas)

Essas informações são sensíveis e devem ser visíveis apenas para administradores/revendedores, não para clientes finais.

---

### Solução

Usar a variável `isAdmin` já existente (linha 101) para condicionar a exibição dessas seções. Para clientes, mostrar apenas uma visualização simplificada com "Valor" e o total pago.

---

### Alterações em `src/components/OrderDetailsModal.tsx`

#### 1. Seção de Produtos (linhas 647-713)

**Antes:** Mostra breakdown de preço para todos
**Depois:** Mostrar breakdown apenas se `isAdmin`, senão nada (o valor já aparece no card do produto)

```typescript
{/* Breakdown de Precificação - Apenas para Admin */}
{isAdmin && (
  breakdown.costPrice > 0 ? (
    <div className="mt-3 ml-20 p-3 bg-muted/20 ...">
      {/* Composição de preço completa */}
    </div>
  ) : (
    <div className="mt-3 ml-20 p-3 bg-amber-50 ...">
      {/* Aviso de custo não disponível */}
    </div>
  )
)}
```

#### 2. Card "Resumo Financeiro do Pedido" (linhas 720-815)

**Antes:** Mostra resumo financeiro detalhado para todos
**Depois:** 
- Para Admin: Manter o resumo completo
- Para Cliente: Mostrar apenas "Valor" e o total pago

```typescript
<Card>
  <CardHeader>
    <CardTitle>
      {isAdmin ? 'Resumo Financeiro do Pedido' : 'Resumo do Pedido'}
    </CardTitle>
  </CardHeader>
  <CardContent>
    {isAdmin ? (
      {/* Resumo financeiro completo com deduções */}
    ) : (
      {/* Visualização simplificada */}
      <div className="flex justify-between items-center text-lg font-semibold">
        <span>Valor:</span>
        <span className="text-primary">
          {formatPrice(Number(order.total_amount))}
        </span>
      </div>
    )}
  </CardContent>
</Card>
```

---

### Visualização do Resultado

#### Para Clientes (após alteração):

```
┌──────────────────────────────────────────────────────────────┐
│ Produtos                                                     │
├──────────────────────────────────────────────────────────────┤
│ [IMG] Extensor Flexível De Torneira...       R$ 9,99    👁️  │
│       Quantidade: 1 • Preço unitário: R$ 9,99               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│ Resumo do Pedido                                             │
├──────────────────────────────────────────────────────────────┤
│ Valor:                                          R$ 9,99     │
└──────────────────────────────────────────────────────────────┘
```

#### Para Admins (mantém como está):

```
┌──────────────────────────────────────────────────────────────┐
│ Produtos                                                     │
├──────────────────────────────────────────────────────────────┤
│ [IMG] Extensor Flexível...                      R$ 9,99 👁️  │
│       Quantidade: 1 • Preço unitário: R$ 9,99               │
│                                                              │
│   📊 Composição de Preço (por unidade)                      │
│   Preço de Venda:                               R$ 9,99     │
│     (-) Taxa de Transação (4.5%):               R$ 0,45     │
│     (-) Contingenciamento (1%):                 R$ 0,10     │
│     (-) Preço de Custo:                         R$ 9,00     │
│   ──────────────────────────────────────────────────────    │
│   ↗ Lucro:                                      R$ 0,45     │
└──────────────────────────────────────────────────────────────┘
```

---

### Resumo das Alterações

| Arquivo | Alteração |
|---------|-----------|
| `src/components/OrderDetailsModal.tsx` | Envolver seção de breakdown com `{isAdmin && (...)}` |
| `src/components/OrderDetailsModal.tsx` | Condicionar card de Resumo Financeiro por role |

---

### Benefícios

- Clientes veem apenas o valor que pagaram (informação relevante para eles)
- Informações comerciais sensíveis (custos, margens, taxas) ficam protegidas
- Admins continuam tendo visão completa para gestão
