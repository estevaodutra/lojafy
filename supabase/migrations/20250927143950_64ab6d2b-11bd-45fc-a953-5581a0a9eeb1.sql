-- Função para atualizar has_shipping_file automaticamente
CREATE OR REPLACE FUNCTION public.update_order_shipping_file_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se é INSERT ou UPDATE, verificar se há arquivos para este pedido
  IF TG_OP = 'INSERT' THEN
    UPDATE public.orders 
    SET has_shipping_file = true 
    WHERE id = NEW.order_id;
    RETURN NEW;
  END IF;
  
  -- Se é DELETE, verificar se ainda existem arquivos
  IF TG_OP = 'DELETE' THEN
    UPDATE public.orders 
    SET has_shipping_file = (
      SELECT COUNT(*) > 0 
      FROM public.order_shipping_files 
      WHERE order_id = OLD.order_id
    )
    WHERE id = OLD.order_id;
    RETURN OLD;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para executar a função automaticamente
DROP TRIGGER IF EXISTS trigger_update_shipping_file_status ON public.order_shipping_files;
CREATE TRIGGER trigger_update_shipping_file_status
  AFTER INSERT OR DELETE ON public.order_shipping_files
  FOR EACH ROW
  EXECUTE FUNCTION public.update_order_shipping_file_status();

-- Atualizar registros existentes para corrigir inconsistências
UPDATE public.orders 
SET has_shipping_file = (
  SELECT COUNT(*) > 0 
  FROM public.order_shipping_files 
  WHERE order_id = orders.id
);

-- Criar índice para melhor performance
CREATE INDEX IF NOT EXISTS idx_order_shipping_files_order_id ON public.order_shipping_files(order_id);