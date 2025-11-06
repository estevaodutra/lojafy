-- Criar funções SECURITY DEFINER para quebrar ciclo de RLS

-- Função para verificar se fornecedor tem acesso ao pedido (sem ler orders table)
CREATE OR REPLACE FUNCTION public.has_supplier_access_to_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.order_items oi
    JOIN public.products p ON p.id = oi.product_id
    WHERE oi.order_id = _order_id
      AND p.supplier_id = _user_id
  );
$$;

-- Função para verificar se pedido pertence ao usuário (sem ler orders table)
CREATE OR REPLACE FUNCTION public.is_users_order(_user_id uuid, _order_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.id = _order_id
      AND o.user_id = _user_id
  );
$$;

-- Atualizar policy de orders para fornecedores (usando função SECURITY DEFINER)
DROP POLICY IF EXISTS "Suppliers can view orders with their products" ON public.orders;
CREATE POLICY "Suppliers can view orders with their products"
  ON public.orders
  FOR SELECT
  USING (public.has_supplier_access_to_order(auth.uid(), id));

-- Atualizar policies de order_items para usuários (usando função SECURITY DEFINER)
DROP POLICY IF EXISTS "Users can view order items for their orders" ON public.order_items;
DROP POLICY IF EXISTS "users_select_items_of_own_orders" ON public.order_items;
CREATE POLICY "Users can view items of own orders"
  ON public.order_items
  FOR SELECT
  USING (public.is_users_order(auth.uid(), order_items.order_id));