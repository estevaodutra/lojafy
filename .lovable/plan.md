
# Corrigir Erro ao Gerar PIX

## Causa Raiz

A Edge Function `create-pix-payment` insere o pedido com `status: 'pending'` (inglês), mas o banco de dados tem uma constraint (`orders_status_check`) que só aceita valores em **português**:

```
'pendente', 'recebido', 'em_preparacao', 'embalado', 'enviado',
'em_reposicao', 'em_falta', 'finalizado', 'cancelado', 'reembolsado'
```

O `payment_status: 'pending'` está correto (aceito pela constraint `orders_payment_status_check`).

## Correção

### Arquivo: `supabase/functions/create-pix-payment/index.ts`

Alterar linha 344:
- De: `status: 'pending'`
- Para: `status: 'pendente'`

Essa é a única alteração necessária. O PIX está sendo gerado com sucesso pelo N8N (retorna QR Code), mas falha ao salvar o pedido no banco.
