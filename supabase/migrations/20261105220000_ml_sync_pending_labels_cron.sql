-- Migration: Agendamento horário de verificação e sincronização de etiquetas pendentes do Mercado Livre
-- Date: 2026-11-05

-- 1. Função para disparar a verificação periódica de etiquetas do Mercado Livre
CREATE OR REPLACE FUNCTION public.trigger_ml_sync_pending_labels()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Invoca a Edge Function ml-order-webhook com action sync_pending_labels
  PERFORM net.http_post(
    url := 'https://lojafy-supabase.d2x.site/functions/v1/ml-order-webhook',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE'
    ),
    body := '{"action": "sync_pending_labels"}'::jsonb
  );
END;
$$;

-- 2. Agendar execução a cada 1 hora via pg_cron
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    -- Remove agendamento anterior se existir
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'ml-sync-pending-labels-hourly';

    -- Registra novo agendamento a cada hora (minuto 0)
    PERFORM cron.schedule(
      'ml-sync-pending-labels-hourly',
      '0 * * * *',
      $$ SELECT public.trigger_ml_sync_pending_labels(); $$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or schedule failed: %', SQLERRM;
END;
$$;
