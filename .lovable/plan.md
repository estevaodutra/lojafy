
# Plano: Criar Pagina "Logs" na API Docs

## Contexto

O sistema ja possui a tabela `webhook_dispatch_logs` que registra todos os eventos de webhooks disparados pela plataforma. A nova pagina "Logs" sera adicionada a documentacao da API para exibir esses registros em tempo real, permitindo aos administradores visualizar todos os eventos enviados/recebidos com seus respectivos payloads.

## Estrutura Atual

```text
API Docs (sidebar)
  - Introducao
  - Autenticacao
  - Chaves de API
  - Webhooks
  - [Endpoints...]
```

## Estrutura Proposta

```text
API Docs (sidebar)
  - Introducao
  - Autenticacao
  - Chaves de API
  - Webhooks
  - Logs (NOVO)      <-- Adicionar aqui
  - [Endpoints...]
```

---

## Arquivos a Criar

### 1. `src/components/admin/ApiLogsSection.tsx`
Componente principal que renderiza a pagina de logs com:
- Tabela de logs com colunas: Data/Hora, Evento, Status, Payload, Resposta
- Filtros por tipo de evento (order.paid, user.created, etc)
- Filtro por periodo (ultimas 24h, 7 dias, 30 dias)
- Filtro por status (sucesso/erro)
- Paginacao para navegacao
- Botao de refresh para atualizar dados
- Funcao de expandir/colapsar para ver payloads completos
- Indicador visual de status (verde = 2xx, vermelho = erro)

### 2. `src/hooks/useApiLogs.ts`
Hook customizado para buscar e gerenciar os logs:
- Query para `webhook_dispatch_logs` com filtros
- Paginacao
- Ordenacao por data
- Refresh automatico opcional

---

## Arquivos a Modificar

### 1. `src/components/admin/ApiDocsSidebar.tsx`
**Adicionar:**
- Novo item na lista `staticItems` com icone `ScrollText` ou `FileText`
- Item: `{ id: 'logs', label: 'Logs', icon: ScrollText }`

### 2. `src/components/admin/ApiDocsContent.tsx`
**Adicionar:**
- Import do novo componente `ApiLogsSection`
- Condicional para renderizar quando `selectedSection === 'logs'`

---

## Estrutura do Componente ApiLogsSection

```text
+------------------------------------------+
| Logs de API                              |
| Visualize todos os eventos enviados...   |
+------------------------------------------+
| [Filtros]                                |
| Evento: [Todos   v]  Periodo: [7 dias v] |
| Status: [Todos   v]  [Atualizar]         |
+------------------------------------------+
| Data/Hora    | Evento     | Status  | >> |
|--------------|------------|---------|-----|
| 02/02 12:00  | order.paid | 200 OK  | [+] |
| 02/02 11:45  | order.paid | 200 OK  | [+] |
| 02/02 10:30  | user.crea  | 500 Err | [+] |
+------------------------------------------+
| [<] Pagina 1 de 5 [>]                    |
+------------------------------------------+
```

---

## Detalhes Tecnicos

### Tabela webhook_dispatch_logs (existente)
| Coluna | Tipo | Descricao |
|--------|------|-----------|
| id | uuid | ID unico |
| event_type | text | Tipo do evento (order.paid, user.created) |
| payload | jsonb | Dados enviados no webhook |
| status_code | integer | Codigo HTTP da resposta |
| response_body | text | Resposta do destino |
| error_message | text | Mensagem de erro (se houver) |
| dispatched_at | timestamp | Data/hora do disparo |

### Query Principal
```sql
SELECT * FROM webhook_dispatch_logs 
WHERE event_type = $1 (opcional)
  AND dispatched_at >= $2 (periodo)
  AND (status_code >= 200 AND status_code < 300) = $3 (sucesso)
ORDER BY dispatched_at DESC
LIMIT 20 OFFSET $4;
```

---

## Funcionalidades da Pagina de Logs

1. **Visualizacao de Logs**
   - Lista paginada de todos os eventos
   - Exibe data/hora formatada
   - Badge colorido para status

2. **Filtros**
   - Por tipo de evento: Todos, order.paid, user.created, user.inactive.*
   - Por periodo: 24h, 7 dias, 30 dias, Tudo
   - Por status: Todos, Sucesso (2xx), Erro (4xx/5xx)

3. **Expansao de Detalhes**
   - Clicar em uma linha expande para mostrar:
     - Payload completo (JSON formatado)
     - Resposta do webhook
     - Mensagem de erro (se houver)

4. **Atualizacao**
   - Botao manual de refresh
   - Indicador de ultima atualizacao

---

## Componentes UI a Utilizar

- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Badge` (para status codes)
- `Select` (para filtros)
- `Button` (refresh)
- `Collapsible` (expandir detalhes)
- `Card` (container)
- `ScrollArea` (para payloads grandes)
- `CodeBlock` (reutilizar existente para JSON)
- `Skeleton` (loading state)

---

## Resumo das Alteracoes

| Arquivo | Acao |
|---------|------|
| `src/components/admin/ApiLogsSection.tsx` | Criar |
| `src/hooks/useApiLogs.ts` | Criar |
| `src/components/admin/ApiDocsSidebar.tsx` | Modificar (adicionar item "Logs") |
| `src/components/admin/ApiDocsContent.tsx` | Modificar (adicionar condicional) |

---

## Resultado Esperado

Uma nova aba "Logs" na documentacao da API que permite:
- Ver historico completo de webhooks disparados
- Filtrar por evento, periodo e status
- Expandir para ver payloads e respostas completas
- Identificar rapidamente erros de integracao
