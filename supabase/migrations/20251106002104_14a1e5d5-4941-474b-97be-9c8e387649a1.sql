-- FASE 1: Sistema de Aprovação de Produtos por Fornecedor

-- 1.1 Adicionar campos de aprovação na tabela products
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft' 
  CHECK (approval_status IN ('draft', 'pending_approval', 'approved', 'rejected'));

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS requires_approval BOOLEAN DEFAULT false;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES auth.users(id);

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMP WITH TIME ZONE;

ALTER TABLE products 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_products_approval_status ON products(approval_status);
CREATE INDEX IF NOT EXISTS idx_products_supplier_approval ON products(supplier_id, approval_status);

-- Comentários para documentação
COMMENT ON COLUMN products.approval_status IS 'Status de aprovação: draft (rascunho), pending_approval (aguardando aprovação), approved (aprovado), rejected (rejeitado)';
COMMENT ON COLUMN products.requires_approval IS 'Se true, produto precisa de aprovação do fornecedor antes de ser publicado';
COMMENT ON COLUMN products.approved_by IS 'UUID do usuário (fornecedor) que aprovou o produto';
COMMENT ON COLUMN products.approved_at IS 'Data/hora da aprovação';
COMMENT ON COLUMN products.rejection_reason IS 'Motivo da rejeição do produto';
COMMENT ON COLUMN products.rejected_at IS 'Data/hora da rejeição';
COMMENT ON COLUMN products.created_by IS 'UUID do usuário que criou o produto (geralmente super admin)';

-- 1.2 Criar tabela de histórico de aprovações
CREATE TABLE IF NOT EXISTS product_approval_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('submitted', 'approved', 'rejected')),
  performed_by UUID NOT NULL REFERENCES auth.users(id),
  previous_status TEXT,
  new_status TEXT NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_history_product ON product_approval_history(product_id);
CREATE INDEX IF NOT EXISTS idx_approval_history_performer ON product_approval_history(performed_by);

COMMENT ON TABLE product_approval_history IS 'Histórico de todas as ações de aprovação/rejeição de produtos';

-- Habilitar RLS na tabela de histórico
ALTER TABLE product_approval_history ENABLE ROW LEVEL SECURITY;

-- 1.3 Atualizar RLS Policies para products

-- Suppliers podem ver produtos pendentes atribuídos a eles
CREATE POLICY "Suppliers can view pending products assigned to them"
  ON products FOR SELECT
  USING (
    supplier_id = auth.uid() 
    AND approval_status IN ('pending_approval', 'approved', 'rejected')
  );

-- Suppliers podem aprovar/rejeitar produtos atribuídos a eles
CREATE POLICY "Suppliers can update approval status of their products"
  ON products FOR UPDATE
  USING (
    supplier_id = auth.uid() 
    AND approval_status = 'pending_approval'
  )
  WITH CHECK (
    supplier_id = auth.uid()
    AND approval_status IN ('approved', 'rejected')
  );

-- RLS Policies para product_approval_history
CREATE POLICY "Suppliers can view their product approval history"
  ON product_approval_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM products
      WHERE products.id = product_approval_history.product_id
      AND products.supplier_id = auth.uid()
    )
  );

CREATE POLICY "Admins can view all approval history"
  ON product_approval_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "System can insert approval history"
  ON product_approval_history FOR INSERT
  WITH CHECK (true);