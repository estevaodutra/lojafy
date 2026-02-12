

# Correcoes no Sistema de Notificacoes de Produto Desativado

## Problemas Identificados

### 1. Notificacoes nao chegam para todos os usuarios
O template `product_removed` esta configurado com `target_audience: all_customers`, que envia apenas para usuarios com `role = 'customer'`. Usuarios com outros papeis (revendedores, fornecedores, admins) nao recebem a notificacao. Existem 134 clientes ativos no banco.

### 2. Log tab nao aparece
O codigo da aba "Log" ja existe no componente, mas pode nao estar publicado na versao de producao. Alem disso, faltam labels para `product_removed` no mapa de tipos.

### 3. Labels faltando
- `TRIGGER_LABELS` (linha 177-187) nao inclui `product_removed`
- `getAudienceLabel` (linha 164-175) nao inclui `all_customers`

## Alteracoes

### 1. Atualizar target_audience do template para enviar a TODOS

**Migracao SQL:**
- Alterar o template `product_removed` para `target_audience = 'all'` na tabela `notification_templates`
- Atualizar a funcao `send_automatic_notification` para suportar `target_audience = 'all'` - enviando para TODOS os perfis ativos independente do role

### 2. Adicionar labels faltantes no frontend

**Arquivo `src/pages/admin/NotificationsManagement.tsx`:**

Adicionar no `TRIGGER_LABELS` (linha 187):
- `product_removed: 'Produto indisponivel'`

Adicionar no `getAudienceLabel` (linha 173):
- `'all_customers': 'Todos os clientes'`

### Detalhes tecnicos

**SQL - Atualizar `send_automatic_notification`:**

Adicionar novo branch para `target_audience = 'all'`:

```text
ELSIF v_template.target_audience = 'all' THEN
  INSERT INTO notifications (...)
  SELECT p.user_id, ...
  FROM profiles p
  WHERE p.is_active = true;
```

Tambem atualizar o template existente:

```text
UPDATE notification_templates 
SET target_audience = 'all'
WHERE trigger_type = 'product_removed';
```

**Frontend - Labels:**
- Mapa `TRIGGER_LABELS`: adicionar `product_removed`
- Mapa `getAudienceLabel`: adicionar `all_customers`

