
# Plano: Logs de API com Retenção de 7 Dias

## Resumo

Expandir o sistema de logs para incluir todas as requisições de API externas, com exclusão automática após 7 dias.

---

## 1. Nova Tabela: `api_request_logs`

Criar tabela para armazenar todas as requisições às Edge Functions de API:

```sql
CREATE TABLE public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT,
  api_key_id UUID REFERENCES api_keys(id),
  user_id UUID,
  ip_address TEXT,
  query_params JSONB,
  request_body JSONB,
  status_code INTEGER,
  response_summary JSONB,
  error_message TEXT,
  duration_ms INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_api_request_logs_function ON api_request_logs(function_name);
CREATE INDEX idx_api_request_logs_created ON api_request_logs(created_at DESC);
CREATE INDEX idx_api_request_logs_status ON api_request_logs(status_code);

-- RLS
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view API logs"
ON api_request_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin'
));
```

---

## 2. Função de Limpeza Automática

Criar função SQL para excluir logs com mais de 7 dias:

```sql
CREATE OR REPLACE FUNCTION cleanup_old_api_logs()
RETURNS TABLE(deleted_api_logs INTEGER, deleted_webhook_logs INTEGER)
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_api INTEGER;
  v_deleted_webhook INTEGER;
BEGIN
  -- Excluir logs de requisições de API com mais de 7 dias
  DELETE FROM api_request_logs
  WHERE created_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_api = ROW_COUNT;
  
  -- Excluir logs de webhooks com mais de 7 dias
  DELETE FROM webhook_dispatch_logs
  WHERE dispatched_at < NOW() - INTERVAL '7 days';
  GET DIAGNOSTICS v_deleted_webhook = ROW_COUNT;
  
  RETURN QUERY SELECT v_deleted_api, v_deleted_webhook;
END;
$$;
```

---

## 3. Cron Job para Limpeza Diária

Agendar execução diária às 4h da manhã:

```sql
SELECT cron.schedule(
  'cleanup-api-logs-daily',
  '0 4 * * *',
  $$SELECT cleanup_old_api_logs();$$
);
```

---

## 4. Modificar Edge Functions de API (27 funções)

Adicionar logging em todas as funções `api-*`:

**Padrão de implementação:**

```typescript
Deno.serve(async (req) => {
  const startTime = Date.now();
  const url = new URL(req.url);
  let statusCode = 200;
  let errorMessage: string | null = null;
  let apiKeyId: string | null = null;

  try {
    // ... código existente ...
    // Capturar apiKeyId após validação
    apiKeyId = apiKeyData?.id;
    
    // ... resto do código ...
    
    return response;
  } catch (error) {
    statusCode = 500;
    errorMessage = error.message;
    throw error;
  } finally {
    // Log assíncrono (não bloqueia resposta)
    supabase.from('api_request_logs').insert({
      function_name: 'api-produtos-listar',
      method: req.method,
      path: url.pathname,
      api_key_id: apiKeyId,
      query_params: Object.fromEntries(url.searchParams),
      status_code: statusCode,
      error_message: errorMessage,
      duration_ms: Date.now() - startTime,
    }).then(() => {}).catch(console.error);
  }
});
```

**Funções a modificar:**
- `api-produtos-listar`, `api-produtos-cadastrar`
- `api-pedidos-listar`, `api-pedidos-atualizar-status`, `api-pedidos-recentes`
- `api-usuarios-listar`, `api-usuarios-cadastrar`, `api-usuarios-verificar`, `api-usuarios-alterar-role`
- `api-categorias-listar`, `api-categorias-cadastrar`
- `api-subcategorias-listar`, `api-subcategorias-cadastrar`
- `api-cursos-listar`, `api-cursos-cadastrar`, `api-cursos-detalhe`, `api-cursos-conteudo`
- `api-matriculas-listar`, `api-matriculas-cadastrar`, `api-matriculas-cancelar`, `api-matriculas-verificar`, `api-matriculas-atualizar-validade`
- `api-progresso-usuario`, `api-progresso-atualizar`
- `api-features-listar`, `api-features-atribuir`
- `api-top-produtos`, `api-ranking-produto-cadastrar`
- `api-demo-pedidos-cadastrar`, `api-demo-usuarios-cadastrar`
- `api-produtos-aguardando-aprovacao`

---

## 5. Atualizar Hook `useApiLogs.ts`

Adicionar suporte para dois tipos de logs:

```typescript
export type LogSource = 'all' | 'webhook' | 'api_request';

// Consultar ambas as tabelas e unificar
```

---

## 6. Atualizar UI `ApiLogsSection.tsx`

**Novos filtros:**
- Origem: Todos | Webhooks Enviados | Requisições de API

**Novas colunas:**
- Função/Endpoint
- Duração (ms)

**Métricas no topo:**
- Total de requisições
- Taxa de sucesso
- Tempo médio de resposta

---

## Resumo das Alterações

| Tipo | Item | Descrição |
|------|------|-----------|
| DB | `api_request_logs` | Nova tabela para logs de API |
| DB | `cleanup_old_api_logs()` | Função de limpeza (7 dias) |
| DB | Cron job | Execução diária às 4h |
| Edge | 27 funções `api-*` | Adicionar logging |
| Hook | `useApiLogs.ts` | Suportar dois tipos de logs |
| UI | `ApiLogsSection.tsx` | Filtros e métricas expandidos |

---

## Política de Retenção

| Tabela | Retenção | Limpeza |
|--------|----------|---------|
| `api_request_logs` | 7 dias | Automática (4h diária) |
| `webhook_dispatch_logs` | 7 dias | Automática (4h diária) |

---

## Resultado Esperado

1. Todas as chamadas às APIs externas serão logadas
2. Logs mais antigos que 7 dias serão excluídos automaticamente
3. Dashboard unificado para visualizar webhooks e requisições
4. Métricas de performance e taxa de sucesso
