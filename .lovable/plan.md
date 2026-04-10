

# Redimensionar popup de pagamento PIX na carteira

## Problema
O modal `AddBalanceModal` usa `sm:max-w-lg` mas o `ModernPixPayment` dentro dele renderiza múltiplos Cards grandes (valor, QR code, código PIX, instruções), causando overflow visível na screenshot.

## Solução
1. **Aumentar o `DialogContent`** para `sm:max-w-md` quando exibindo PIX (já é `sm:max-w-lg`, mas o conteúdo precisa de scroll)
2. **Adicionar `max-h-[80vh] overflow-y-auto`** ao container do PIX dentro do modal para permitir scroll
3. **Compactar o `ModernPixPayment`** quando usado dentro do modal: reduzir padding, tamanho do QR code (de `w-48 h-48` para `w-36 h-36`), remover cards redundantes e consolidar em layout mais compacto

## Arquivo afetado

| Arquivo | Ação |
|---------|------|
| `src/components/wallet/AddBalanceModal.tsx` | Adicionar scroll e wrapper compacto ao redor do ModernPixPayment |
| `src/components/ModernPixPayment.tsx` | Não alterar (usado também no checkout) |

## Abordagem
Envolver o `ModernPixPayment` em um `div` com `max-h-[70vh] overflow-y-auto` dentro do `AddBalanceModal`, e mudar o `DialogContent` para `sm:max-w-md` para melhor centralização em mobile.

