-- Drop existing trigger
DROP TRIGGER IF EXISTS trigger_auto_generate_report ON orders;

-- Update function to add logging and work with INSERT
CREATE OR REPLACE FUNCTION public.auto_generate_report_on_payment()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path TO 'public'
LANGUAGE plpgsql
AS $$
BEGIN
  -- Only trigger if payment status changed to 'paid'
  IF NEW.payment_status = 'paid' AND (OLD.payment_status IS NULL OR OLD.payment_status != 'paid') THEN
    -- Log for debugging
    RAISE NOTICE 'Trigger fired for order: % with status: %', NEW.id, NEW.payment_status;
    
    -- Call edge function to generate report
    PERFORM trigger_daily_report_generation();
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for both INSERT and UPDATE
CREATE TRIGGER trigger_auto_generate_report
  AFTER INSERT OR UPDATE OF payment_status ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_generate_report_on_payment();

-- Enable realtime for daily_sales_reports table
ALTER TABLE daily_sales_reports REPLICA IDENTITY FULL;

-- Add table to realtime publication
ALTER PUBLICATION supabase_realtime ADD TABLE daily_sales_reports;