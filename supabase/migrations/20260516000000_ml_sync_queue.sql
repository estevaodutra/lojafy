-- Tabela de fila para integração ML em background
CREATE TABLE IF NOT EXISTS public.ml_sync_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'done', 'failed')),
  result JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  processed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_ml_sync_queue_status ON public.ml_sync_queue(status, created_at);
CREATE INDEX IF NOT EXISTS idx_ml_sync_queue_user ON public.ml_sync_queue(user_id);

ALTER TABLE public.ml_sync_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins manage queue"
  ON public.ml_sync_queue FOR ALL
  USING (EXISTS (
    SELECT 1 FROM public.profiles
    WHERE user_id = auth.uid() AND role = 'super_admin'
  ));

-- Função SQL que pg_cron chama a cada 10 minutos
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
    url := 'https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/ml-queue-processor',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJicm1qcmpvcmNnc2dlenR6YnNyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc1OTU1NTcsImV4cCI6MjA3MzE3MTU1N30.KmCmyi6AuWDGqFJKfu5cExV6bohO0qErKzOpOApAdo4'
    ),
    body := jsonb_build_object(
      'queue_id', v_item.id::text,
      'reseller_user_id', v_item.user_id::text
    )::text
  );
END;
$$;

-- Agendar execução a cada 10 minutos
SELECT cron.schedule(
  'ml-sync-queue-processor',
  '*/10 * * * *',
  $cron$
  SELECT public.process_next_ml_queue_item();
  $cron$
);
