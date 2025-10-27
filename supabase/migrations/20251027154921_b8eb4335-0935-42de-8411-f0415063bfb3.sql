-- Enable required extensions for automatic report generation
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Function to trigger daily report generation via edge function
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
    url := 'https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/generate-daily-report',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicm1qcmpvcmNnc2dlenR6YnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTU1NTcsImV4cCI6MjA3MzE3MTU1N30.KmCmyi6AuWDGqFJKfu5cExV6bohO0qErKzOpOApAdo4'
    ),
    body := jsonb_build_object('date', report_date::text)
  );
END;
$$;

-- Function to be called by trigger when order payment status changes to 'paid'
CREATE OR REPLACE FUNCTION auto_generate_report_on_payment()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only trigger if payment status changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Trigger report generation asynchronously
    PERFORM trigger_daily_report_generation();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger on orders table
DROP TRIGGER IF EXISTS trigger_auto_generate_report ON orders;
CREATE TRIGGER trigger_auto_generate_report
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_report_on_payment();

-- Schedule daily report generation at midnight
SELECT cron.schedule(
  'daily-sales-report-generation',
  '0 0 * * *',
  $cron$
  SELECT trigger_daily_report_generation();
  $cron$
);

-- Create a function to update cron schedule based on report_settings
CREATE OR REPLACE FUNCTION update_report_cron_schedule()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  settings RECORD;
  cron_expression TEXT;
BEGIN
  SELECT generation_hour, generation_minute INTO settings
  FROM report_settings
  LIMIT 1;
  
  IF settings IS NOT NULL THEN
    cron_expression := format('%s %s * * *', settings.generation_minute, settings.generation_hour);
    
    -- Update the cron schedule
    PERFORM cron.unschedule('daily-sales-report-generation');
    PERFORM cron.schedule(
      'daily-sales-report-generation',
      cron_expression,
      'SELECT trigger_daily_report_generation();'
    );
  END IF;
END;
$$;

-- Trigger to update cron when report_settings changes
CREATE OR REPLACE FUNCTION trigger_update_report_cron()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.generation_hour != OLD.generation_hour OR NEW.generation_minute != OLD.generation_minute THEN
    PERFORM update_report_cron_schedule();
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_report_settings_update ON report_settings;
CREATE TRIGGER trigger_report_settings_update
  AFTER UPDATE ON report_settings
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_report_cron();