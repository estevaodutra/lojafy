-- Avança a sequência para depois dos 460 pedidos existentes
SELECT SETVAL('order_number_seq', 460, true);

-- Atualiza generate_order_number() para retornar número simples sequencial
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN NEXTVAL('order_number_seq')::TEXT;
END;
$$;
