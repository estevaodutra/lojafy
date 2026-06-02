-- Create order_pipeline_columns table
CREATE TABLE IF NOT EXISTS public.order_pipeline_columns (
  status_key TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  pipeline_type TEXT NOT NULL CHECK (pipeline_type IN ('primary', 'secondary', 'tertiary')),
  display_order INTEGER NOT NULL,
  icon_name TEXT,
  color_class TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.order_pipeline_columns ENABLE ROW LEVEL SECURITY;

-- Select policy: all authenticated users
CREATE POLICY select_order_pipeline_columns ON public.order_pipeline_columns
  FOR SELECT TO authenticated USING (true);

-- Insert/Update/Delete policy: only admin/super_admin
CREATE POLICY manage_order_pipeline_columns ON public.order_pipeline_columns
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE profiles.user_id = auth.uid()
      AND profiles.role IN ('admin', 'super_admin')
    )
  );

-- Seed with default primary pipeline columns
INSERT INTO public.order_pipeline_columns (status_key, label, pipeline_type, display_order, icon_name, color_class) VALUES
  ('pendente', 'Aguardando Pagamento', 'primary', 1, 'Clock', 'bg-gray-100 text-gray-800'),
  ('pago', 'Aguardando Recebimento da Expedição', 'primary', 2, 'BadgeCheck', 'bg-emerald-100 text-emerald-800'),
  ('recebido', 'Pedido Recebido > Aguardando Envio', 'primary', 3, 'Inbox', 'bg-blue-100 text-blue-800'),
  ('embalado', 'Embalado > Aguardando Envio', 'primary', 4, 'Package', 'bg-orange-100 text-orange-800'),
  ('enviado', 'Enviado', 'primary', 5, 'Send', 'bg-purple-100 text-purple-800'),
  ('finalizado', 'Finalizado', 'primary', 6, 'CheckCircle', 'bg-green-100 text-green-800')
ON CONFLICT (status_key) DO UPDATE 
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order, icon_name = EXCLUDED.icon_name, color_class = EXCLUDED.color_class;

-- Seed with default secondary pipeline columns (tickets)
INSERT INTO public.order_pipeline_columns (status_key, label, pipeline_type, display_order, icon_name, color_class) VALUES
  ('aberto', 'Ticket Aberto', 'secondary', 1, 'Ticket', 'bg-red-100 text-red-800'),
  ('em_analise', 'Em Análise', 'secondary', 2, 'Search', 'bg-amber-100 text-amber-800'),
  ('aguardando_cliente', 'Aguardando Resposta', 'secondary', 3, 'Clock', 'bg-blue-100 text-blue-800'),
  ('resolvido', 'Resolvido', 'secondary', 4, 'CheckCircle', 'bg-green-100 text-green-800')
ON CONFLICT (status_key) DO UPDATE 
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order, icon_name = EXCLUDED.icon_name, color_class = EXCLUDED.color_class;

-- Seed with default tertiary pipeline columns (exceptions)
INSERT INTO public.order_pipeline_columns (status_key, label, pipeline_type, display_order, icon_name, color_class) VALUES
  ('em_reposicao', 'Atraso | Em Reposição', 'tertiary', 1, 'AlertTriangle', 'bg-amber-100 text-amber-800'),
  ('cancelamento_solicitado', 'Cancelamento Solicitado', 'tertiary', 2, 'HandMetal', 'bg-rose-100 text-rose-800'),
  ('devolucao_andamento', 'Devolução em Andamento', 'tertiary', 3, 'RotateCcw', 'bg-rose-100 text-rose-800'),
  ('reembolsado', 'Reembolsado', 'tertiary', 4, 'RefreshCw', 'bg-gray-100 text-gray-800')
ON CONFLICT (status_key) DO UPDATE 
SET label = EXCLUDED.label, display_order = EXCLUDED.display_order, icon_name = EXCLUDED.icon_name, color_class = EXCLUDED.color_class;
