

# Criar trigger de reativacao de produto

## O que sera feito

Criar um novo template `product_reactivated` e um trigger no banco de dados que notifica **todos os clientes ativos** quando um produto e reativado (muda de `active = false` para `active = true`).

O template `back_in_stock` existente nao sera reutilizado porque ele tem `target_audience = favorites_only` (so notifica quem favoritou). O novo template tera `target_audience = all_customers` para notificar toda a base.

## Alteracoes no banco de dados (SQL Migration)

### 1. Inserir novo template `product_reactivated`

Adicionar um registro na tabela `notification_templates` com:
- `trigger_type`: `product_reactivated`
- `target_audience`: `all_customers`
- `title_template`: "O produto {PRODUCT_NAME} esta disponivel novamente!"
- `message_template`: "O produto {PRODUCT_NAME} voltou ao catalogo. Aproveite!"
- `action_url_template`: `/produto/{PRODUCT_ID}`
- `action_label`: "Ver Produto"

### 2. Criar funcao `notify_product_reactivated()`

Funcao PL/pgSQL que verifica se `OLD.active = false AND NEW.active = true` e chama `send_automatic_notification('product_reactivated', ...)` com as variaveis `PRODUCT_ID` e `PRODUCT_NAME`.

### 3. Criar trigger `on_product_reactivated`

Trigger `AFTER UPDATE` na tabela `products` que executa a funcao acima.

## Alteracoes no codigo

### 1. `src/types/notifications.ts`

Adicionar `'product_reactivated'` ao tipo `AutomaticTriggerType`.

### 2. `src/components/admin/NotificationTemplateCard.tsx`

Adicionar icone e label para o novo trigger:
- Icone: `Package` (ou `PackageCheck`)
- Label: "Produto reativado"

### 3. `src/hooks/useNotificationTemplates.ts`

Adicionar variaveis de exemplo para `product_reactivated`:
```text
product_reactivated: {
  PRODUCT_ID: '00000000-...',
  PRODUCT_NAME: 'Produto de Exemplo',
}
```

## Fluxo resultante

```text
Admin ativa produto (active: false -> true)
  -> Trigger on_product_reactivated dispara
  -> Funcao notify_product_reactivated() executa
  -> Busca template product_reactivated (se ativo)
  -> send_automatic_notification() envia para all_customers
  -> Todos os clientes ativos recebem a notificacao
```

