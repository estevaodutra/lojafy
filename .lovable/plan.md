
# Log de Notificacoes Automaticas

## Contexto

As notificacoes automaticas (produto desativado, pedido enviado, etc.) estao funcionando corretamente. O produto desativado gerou 268 notificacoes. Porem, essas notificacoes nao aparecem na aba "Historico" porque ela so consulta a tabela `notification_campaigns` (envios manuais). As notificacoes automaticas sao inseridas diretamente na tabela `notifications` pelos triggers.

## Alteracao

### Adicionar aba "Log de Notificacoes" na pagina de Gerenciamento de Notificacoes

Nova aba que consulta a tabela `notifications` agrupando por tipo + titulo + mensagem (nao por usuario), exibindo:

- Tipo da notificacao (badge colorido)
- Titulo
- Mensagem (truncada)
- Total enviado
- Total lido
- Taxa de leitura (%)
- Data/hora do envio

### Arquivo: `src/pages/admin/NotificationsManagement.tsx`

1. Adicionar nova aba "Log" no `TabsList`
2. Criar `TabsContent` com tabela agrupada
3. Adicionar estado e funcao para buscar os dados agrupados da tabela `notifications`
4. A consulta SQL agrupara por `type`, `title`, `message` e retornara contagens agregadas (total enviado, total lido)
5. Adicionar filtro por tipo de notificacao (product_removed, order_shipped, new_lesson, etc.)

### Detalhes tecnicos

A consulta usara o Supabase client com RPC ou query direta. Como o Supabase JS nao suporta GROUP BY nativamente, sera criada uma funcao RPC no banco:

**Nova funcao SQL `get_notification_logs`:**
- Agrupa notificacoes por `type`, `title`, `message`
- Retorna: type, title, message, total_sent (COUNT), total_read (COUNT WHERE is_read=true), read_rate (%), first_sent_at (MIN created_at)
- Ordenado por data mais recente
- Limite de 100 registros

**Migracao SQL:**

```text
CREATE OR REPLACE FUNCTION get_notification_logs(p_limit integer DEFAULT 100)
RETURNS TABLE(
  type text,
  title text, 
  message text,
  total_sent bigint,
  total_read bigint,
  read_rate numeric,
  sent_at timestamptz
)
```

**Frontend:**
- Nova aba "Log" com icone de lista
- Tabela com colunas: Tipo | Titulo | Mensagem | Enviados | Lidos | Taxa | Data
- Badges coloridos por tipo (product_removed = vermelho, order_shipped = azul, new_lesson = verde, etc.)
- Filtro dropdown por tipo de notificacao
- Botao de refresh
