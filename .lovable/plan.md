

# Corrigir Notificacoes da Plataforma

## Problemas Encontrados

1. **Notificacoes de pedidos nao disparam**: As funcoes de trigger comparam status em ingles (`confirmed`, `shipped`, etc.) mas o banco usa portugues (`recebido`, `enviado`, etc.).
2. **Produto desativado nao notifica ninguem**: A funcao `notify_product_removed` so notifica quem favoritou o produto. Se ninguem favoritou, ninguem recebe.

## Alteracoes

### 1. Migracao SQL - Corrigir status nas funcoes de pedido

Recriar 4 funcoes com os status corretos:

| Funcao | Status atual (errado) | Status correto |
|--------|----------------------|----------------|
| `notify_order_confirmed` | `confirmed` | `recebido` |
| `notify_order_shipped` | `shipped` | `enviado` |
| `notify_order_delivered` | `delivered` | `finalizado` |
| `notify_order_expired` | `cancelled` / `expired` | `cancelado` / `expired` |

Recriar o trigger `trigger_notify_order_expired` com WHEN corrigido para `NEW.status = 'cancelado'`.

### 2. Migracao SQL - Produto desativado notifica todos os clientes

Atualizar `notify_product_removed` para enviar notificacao a **todos os clientes ativos** (tabela `profiles` com `role = 'customer' AND is_active = true`) em vez de consultar apenas a tabela `favorites`.

### Detalhes tecnicos

**Funcoes de pedido** - cada uma sera recriada com `CREATE OR REPLACE FUNCTION` trocando a string de comparacao de status.

**Trigger de pedido expirado** - precisa ser dropado e recriado pois a clausula WHEN faz parte da definicao do trigger:

```text
DROP TRIGGER IF EXISTS trigger_notify_order_expired ON public.orders;
CREATE TRIGGER trigger_notify_order_expired 
  AFTER UPDATE ON public.orders 
  FOR EACH ROW 
  WHEN (NEW.status = 'cancelado' AND NEW.payment_status = 'expired')
  EXECUTE FUNCTION notify_order_expired();
```

**Produto desativado** - a funcao `notify_product_removed` deixa de filtrar por `favorites` e passa a inserir notificacoes para todos os clientes ativos:

```text
INSERT INTO notifications (user_id, title, message, type, metadata)
SELECT 
  p.user_id, ...
FROM profiles p
WHERE p.role = 'customer' AND p.is_active = true;
```

