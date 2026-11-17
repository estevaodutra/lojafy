-- Migration: Supplier order items visibility & RPC
-- 1. Updates has_supplier_access_to_order to support admin users and organization memberships
-- 2. Grants SELECT permissions on order_items to Admins and Suppliers
-- 3. Creates RPC get_supplier_order_items to guarantee complete product information in supplier panel

-- 1. Helper function to verify supplier access to an order
CREATE OR REPLACE FUNCTION public.has_supplier_access_to_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (
    public.is_admin_user()
    OR EXISTS (
      SELECT 1
      FROM public.supplier_fulfillments sf
      JOIN public.supplier_members sm ON sm.organization_id = sf.supplier_organization_id
      WHERE sf.order_id = _order_id
        AND sm.user_id = _user_id
        AND sm.active = true
    )
    OR EXISTS (
      SELECT 1
      FROM public.supplier_fulfillments sf
      WHERE sf.order_id = _order_id
        AND public.is_supplier_org_member(sf.supplier_organization_id, _user_id)
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      JOIN public.products p ON p.id = oi.product_id
      WHERE oi.order_id = _order_id
        AND (p.supplier_id = _user_id OR public.is_supplier_org_member(p.supplier_organization_id, _user_id))
    )
    OR EXISTS (
      SELECT 1
      FROM public.order_items oi
      WHERE oi.order_id = _order_id
        AND (oi.supplier_id = _user_id OR public.is_supplier_org_member(oi.supplier_organization_id, _user_id))
    )
  );
$$;

-- 2. RLS on public.order_items
DROP POLICY IF EXISTS "Admins can view all order items" ON public.order_items;
CREATE POLICY "Admins can view all order items"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (public.is_admin_user());

DROP POLICY IF EXISTS "Suppliers can view order items of their orders" ON public.order_items;
CREATE POLICY "Suppliers can view order items of their orders"
  ON public.order_items
  FOR SELECT
  TO authenticated
  USING (
    public.is_admin_user()
    OR public.has_supplier_access_to_order(auth.uid(), order_id)
    OR supplier_id = auth.uid()
    OR (supplier_organization_id IS NOT NULL AND public.is_supplier_org_member(supplier_organization_id, auth.uid()))
    OR EXISTS (
      SELECT 1
      FROM public.supplier_fulfillments sf
      WHERE sf.order_id = order_items.order_id
        AND (
          sf.supplier_organization_id = order_items.supplier_organization_id
          OR public.is_supplier_org_member(sf.supplier_organization_id, auth.uid())
        )
    )
  );

-- 3. Security definer RPC to fetch order items with resolved product data
CREATE OR REPLACE FUNCTION public.get_supplier_order_items(p_order_ids uuid[])
RETURNS TABLE (
  id uuid,
  order_id uuid,
  product_id uuid,
  quantity integer,
  unit_price numeric,
  total_price numeric,
  supplier_unit_cost numeric,
  supplier_total_cost numeric,
  product_snapshot jsonb,
  supplier_id uuid,
  supplier_organization_id uuid,
  product_name text,
  product_image_url text,
  product_sku text
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    oi.id,
    oi.order_id,
    oi.product_id,
    oi.quantity,
    oi.unit_price,
    oi.total_price,
    oi.supplier_unit_cost,
    oi.supplier_total_cost,
    oi.product_snapshot,
    oi.supplier_id,
    oi.supplier_organization_id,
    COALESCE(
      NULLIF(trim(oi.product_snapshot->>'name'), ''),
      NULLIF(trim(p.name), ''),
      'Produto'
    ) AS product_name,
    COALESCE(
      NULLIF(trim(oi.product_snapshot->>'image_url'), ''),
      NULLIF(trim(oi.product_snapshot->>'imageUrl'), ''),
      NULLIF(trim(oi.product_snapshot->'images'->>0), ''),
      NULLIF(trim(p.image_url), ''),
      NULLIF(trim(p.images->>0), '')
    ) AS product_image_url,
    COALESCE(
      NULLIF(trim(oi.product_snapshot->>'sku'), ''),
      NULLIF(trim(p.sku), ''),
      ''
    ) AS product_sku
  FROM public.order_items oi
  LEFT JOIN public.products p ON p.id = oi.product_id
  WHERE oi.order_id = ANY(p_order_ids)
    AND (
      public.is_admin_user()
      OR public.has_supplier_access_to_order(auth.uid(), oi.order_id)
      OR oi.supplier_id = auth.uid()
      OR (oi.supplier_organization_id IS NOT NULL AND public.is_supplier_org_member(oi.supplier_organization_id, auth.uid()))
      OR EXISTS (
        SELECT 1 FROM public.supplier_fulfillments sf
        WHERE sf.order_id = oi.order_id
          AND public.is_supplier_org_member(sf.supplier_organization_id, auth.uid())
      )
    );
$$;

GRANT EXECUTE ON FUNCTION public.get_supplier_order_items(uuid[]) TO authenticated;
