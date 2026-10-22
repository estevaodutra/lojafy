-- Adicionar colunas de diagnóstico na tabela mercadolivre_integrations
ALTER TABLE public.mercadolivre_integrations
ADD COLUMN IF NOT EXISTS last_error TEXT,
ADD COLUMN IF NOT EXISTS last_error_at TIMESTAMPTZ;

-- Função para disparar a renovação automática proativa de tokens do Mercado Livre
CREATE OR REPLACE FUNCTION public.trigger_ml_token_refresh()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Chama a Edge Function ml-token-refresh em modo batch (refresh_all_expiring)
  PERFORM net.http_post(
    url := 'https://lojafy-supabase.d2x.site/functions/v1/ml-token-refresh',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE'
    ),
    body := '{"mode": "refresh_all_expiring"}'::jsonb
  );
END;
$$;

-- Agendar execução a cada 2 horas via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento anterior se existir
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'ml-token-refresh-proactive';

    -- Registra novo agendamento a cada 2 horas
    PERFORM cron.schedule(
      'ml-token-refresh-proactive',
      '0 */2 * * *',
      $$ SELECT public.trigger_ml_token_refresh(); $$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or schedule failed: %', SQLERRM;
END;
$$;
