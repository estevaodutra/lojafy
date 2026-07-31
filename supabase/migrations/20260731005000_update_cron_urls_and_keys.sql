-- Update cron functions and schedules to use the new Supabase URL and Anon Key

-- 1. Update process_next_ml_queue_item function
CREATE OR REPLACE FUNCTION public.process_next_ml_queue_item()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_item RECORD;
BEGIN
  -- Get next pending item (FIFO), with lock to prevent double processing
  SELECT id, user_id INTO v_item
  FROM public.ml_sync_queue
  WHERE status = 'pending'
  ORDER BY created_at ASC
  LIMIT 1
  FOR UPDATE SKIP LOCKED;

  IF v_item.id IS NULL THEN
    RETURN; -- Empty queue
  END IF;

  -- Mark as processing
  UPDATE public.ml_sync_queue
  SET status = 'processing'
  WHERE id = v_item.id;

  -- Call edge function ml-queue-processor asynchronously
  PERFORM net.http_post(
    url := 'https://lojafy-supabase.d2x.site/functions/v1/ml-queue-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE'
    ),
    body := jsonb_build_object(
      'queue_id', v_item.id::text,
      'reseller_user_id', v_item.user_id::text
    )::text
  );
END;
$$;

-- 2. Update trigger_daily_report_generation function
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
    url := 'https://lojafy-supabase.d2x.site/functions/v1/generate-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE'
    ),
    body := jsonb_build_object('date', report_date::text)
  );
END;
$$;

-- 3. Reschedule cleanup-inactive-users-daily
SELECT cron.unschedule(jobid)
FROM cron.job
WHERE jobname = 'cleanup-inactive-users-daily';

SELECT cron.schedule(
  'cleanup-inactive-users-daily',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://lojafy-supabase.d2x.site/functions/v1/cleanup-inactive-users',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiIsImlzcyI6InN1cGFiYXNlIiwiaWF0IjoxNzg1NDU5NzI2LCJleHAiOjE5NDMxMzk3MjZ9.pcQQhBGEAgKG8sUtKiz00OBp09yA7NW0yPCqjiq-_sE"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);
