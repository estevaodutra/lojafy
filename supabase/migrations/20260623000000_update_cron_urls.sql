-- Update process_next_ml_queue_item to point to the new self-hosted URL and Anon Key
CREATE OR REPLACE FUNCTION public.process_next_ml_queue_item()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Pegar próximo item pendente (FIFO), com lock para evitar processamento duplo
  SELECT id, user_id INTO v_item
  FROM public.ml_sync_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_item.id IS NULL THEN
    RETURN; -- Fila vazia, nada a fazer
  END IF;

  -- Marcar como processing
  UPDATE public.ml_sync_queue
  SET status = 'processing'
  WHERE id = v_item.id;

  -- Chamar edge function ml-queue-processor de forma assíncrona
  PERFORM net.http_post(
    url := 'https://lojafy.6ksfuf.easypanel.host/functions/v1/ml-queue-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3NDkyOTYwMDAsICJleHAiOiA0OTA0OTY5NjAwfQ.3A7rELYownQsXog52qS6qH_46r8mjxtCQn_F3iqBXpo'
    ),
    body := jsonb_build_object(
      'queue_id', v_item.id::text,
      'reseller_user_id', v_item.user_id::text
    )::text
  );
END;
$$;

-- Update trigger_daily_report_generation to point to the new self-hosted URL and Anon Key
CREATE OR REPLACE FUNCTION trigger_daily_report_generation()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  report_date DATE;
BEGIN
  report_date := CURRENT_DATE;
  
  -- Call the edge function to generate report for today
  PERFORM net.http_post(
    url := 'https://lojafy.6ksfuf.easypanel.host/functions/v1/generate-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3NDkyOTYwMDAsICJleHAiOiA0OTA0OTY5NjAwfQ.3A7rELYownQsXog52qS6qH_46r8mjxtCQn_F3iqBXpo'
    ),
    body := jsonb_build_object('date', report_date::text)
  );
END;
$$;

-- Reschedule cleanup-inactive-users-daily to point to the new self-hosted URL and Anon Key
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-inactive-users-daily';

SELECT cron.schedule(
  'cleanup-inactive-users-daily',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://lojafy.6ksfuf.easypanel.host/functions/v1/cleanup-inactive-users',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiAiSFMyNTYiLCAidHlwIjogIkpXVCJ9.eyJyb2xlIjogImFub24iLCAiaXNzIjogInN1cGFiYXNlIiwgImlhdCI6IDE3NDkyOTYwMDAsICJleHAiOiA0OTA0OTY5NjAwfQ.3A7rELYownQsXog52qS6qH_46r8mjxtCQn_F3iqBXpo"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
