-- Redefinir o trigger para remover completamente o bloqueio de ativação de produtos em qualquer estágio
CREATE OR REPLACE FUNCTION public.enforce_product_stage_guard()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Regra de bloqueio de ativação removida por solicitação do usuário.
  -- Os produtos podem ser ativados livremente, independente de seu estágio.
  RETURN NEW;
END;
$$;
