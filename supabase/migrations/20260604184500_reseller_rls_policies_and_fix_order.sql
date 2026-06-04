-- 1. Vincular o reseller_id nos pedidos antigos reportados que ficaram com reseller_id nulo
UPDATE public.orders
SET reseller_id = (
  SELECT id 
  FROM auth.users 
  WHERE email = 'ranierymarques353@gmail.com'
  LIMIT 1
)
WHERE id IN ('d077ce1b-a179-402f-8476-8e0374970d26', '33e9d33e-3af9-4200-a4ea-3a54702e9719');

-- 2. Políticas RLS para tabela orders (Permitir revendedor visualizar e atualizar seus pedidos)
DROP POLICY IF EXISTS "Resellers can view their own orders" ON public.orders;
CREATE POLICY "Resellers can view their own orders" ON public.orders
  FOR SELECT
  TO authenticated
  USING (reseller_id = auth.uid());

DROP POLICY IF EXISTS "Resellers can update their own orders" ON public.orders;
CREATE POLICY "Resellers can update their own orders" ON public.orders
  FOR UPDATE
  TO authenticated
  USING (reseller_id = auth.uid())
  WITH CHECK (reseller_id = auth.uid());

-- 3. Políticas RLS para tabela order_shipping_files (Permitir revendedor visualizar e inserir registros de etiquetas)
DROP POLICY IF EXISTS "Resellers can view shipping files of their orders" ON public.order_shipping_files;
CREATE POLICY "Resellers can view shipping files of their orders" ON public.order_shipping_files
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_shipping_files.order_id 
    AND orders.reseller_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Resellers can insert shipping files for their orders" ON public.order_shipping_files;
CREATE POLICY "Resellers can insert shipping files for their orders" ON public.order_shipping_files
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_shipping_files.order_id 
    AND orders.reseller_id = auth.uid()
  ));

-- 4. Políticas RLS para tabela order_status_history (Permitir revendedor visualizar e inserir histórico)
DROP POLICY IF EXISTS "Resellers can view status history of their orders" ON public.order_status_history;
CREATE POLICY "Resellers can view status history of their orders" ON public.order_status_history
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.reseller_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Resellers can insert status history for their orders" ON public.order_status_history;
CREATE POLICY "Resellers can insert status history for their orders" ON public.order_status_history
  FOR INSERT
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.orders 
    WHERE orders.id = order_status_history.order_id 
    AND orders.reseller_id = auth.uid()
  ));

-- 5. Políticas RLS para bucket storage de shipping-files (Permitir upload e download de PDFs)
DROP POLICY IF EXISTS "Resellers can upload shipping files for their orders" ON storage.objects;
CREATE POLICY "Resellers can upload shipping files for their orders"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.reseller_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);

DROP POLICY IF EXISTS "Resellers can view shipping files for their orders" ON storage.objects;
CREATE POLICY "Resellers can view shipping files for their orders"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'shipping-files'
  AND EXISTS (
    SELECT 1
    FROM public.orders o
    WHERE o.reseller_id = auth.uid()
      AND o.id::text = (storage.foldername(name))[1]
  )
);
