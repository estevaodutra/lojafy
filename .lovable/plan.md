

# Auto-marcar notificacoes como lidas ao abrir o menu

## Contexto

Sobre a notificacao ao **ativar** um produto: o trigger `on_product_deactivated` so dispara quando o produto muda de ativo para inativo. Ativar um produto nao gera notificacao, e esse e o comportamento esperado (nao faz sentido notificar que um produto voltou).

A alteracao principal e fazer com que ao abrir o menu do sino, todas as notificacoes sejam marcadas como lidas automaticamente.

## Alteracoes

### 1. `src/hooks/useNotifications.ts`

Adicionar nova funcao `markAllAsReadSilent`:
- Faz update otimista no estado local (todas as notificacoes ficam `is_read: true` imediatamente)
- Envia UPDATE para o Supabase em background
- Sem toast de sucesso para nao poluir a experiencia
- Exportar a nova funcao no retorno do hook

### 2. `src/components/NotificationBell.tsx`

- Importar `markAllAsReadSilent` do hook
- Adicionar `onOpenChange` no componente `Popover`
- Quando o popover abrir e houver notificacoes nao lidas, chamar `markAllAsReadSilent()`
- Remover o botao manual "Marcar todas como lidas" do header do popover (fica redundante)

## Detalhes tecnicos

**useNotifications.ts - nova funcao:**

```text
const markAllAsReadSilent = async () => {
  if (!user) return;
  setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false);
};
```

**NotificationBell.tsx - onOpenChange:**

```text
const { notifications, unreadCount, loading, markAllAsReadSilent } = useNotifications();

const handleOpenChange = (open: boolean) => {
  if (open && unreadCount > 0) {
    markAllAsReadSilent();
  }
};

<Popover onOpenChange={handleOpenChange}>
```

O header do popover ficara apenas com o titulo "Notificacoes", sem o botao de marcar como lidas.
