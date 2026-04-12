

# Fix: creditar_carteira RPC call mismatch

## Problem
The `AdminWalletAdjustModal` calls `creditar_carteira` with parameters `p_valor_pago` and `p_payment_id` that don't exist in the database function signature.

**Actual function signature:**
```
creditar_carteira(
  p_user_id uuid,
  p_valor numeric,
  p_taxa numeric DEFAULT 0,
  p_descricao text DEFAULT 'Crédito',
  p_referencia_tipo text DEFAULT NULL,
  p_referencia_id uuid DEFAULT NULL,
  p_tipo wallet_transaction_tipo DEFAULT 'recarga'
)
```

## Fix
In `src/components/admin/AdminWalletAdjustModal.tsx`, remove `p_valor_pago` and `p_payment_id` from the RPC call and add `p_tipo: 'ajuste'` (or appropriate type).

```typescript
// Before (broken)
await supabase.rpc("creditar_carteira", {
  p_user_id: userId,
  p_valor: valorNum,
  p_taxa: taxa,
  p_valor_pago: valorNum + taxa,    // ← doesn't exist
  p_descricao: motivo.trim(),
  p_referencia_tipo: "ajuste_credito",
  p_referencia_id: null,
  p_payment_id: null,               // ← doesn't exist
});

// After (fixed)
await supabase.rpc("creditar_carteira", {
  p_user_id: userId,
  p_valor: valorNum,
  p_taxa: taxa,
  p_descricao: motivo.trim(),
  p_referencia_tipo: "ajuste_credito",
  p_referencia_id: null,
  p_tipo: "recarga",
});
```

One file changed: `src/components/admin/AdminWalletAdjustModal.tsx`

