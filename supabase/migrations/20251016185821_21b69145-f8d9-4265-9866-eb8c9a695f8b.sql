-- ================================================
-- SISTEMA DE SUPORTE COM IA
-- ================================================

-- 1. Criar ENUMs para tipos de status e prioridades
CREATE TYPE ticket_status AS ENUM ('open', 'waiting_customer', 'waiting_admin', 'resolved', 'closed');
CREATE TYPE ticket_priority AS ENUM ('low', 'normal', 'high', 'urgent');
CREATE TYPE message_sender_type AS ENUM ('customer', 'ai', 'admin', 'system');
CREATE TYPE knowledge_category AS ENUM ('faq', 'policy', 'product_info', 'general');

-- 2. Tabela de Tickets de Suporte
CREATE TABLE support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  customer_name TEXT,
  customer_email TEXT NOT NULL,
  subject TEXT NOT NULL,
  status ticket_status DEFAULT 'open',
  priority ticket_priority DEFAULT 'normal',
  assigned_to UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ,
  last_message_at TIMESTAMPTZ DEFAULT now(),
  ai_handled BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'
);

CREATE INDEX idx_tickets_status ON support_tickets(status);
CREATE INDEX idx_tickets_user ON support_tickets(user_id);
CREATE INDEX idx_tickets_assigned ON support_tickets(assigned_to);
CREATE INDEX idx_tickets_last_message ON support_tickets(last_message_at DESC);

-- 3. Tabela de Mensagens do Chat
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES support_tickets(id) ON DELETE CASCADE NOT NULL,
  sender_type message_sender_type NOT NULL,
  sender_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  is_internal BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX idx_messages_ticket ON chat_messages(ticket_id, created_at);
CREATE INDEX idx_messages_sender ON chat_messages(sender_id);

-- 4. Tabela de Base de Conhecimento da IA
CREATE TABLE ai_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  category knowledge_category NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  keywords TEXT[] DEFAULT '{}',
  priority INTEGER DEFAULT 0,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES profiles(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_knowledge_category ON ai_knowledge_base(category);
CREATE INDEX idx_knowledge_active ON ai_knowledge_base(active);
CREATE INDEX idx_knowledge_keywords ON ai_knowledge_base USING GIN(keywords);

-- 5. Tabela de Configuração da IA
CREATE TABLE ai_support_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_context TEXT NOT NULL DEFAULT 'E-commerce brasileiro com entrega nacional e múltiplas formas de pagamento.',
  ai_tone TEXT NOT NULL DEFAULT 'profissional e amigável',
  max_response_length INTEGER DEFAULT 500,
  escalation_keywords TEXT[] DEFAULT ARRAY['não sei', 'preciso falar com humano', 'urgente', 'reclamação'],
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO ai_support_config (id, platform_context, ai_tone) 
VALUES (gen_random_uuid(), 'E-commerce brasileiro com entrega nacional e múltiplas formas de pagamento.', 'profissional e amigável');

-- 6. Inserir FAQs de exemplo na base de conhecimento
INSERT INTO ai_knowledge_base (category, title, content, keywords, priority, created_by) VALUES
('faq', 'Prazo de Entrega', 'O prazo de entrega varia conforme a região: 3-7 dias úteis para região metropolitana e 5-15 dias úteis para demais regiões do Brasil.', ARRAY['entrega', 'prazo', 'envio', 'quanto tempo'], 10, NULL),
('faq', 'Formas de Pagamento', 'Aceitamos PIX, cartão de crédito, cartão de débito e boleto bancário.', ARRAY['pagamento', 'pix', 'cartão', 'boleto'], 9, NULL),
('policy', 'Política de Trocas', 'Oferecemos 30 dias para trocas e devoluções. O produto deve estar na embalagem original, sem uso e com nota fiscal.', ARRAY['troca', 'devolução', 'garantia'], 8, NULL),
('faq', 'Rastreamento de Pedido', 'Você pode rastrear seu pedido na página "Meus Pedidos" ou através do código de rastreamento enviado por e-mail.', ARRAY['rastreio', 'rastrear', 'código', 'acompanhar'], 7, NULL),
('faq', 'Horário de Atendimento', 'Chat disponível 24/7. Atendimento por telefone: segunda a sexta, 8h às 18h.', ARRAY['horário', 'atendimento', 'telefone', 'contato'], 6, NULL);

-- 7. RLS Policies para Support Tickets
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own tickets" ON support_tickets
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "Users can create tickets" ON support_tickets
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all tickets" ON support_tickets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 8. RLS Policies para Chat Messages
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own messages" ON chat_messages
  FOR SELECT USING (
    NOT is_internal AND EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Users can send messages" ON chat_messages
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM support_tickets 
      WHERE id = ticket_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage messages" ON chat_messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- 9. RLS Policies para AI Knowledge Base
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage knowledge base" ON ai_knowledge_base
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

CREATE POLICY "Admins can view knowledge base" ON ai_knowledge_base
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Policy para Edge Function acessar knowledge base (via service role)
CREATE POLICY "Service role can access knowledge base" ON ai_knowledge_base
  FOR SELECT USING (true);

-- 10. RLS Policies para AI Support Config
ALTER TABLE ai_support_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admins can manage config" ON ai_support_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() 
      AND role = 'super_admin'
    )
  );

-- Policy para Edge Function acessar config (via service role)
CREATE POLICY "Service role can access config" ON ai_support_config
  FOR SELECT USING (true);

-- 11. Habilitar Realtime nas tabelas
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE support_tickets;

ALTER TABLE chat_messages REPLICA IDENTITY FULL;
ALTER TABLE support_tickets REPLICA IDENTITY FULL;

-- 12. Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_support()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_support_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_support();

CREATE TRIGGER update_ai_knowledge_base_updated_at
  BEFORE UPDATE ON ai_knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_support();

CREATE TRIGGER update_ai_support_config_updated_at
  BEFORE UPDATE ON ai_support_config
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_support();