-- Fase 1: Reestruturação da Plataforma Lojafy
-- Expandir sistema de roles e criar estrutura base

-- 1. Atualizar enum de roles para incluir todos os tipos de usuário
DROP TYPE IF EXISTS app_role CASCADE;
CREATE TYPE app_role AS ENUM ('super_admin', 'supplier', 'reseller', 'customer');

-- Atualizar coluna role na tabela profiles
ALTER TABLE profiles ALTER COLUMN role SET DEFAULT 'customer'::app_role;

-- 2. Expandir tabela profiles com campos específicos
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS business_name TEXT,
ADD COLUMN IF NOT EXISTS business_cnpj TEXT,
ADD COLUMN IF NOT EXISTS business_address TEXT,
ADD COLUMN IF NOT EXISTS subdomain TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;

-- 3. Criar tabela de configurações da plataforma
CREATE TABLE IF NOT EXISTS platform_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_fee_type TEXT CHECK (platform_fee_type IN ('fixed', 'percentage')) DEFAULT 'percentage',
  platform_fee_value NUMERIC(10,2) DEFAULT 5.0,
  gateway_fee_percentage NUMERIC(5,2) DEFAULT 3.5,
  reseller_withdrawal_fee_type TEXT CHECK (reseller_withdrawal_fee_type IN ('fixed', 'percentage')) DEFAULT 'fixed',
  reseller_withdrawal_fee_value NUMERIC(10,2) DEFAULT 5.0,
  withdrawal_processing_days INTEGER DEFAULT 2,
  guarantee_period_days INTEGER DEFAULT 7,
  auto_withdrawal_enabled BOOLEAN DEFAULT false,
  auto_withdrawal_frequency TEXT CHECK (auto_withdrawal_frequency IN ('weekly', 'monthly')) DEFAULT 'monthly',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Inserir configuração padrão
INSERT INTO platform_settings (id) VALUES (gen_random_uuid()) ON CONFLICT DO NOTHING;

-- 4. Criar tabela de lojas de fornecedores
CREATE TABLE IF NOT EXISTS supplier_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  store_description TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_hours TEXT DEFAULT 'Seg-Sex: 8h às 18h',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 5. Criar tabela de lojas de revendedores
CREATE TABLE IF NOT EXISTS reseller_stores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  store_name TEXT NOT NULL,
  subdomain TEXT UNIQUE,
  store_description TEXT,
  logo_url TEXT,
  primary_color TEXT DEFAULT '#3b82f6',
  secondary_color TEXT DEFAULT '#10b981',
  accent_color TEXT DEFAULT '#8b5cf6',
  custom_banner_url TEXT,
  business_phone TEXT,
  business_email TEXT,
  business_hours TEXT DEFAULT 'Seg-Sex: 8h às 18h',
  profit_margin_percentage NUMERIC(5,2) DEFAULT 20.0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id)
);

-- 6. Criar tabela de transações financeiras
CREATE TABLE IF NOT EXISTS financial_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  order_id UUID REFERENCES orders(id),
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('sale', 'commission', 'withdrawal', 'fee', 'refund')),
  amount NUMERIC(10,2) NOT NULL,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('pending', 'available', 'withdrawn', 'cancelled')) DEFAULT 'pending',
  description TEXT,
  available_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 7. Criar tabela de solicitações de saque
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL,
  fee_amount NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) NOT NULL,
  withdrawal_method TEXT NOT NULL CHECK (withdrawal_method IN ('pix', 'ted')),
  pix_key TEXT,
  bank_account_data JSONB,
  status TEXT NOT NULL CHECK (status IN ('pending', 'approved', 'processing', 'completed', 'rejected')) DEFAULT 'pending',
  admin_notes TEXT,
  processed_by UUID REFERENCES profiles(user_id),
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  processed_at TIMESTAMP WITH TIME ZONE
);

-- 8. Criar tabela de importações de produtos
CREATE TABLE IF NOT EXISTS product_imports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reseller_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  profit_margin_percentage NUMERIC(5,2) NOT NULL,
  reseller_price NUMERIC(10,2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  imported_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(reseller_id, product_id)
);

-- 9. Criar tabela de notificações
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('order', 'product', 'financial', 'system')),
  action_url TEXT,
  action_label TEXT,
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 10. Atualizar tabela products para incluir supplier_id
ALTER TABLE products 
ADD COLUMN IF NOT EXISTS supplier_id UUID REFERENCES profiles(user_id);

-- 11. Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_financial_transactions_user_status ON financial_transactions(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_product_imports_reseller ON product_imports(reseller_id);
CREATE INDEX IF NOT EXISTS idx_products_supplier ON products(supplier_id);

-- 12. Configurar RLS para novas tabelas

-- Platform Settings - Apenas super_admin pode gerenciar
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins can manage platform settings" ON platform_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Supplier Stores
ALTER TABLE supplier_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Suppliers can manage their own store" ON supplier_stores
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all supplier stores" ON supplier_stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Reseller Stores
ALTER TABLE reseller_stores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resellers can manage their own store" ON reseller_stores
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all reseller stores" ON reseller_stores
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Financial Transactions
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own transactions" ON financial_transactions
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Super admins can view all transactions" ON financial_transactions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Withdrawal Requests
ALTER TABLE withdrawal_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own withdrawal requests" ON withdrawal_requests
  FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "Super admins can manage all withdrawal requests" ON withdrawal_requests
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Product Imports
ALTER TABLE product_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Resellers can manage their own imports" ON product_imports
  FOR ALL USING (auth.uid() = reseller_id);
CREATE POLICY "Suppliers can view imports of their products" ON product_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products p 
      WHERE p.id = product_imports.product_id AND p.supplier_id = auth.uid()
    )
  );
CREATE POLICY "Super admins can view all imports" ON product_imports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE user_id = auth.uid() AND role = 'super_admin'
    )
  );

-- Notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own notifications" ON notifications
  FOR ALL USING (auth.uid() = user_id);

-- 13. Criar triggers para updated_at
CREATE TRIGGER update_platform_settings_updated_at
  BEFORE UPDATE ON platform_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_supplier_stores_updated_at
  BEFORE UPDATE ON supplier_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reseller_stores_updated_at
  BEFORE UPDATE ON reseller_stores
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_product_imports_updated_at
  BEFORE UPDATE ON product_imports
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 14. Criar função para verificar role específico
CREATE OR REPLACE FUNCTION public.has_role(user_role app_role)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM profiles 
    WHERE user_id = auth.uid() AND role = user_role
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE SET search_path = public;