-- =============================================================================
-- Migration: 20261007141500_custom_fields.sql
-- Recurso: Campos Personalizados para Leads e Usuários
-- =============================================================================

CREATE TABLE IF NOT EXISTS public.custom_field_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  key TEXT NOT NULL UNIQUE,
  field_type TEXT NOT NULL CHECK (field_type IN ('text', 'select', 'number', 'textarea', 'date', 'boolean')),
  description TEXT,
  placeholder TEXT,
  options JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_required BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  display_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Tabela de valores preenchidos por lead / usuário
CREATE TABLE IF NOT EXISTS public.lead_custom_field_values (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  lead_id TEXT NOT NULL,
  field_id UUID NOT NULL REFERENCES public.custom_field_definitions(id) ON DELETE CASCADE,
  value TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT unq_lead_custom_field UNIQUE (lead_id, field_id)
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_custom_field_definitions_active 
  ON public.custom_field_definitions(is_active, display_order);

CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_lead 
  ON public.lead_custom_field_values(lead_id);

CREATE INDEX IF NOT EXISTS idx_lead_custom_field_values_field 
  ON public.lead_custom_field_values(field_id);

-- RLS
ALTER TABLE public.custom_field_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lead_custom_field_values ENABLE ROW LEVEL SECURITY;

-- Políticas para custom_field_definitions
DROP POLICY IF EXISTS "Anyone authenticated can view custom field definitions" ON public.custom_field_definitions;
CREATE POLICY "Anyone authenticated can view custom field definitions"
  ON public.custom_field_definitions
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage custom field definitions" ON public.custom_field_definitions;
CREATE POLICY "Admins can manage custom field definitions"
  ON public.custom_field_definitions
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Políticas para lead_custom_field_values
DROP POLICY IF EXISTS "Authenticated can view lead custom field values" ON public.lead_custom_field_values;
CREATE POLICY "Authenticated can view lead custom field values"
  ON public.lead_custom_field_values
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Admins can manage lead custom field values" ON public.lead_custom_field_values;
CREATE POLICY "Admins can manage lead custom field values"
  ON public.lead_custom_field_values
  FOR ALL
  TO authenticated
  USING (public.is_admin_user())
  WITH CHECK (public.is_admin_user());

-- Seed de campos iniciais padrão
INSERT INTO public.custom_field_definitions (name, key, field_type, description, placeholder, options, is_required, is_active, display_order)
VALUES 
  (
    'ID de Grupo',
    'id_grupo',
    'text',
    'Identificador ou código do grupo ao qual o lead pertence (ex: WhatsApp, Telegram ou CRM)',
    'Ex: GRP-2048 ou 91823',
    '[]'::jsonb,
    false,
    true,
    1
  ),
  (
    'Origem do Lead',
    'origem_lead',
    'select',
    'Canal ou campanha de aquisição de onde o lead se cadastrou',
    'Selecione a origem',
    '["Campanha Meta Ads", "Google Ads", "WhatsApp Orgânico", "Indicação", "Loja Virtual", "Outro"]'::jsonb,
    false,
    true,
    2
  ),
  (
    'Etapa do Lead',
    'etapa_lead',
    'select',
    'Status ou estágio atual do lead no funil de relacionamento',
    'Selecione a etapa',
    '["Novo Contato", "Qualificado", "Em Negociação", "Aguardando Resposta", "Convertido", "Perdido"]'::jsonb,
    false,
    true,
    3
  ),
  (
    'Potencial de Compra (R$)',
    'potencial_compra',
    'number',
    'Estimativa de faturamento ou limite de crédito do lead',
    'Ex: 5000',
    '[]'::jsonb,
    false,
    true,
    4
  )
ON CONFLICT (key) DO NOTHING;
