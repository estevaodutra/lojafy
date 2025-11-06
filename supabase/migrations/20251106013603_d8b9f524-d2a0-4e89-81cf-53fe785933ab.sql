-- Remover a policy problemática que causa recursão infinita na tabela orders
DROP POLICY IF EXISTS "Secure order data for ranking only" ON public.orders;