

# Plano: Limpar chat de suporte após 24h sem conversa

## Problema

Atualmente, quando o cliente abre o balão de suporte, ele sempre reabre o último ticket aberto, mesmo que a conversa esteja parada há dias. O cliente fica preso na conversa antiga sem poder iniciar uma nova.

## Solução

Modificar a lógica do `ChatInterface.tsx` para considerar um ticket como "ativo" apenas se a última mensagem foi enviada nas últimas 24 horas. Se passou mais de 24h sem mensagens, o chat mostra o seletor de categorias (como se fosse uma conversa nova).

## Alteração

### Arquivo: `src/components/support/ChatInterface.tsx`

Na lógica que busca o ticket existente (linhas 52-64), adicionar verificação de tempo:

**Antes:**
```typescript
const openTicket = tickets.find(t => t.status !== 'closed' && t.status !== 'resolved');
```

**Depois:**
```typescript
const now = new Date();
const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

const openTicket = tickets.find(t => {
  if (t.status === 'closed' || t.status === 'resolved') return false;
  
  // Verificar se a última mensagem foi nas últimas 24h
  const lastMessageDate = new Date(t.last_message_at);
  return lastMessageDate > twentyFourHoursAgo;
});
```

## Resultado

- Se o ticket tem mensagens recentes (menos de 24h): reabre a conversa normalmente
- Se o ticket não tem mensagens há mais de 24h: mostra o seletor de categorias, permitindo iniciar uma nova conversa
- Nenhuma alteração no banco de dados necessária, pois o campo `last_message_at` já existe nos tickets

