-- =============================================================================
-- Migration: 20261001170000_supplier_product_pricing_and_rls.sql
-- Adiciona suporte a custo original do fornecedor e flexibiliza permissões de update
-- =============================================================================

-- 1. Adicionar supplier_cost_price na tabela products se ainda não existir
ALTER TABLE public.products 
ADD COLUMN IF NOT EXISTS supplier_cost_price NUMERIC;

COMMENT ON COLUMN public.products.supplier_cost_price IS 'Preço de custo de fabricação ou aquisição declarado pelo fornecedor';

-- 2. Atualizar política de UPDATE em products para permitir membros de organização de fornecedor
DROP POLICY IF EXISTS "Suppliers can update their own products" ON public.products;
CREATE POLICY "Suppliers can update their own products"
  ON public.products FOR UPDATE
  TO authenticated
  USING (
    public.is_admin_user()
    OR supplier_id = auth.uid()
    OR (supplier_organization_id IS NOT NULL AND public.is_supplier_org_member(supplier_organization_id, auth.uid()))
  )
  WITH CHECK (
    public.is_admin_user()
    OR supplier_id = auth.uid()
    OR (supplier_organization_id IS NOT NULL AND public.is_supplier_org_member(supplier_organization_id, auth.uid()))
  );
