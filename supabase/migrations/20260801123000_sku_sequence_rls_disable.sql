-- 20260801123000_sku_sequence_rls_disable.sql
-- Desabilita RLS na tabela supplier_sku_sequences para evitar bloqueio na geração de SKU.

ALTER TABLE public.supplier_sku_sequences DISABLE ROW LEVEL SECURITY;
