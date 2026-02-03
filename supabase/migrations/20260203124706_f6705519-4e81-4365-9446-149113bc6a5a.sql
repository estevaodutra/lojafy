-- Tabela para logs de requisições de API
CREATE TABLE public.api_request_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name TEXT NOT NULL,
  method TEXT NOT NULL,
  path TEXT,
  api_key_id UUID REFERENCES api_keys(id) ON DELETE SET NULL,
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
CREATE INDEX idx_api_request_logs_api_key ON api_request_logs(api_key_id);

-- RLS
ALTER TABLE api_request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can view API logs"
ON api_request_logs FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles WHERE user_id = auth.uid() AND role = 'super_admin'
));

CREATE POLICY "System can insert API logs"
ON api_request_logs FOR INSERT
WITH CHECK (true);

-- Função de limpeza automática (7 dias)
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