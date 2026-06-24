-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run daily at 3 AM
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