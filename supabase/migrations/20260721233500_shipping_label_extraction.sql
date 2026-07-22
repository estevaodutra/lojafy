-- Migration para extração automática de dados de etiquetas de envio
-- Adicionar novas colunas na tabela de pedidos (orders)
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS tracking_carrier text,
ADD COLUMN IF NOT EXISTS marketplace text,
ADD COLUMN IF NOT EXISTS marketplace_order_id text,
ADD COLUMN IF NOT EXISTS shipping_label_status text,
ADD COLUMN IF NOT EXISTS shipping_label_confidence numeric,
ADD COLUMN IF NOT EXISTS shipping_label_extraction_method text,
ADD COLUMN IF NOT EXISTS shipping_label_processed_at timestamptz,
ADD COLUMN IF NOT EXISTS shipping_label_confirmed_at timestamptz,
ADD COLUMN IF NOT EXISTS shipping_label_confirmed_by uuid REFERENCES auth.users(id);

-- Criar tabela de auditoria para extrações de etiqueta
CREATE TABLE IF NOT EXISTS shipment_label_extractions (
  id uuid primary key default gen_random_uuid(),
  order_id uuid null REFERENCES orders(id),
  user_id uuid not null REFERENCES auth.users(id),
  file_path text not null,
  marketplace text,
  extracted_text text,
  extracted_data jsonb,
  tracking_candidates jsonb,
  selected_tracking_code text,
  confidence numeric,
  extraction_method text,
  status text not null,
  error_message text,
  created_at timestamptz default now(),
  processed_at timestamptz
);

-- Ativar RLS na tabela de auditoria
ALTER TABLE shipment_label_extractions ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS para shipment_label_extractions
CREATE POLICY "Usuários podem ver suas próprias extrações"
  ON shipment_label_extractions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem inserir suas próprias extrações"
  ON shipment_label_extractions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar suas próprias extrações"
  ON shipment_label_extractions FOR UPDATE
  USING (auth.uid() = user_id);

-- Bucket para as etiquetas
INSERT INTO storage.buckets (id, name, public) 
VALUES ('shipping-labels', 'shipping-labels', false)
ON CONFLICT (id) DO NOTHING;

-- Criar políticas de RLS para o bucket shipping-labels
CREATE POLICY "Usuários autenticados podem inserir etiquetas em shipping-labels"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shipping-labels' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Usuários autenticados podem ver etiquetas em shipping-labels"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'shipping-labels' AND 
    auth.role() = 'authenticated'
  );

CREATE POLICY "Usuários autenticados podem deletar etiquetas em shipping-labels"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'shipping-labels' AND 
    auth.role() = 'authenticated'
  );
