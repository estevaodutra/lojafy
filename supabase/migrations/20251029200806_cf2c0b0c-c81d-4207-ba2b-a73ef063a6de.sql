-- Enable pg_cron extension if not already enabled
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Schedule the cleanup function to run daily at 3 AM
SELECT cron.schedule(
  'cleanup-inactive-users-daily',
  '0 3 * * *', -- Every day at 3 AM
  $$
  SELECT net.http_post(
    url := 'https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/cleanup-inactive-users',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicm1qcmpvcmNnc2dlenR6YnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTU1NTcsImV4cCI6MjA3MzE3MTU1N30.KmCmyi6AuWDGqFJKfu5cExV6bohO0qErKzOpOApAdo4"}'::jsonb,
    body := '{}'::jsonb
  ) as request_id;
  $$
);