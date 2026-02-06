

# Corrigir botão "Voltar ao Menu" no chat de suporte

## Problema

Quando o usuário clica no botão de voltar (seta), o código faz:
1. `setCurrentTicketId(null)` 
2. `setShowCategorySelector(true)`

Porém, o `useEffect` que busca tickets abertos tem `currentTicketId` como dependência. Quando o `currentTicketId` muda para `null`, o efeito roda novamente, encontra o mesmo ticket aberto (que está dentro das 24h), e imediatamente define o `currentTicketId` de volta — anulando a ação do botão.

## Solução

Adicionar uma variável de estado `manuallyReturnedToMenu` que funciona como uma "trava". Quando o usuário clica no botão de voltar, essa flag é ativada, impedindo o `useEffect` de re-selecionar o ticket automaticamente.

## Detalhes Técnicos

### Arquivo: `src/components/support/ChatInterface.tsx`

1. **Novo estado**: Adicionar `const [manuallyReturnedToMenu, setManuallyReturnedToMenu] = useState(false);`

2. **Modificar o useEffect** (linhas 53-73): Adicionar verificação no início — se `manuallyReturnedToMenu` for `true`, não buscar ticket automaticamente.

3. **No botão de voltar** (linhas 272-280): Ao clicar, além de limpar o ticket e mostrar o seletor, ativar `setManuallyReturnedToMenu(true)`.

4. **Na seleção de categoria** (`handleCategorySelect`): Resetar `setManuallyReturnedToMenu(false)` para que o comportamento automático volte ao normal após iniciar uma nova conversa.

5. **Quando o chat fecha** (`onClose`): Resetar a flag para que ao reabrir o chat, o comportamento automático funcione normalmente.

