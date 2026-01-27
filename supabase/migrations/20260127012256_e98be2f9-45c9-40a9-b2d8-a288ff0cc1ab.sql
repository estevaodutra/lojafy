-- =============================================
-- SISTEMA DE TICKETS VINCULADOS A PEDIDOS
-- =============================================

-- 1. Criar ENUMs para tipos e status
CREATE TYPE order_ticket_type AS ENUM ('reembolso', 'troca', 'cancelamento');
CREATE TYPE order_ticket_status AS ENUM ('aberto', 'em_analise', 'aguardando_cliente', 'resolvido', 'cancelado');
CREATE TYPE ticket_author_type AS ENUM ('cliente', 'revendedor', 'fornecedor', 'superadmin', 'sistema');

-- 2. Criar sequência para numeração de tickets
CREATE SEQUENCE IF NOT EXISTS ticket_number_seq START WITH 1;

-- 3. Tabela principal de tickets
CREATE TABLE public.order_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  ticket_number TEXT NOT NULL UNIQUE,
  tipo order_ticket_type NOT NULL,
  status order_ticket_status DEFAULT 'aberto',
  
  customer_id UUID NOT NULL,
  reseller_id UUID,
  supplier_id UUID,
  current_responsible UUID,
  
  reason TEXT NOT NULL,
  resolution TEXT,
  refund_amount DECIMAL(10,2),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ,
  sla_first_response TIMESTAMPTZ,
  sla_resolution TIMESTAMPTZ,
  first_responded_at TIMESTAMPTZ,
  
  CONSTRAINT reason_min_length CHECK (length(reason) >= 20)
);

-- 4. Tabela de mensagens do ticket
CREATE TABLE public.order_ticket_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.order_tickets(id) ON DELETE CASCADE NOT NULL,
  author_id UUID NOT NULL,
  author_type ticket_author_type NOT NULL,
  message TEXT NOT NULL,
  is_internal BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Tabela de anexos
CREATE TABLE public.order_ticket_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.order_tickets(id) ON DELETE CASCADE NOT NULL,
  message_id UUID REFERENCES public.order_ticket_messages(id) ON DELETE SET NULL,
  file_url TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT,
  file_size INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Tabela de reembolsos pendentes
CREATE TABLE public.pending_refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id UUID REFERENCES public.order_tickets(id) ON DELETE CASCADE NOT NULL,
  customer_id UUID NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'pendente' CHECK (status IN ('pendente', 'processando', 'concluido', 'cancelado')),
  processed_at TIMESTAMPTZ,
  processed_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Criar índices para performance
CREATE INDEX idx_order_tickets_order ON public.order_tickets(order_id);
CREATE INDEX idx_order_tickets_status ON public.order_tickets(status);
CREATE INDEX idx_order_tickets_responsible ON public.order_tickets(current_responsible);
CREATE INDEX idx_order_tickets_tipo ON public.order_tickets(tipo);
CREATE INDEX idx_order_tickets_customer ON public.order_tickets(customer_id);
CREATE INDEX idx_order_tickets_created ON public.order_tickets(created_at DESC);
CREATE INDEX idx_order_ticket_messages_ticket ON public.order_ticket_messages(ticket_id);
CREATE INDEX idx_order_ticket_attachments_ticket ON public.order_ticket_attachments(ticket_id);
CREATE INDEX idx_pending_refunds_status ON public.pending_refunds(status);

-- 8. Função para gerar número do ticket
CREATE OR REPLACE FUNCTION public.generate_ticket_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN 'TKT-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || 
         LPAD(NEXTVAL('ticket_number_seq')::TEXT, 5, '0');
END;
$$;

-- 9. Trigger para auto-gerar número do ticket
CREATE OR REPLACE FUNCTION public.auto_generate_ticket_number()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.ticket_number IS NULL OR NEW.ticket_number = '' THEN
    NEW.ticket_number := public.generate_ticket_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_ticket_number
  BEFORE INSERT ON public.order_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.auto_generate_ticket_number();

-- 10. Trigger para atualizar updated_at
CREATE TRIGGER update_order_tickets_updated_at
  BEFORE UPDATE ON public.order_tickets
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- 11. Função para verificar se usuário é participante do ticket
CREATE OR REPLACE FUNCTION public.is_ticket_participant(_user_id UUID, _ticket_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.order_tickets
    WHERE id = _ticket_id
    AND (
      customer_id = _user_id 
      OR reseller_id = _user_id 
      OR supplier_id = _user_id 
      OR current_responsible = _user_id
    )
  );
