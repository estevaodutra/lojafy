-- Remove from realtime publication (only if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication_tables WHERE pubname = 'supabase_realtime' AND tablename = 'daily_sales_reports') THEN
    ALTER PUBLICATION supabase_realtime DROP TABLE daily_sales_reports;
  END IF;
END $$;

-- Drop trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_report ON orders;

-- Drop functions
DROP FUNCTION IF EXISTS auto_generate_report_on_payment() CASCADE;
DROP FUNCTION IF EXISTS trigger_daily_report_generation() CASCADE;
DROP FUNCTION IF EXISTS update_report_cron_schedule() CASCADE;
DROP FUNCTION IF EXISTS trigger_update_report_cron() CASCADE;

-- Drop tables
DROP TABLE IF EXISTS daily_sales_reports CASCADE;
DROP TABLE IF EXISTS report_settings CASCADE;

-- Remove scheduled cron job (if exists)
DO $$
BEGIN
  PERFORM cron.unschedule('daily-sales-report-generation');
EXCEPTION
  WHEN undefined_function THEN NULL;
  WHEN others THEN NULL;
END $$;