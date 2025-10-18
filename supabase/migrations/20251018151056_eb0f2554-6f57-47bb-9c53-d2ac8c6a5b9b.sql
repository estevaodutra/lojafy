-- Criar tabela de relatórios diários
CREATE TABLE IF NOT EXISTS public.daily_sales_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date DATE NOT NULL UNIQUE,
  
  -- Contadores
  total_orders INTEGER NOT NULL DEFAULT 0,
  total_items INTEGER NOT NULL DEFAULT 0,
  
  -- Valores Financeiros
  total_cost NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_revenue NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_profit NUMERIC(12, 2) NOT NULL DEFAULT 0,
  profit_margin NUMERIC(5, 2) NOT NULL DEFAULT 0,
  
  -- Taxas
  total_shipping NUMERIC(12, 2) NOT NULL DEFAULT 0,
  total_taxes NUMERIC(12, 2) NOT NULL DEFAULT 0,
  
  -- Metadados
  orders_by_status JSONB DEFAULT '{}',
  top_products JSONB DEFAULT '[]',
  
  -- Timestamps
  generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índice para performance
CREATE INDEX IF NOT EXISTS idx_daily_sales_reports_date ON public.daily_sales_reports(report_date DESC);

-- Trigger para updated_at
CREATE TRIGGER update_daily_sales_reports_updated_at
  BEFORE UPDATE ON public.daily_sales_reports
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.daily_sales_reports ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Super admins can view reports"
  ON public.daily_sales_reports
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

CREATE POLICY "Only system can insert/update reports"
  ON public.daily_sales_reports
  FOR ALL
  USING (false);

-- Criar tabela de configurações de relatórios
CREATE TABLE IF NOT EXISTS public.report_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  generation_hour INTEGER NOT NULL DEFAULT 0 CHECK (generation_hour >= 0 AND generation_hour <= 23),
  generation_minute INTEGER NOT NULL DEFAULT 5 CHECK (generation_minute >= 0 AND generation_minute <= 59),
  auto_generate_enabled BOOLEAN NOT NULL DEFAULT true,
  notification_email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger para updated_at
CREATE TRIGGER update_report_settings_updated_at
  BEFORE UPDATE ON public.report_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Habilitar RLS
ALTER TABLE public.report_settings ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Super admins can manage settings"
  ON public.report_settings
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Inserir configuração padrão (00:05)
INSERT INTO public.report_settings (generation_hour, generation_minute, auto_generate_enabled)
VALUES (0, 5, true)
ON CONFLICT DO NOTHING;