$$;

-- 12. Habilitar RLS nas tabelas
ALTER TABLE public.order_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ticket_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_ticket_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pending_refunds ENABLE ROW LEVEL SECURITY;

-- 13. Políticas RLS para order_tickets

-- Clientes: ver e criar seus próprios tickets
CREATE POLICY "Customers can view own tickets"
ON public.order_tickets FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Customers can create tickets"
ON public.order_tickets FOR INSERT
TO authenticated
WITH CHECK (customer_id = auth.uid());

-- Revendedores: ver tickets atribuídos a eles
CREATE POLICY "Resellers can view assigned tickets"
ON public.order_tickets FOR SELECT
TO authenticated
USING (
  reseller_id = auth.uid() 
  OR current_responsible = auth.uid()
);

-- Fornecedores: ver tickets atribuídos a eles
CREATE POLICY "Suppliers can view assigned tickets"
ON public.order_tickets FOR SELECT
TO authenticated
USING (
  supplier_id = auth.uid() 
  OR current_responsible = auth.uid()
);

-- Responsáveis podem atualizar tickets
CREATE POLICY "Responsible can update tickets"
ON public.order_tickets FOR UPDATE
TO authenticated
USING (
  current_responsible = auth.uid()
  OR reseller_id = auth.uid()
  OR supplier_id = auth.uid()
);

-- Superadmin: acesso total
CREATE POLICY "Superadmin full access to tickets"
ON public.order_tickets FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 14. Políticas RLS para order_ticket_messages

CREATE POLICY "Participants can view ticket messages"
ON public.order_ticket_messages FOR SELECT
TO authenticated
USING (
  public.is_ticket_participant(auth.uid(), ticket_id)
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Participants can create messages"
ON public.order_ticket_messages FOR INSERT
TO authenticated
WITH CHECK (
  public.is_ticket_participant(auth.uid(), ticket_id)
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Superadmin full access to messages"
ON public.order_ticket_messages FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 15. Políticas RLS para order_ticket_attachments

CREATE POLICY "Participants can view attachments"
ON public.order_ticket_attachments FOR SELECT
TO authenticated
USING (
  public.is_ticket_participant(auth.uid(), ticket_id)
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Participants can create attachments"
ON public.order_ticket_attachments FOR INSERT
TO authenticated
WITH CHECK (
  public.is_ticket_participant(auth.uid(), ticket_id)
  OR public.has_role(auth.uid(), 'super_admin')
);

CREATE POLICY "Superadmin full access to attachments"
ON public.order_ticket_attachments FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 16. Políticas RLS para pending_refunds

CREATE POLICY "Customers can view own refunds"
ON public.pending_refunds FOR SELECT
TO authenticated
USING (customer_id = auth.uid());

CREATE POLICY "Superadmin full access to refunds"
ON public.pending_refunds FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'super_admin'));

-- 17. Storage bucket para anexos de tickets
INSERT INTO storage.buckets (id, name, public)
VALUES ('order-ticket-attachments', 'order-ticket-attachments', false)
ON CONFLICT (id) DO NOTHING;

-- 18. Políticas de storage para anexos

CREATE POLICY "Ticket participants can view attachments"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'order-ticket-attachments'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.order_tickets 
      WHERE id::text = (storage.foldername(name))[1]
      AND (
        customer_id = auth.uid() 
        OR reseller_id = auth.uid() 
        OR supplier_id = auth.uid() 
        OR current_responsible = auth.uid()
      )
    )
  )
);

CREATE POLICY "Ticket participants can upload attachments"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'order-ticket-attachments'
  AND (
    public.has_role(auth.uid(), 'super_admin')
    OR EXISTS (
      SELECT 1 FROM public.order_tickets 
      WHERE id::text = (storage.foldername(name))[1]
      AND (
        customer_id = auth.uid() 
        OR reseller_id = auth.uid() 
        OR supplier_id = auth.uid() 
        OR current_responsible = auth.uid()
      )
    )
  )
);

CREATE POLICY "Superadmin can delete attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'order-ticket-attachments'
  AND public.has_role(auth.uid(), 'super_admin')
);