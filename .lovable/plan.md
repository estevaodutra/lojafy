

# Adicionar Template de Notificacao para Produto Desativado

## Contexto

Atualmente, a funcao `notify_product_removed` insere notificacoes diretamente na tabela `notifications` com titulo e mensagem fixos no codigo SQL. Isso impede que o admin personalize o texto pelo painel de templates. Os demais triggers (preco, estoque, pedidos, aulas) ja usam o sistema de templates via `send_automatic_notification`.

## Alteracoes

### 1. Migracao SQL

**Inserir template na tabela `notification_templates`:**
- `trigger_type`: `product_removed`
- `title_template`: `⚠️ Produto Indisponível`
- `message_template`: `O produto "{PRODUCT_NAME}" não está mais disponível.`
- `target_audience`: `all_customers` (novo audience type para o `send_automatic_notification`)
- `active`: true

**Atualizar funcao `notify_product_removed`** para usar `send_automatic_notification` em vez de INSERT direto, passando as variaveis `PRODUCT_ID` e `PRODUCT_NAME`.

**Atualizar funcao `send_automatic_notification`** para suportar o novo target_audience `all_customers` que envia para todos os perfis com `role = 'customer' AND is_active = true`.

### 2. Frontend - Tipo no TypeScript

**Arquivo `src/types/notifications.ts`:**
- Adicionar `'product_removed'` ao tipo `AutomaticTriggerType`

### 3. Frontend - Variaveis do Template

**Arquivo `src/components/admin/TemplateVariableHelper.tsx`:**
- Adicionar entrada `product_removed` no `VARIABLES_BY_TRIGGER` com variaveis `PRODUCT_ID` e `PRODUCT_NAME`

### 4. Frontend - Exemplos no hook

**Arquivo `src/hooks/useNotificationTemplates.ts`:**
- Adicionar `product_removed` no objeto `examples` dentro de `getExampleVariablesForTrigger`

## Detalhes tecnicos

### SQL - Funcao `notify_product_removed` atualizada

```text
CREATE OR REPLACE FUNCTION notify_product_removed()
RETURNS trigger AS $$
BEGIN
  IF OLD.active = true AND NEW.active = false THEN
    PERFORM send_automatic_notification(
      'product_removed',
      jsonb_build_object(
        'PRODUCT_ID', NEW.id::text,
        'PRODUCT_NAME', NEW.name
      )
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### SQL - Novo branch em `send_automatic_notification`

Adicionar `ELSIF v_template.target_audience = 'all_customers'` que faz:

```text
INSERT INTO notifications (...)
SELECT p.user_id, ...
FROM profiles p
WHERE p.role = 'customer' AND p.is_active = true;
```

### TypeScript - Nova entrada no tipo

```text
export type AutomaticTriggerType =
  | 'price_decrease'
  | ...
  | 'product_removed';   -- novo
```

### TypeScript - Variaveis do template

```text
product_removed: [
  { key: 'PRODUCT_ID', description: 'ID do produto', example: 'abc123' },
  { key: 'PRODUCT_NAME', description: 'Nome do produto', example: 'Smartphone XYZ' },
],
```

