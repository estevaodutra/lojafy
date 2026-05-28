-- Create function to sync top 10 best selling products to feature_produtos and products.featured
CREATE OR REPLACE FUNCTION public.sync_top_10_and_featured_products()
RETURNS void AS $$
DECLARE
  v_feature_id UUID;
  v_prod_id UUID;
  v_ordem INTEGER := 1;
  v_top_products UUID[] := ARRAY[]::UUID[];
BEGIN
  -- 1. Garante que a feature existe
  INSERT INTO public.features (slug, nome, descricao, icone, categoria, ordem_exibicao, preco_mensal, preco_anual, preco_vitalicio, trial_dias, roles_permitidas, requer_features, ativo, visivel_catalogo)
  VALUES ('top_10_produtos', 'Top 10 Produtos Vencedores', 'Os 10 produtos mais vendidos da plataforma', 'Trophy', 'recursos', 10, 0.00, 0.00, 0.00, 0, ARRAY['reseller', 'supplier', 'customer'], ARRAY[]::TEXT[], true, true)
  ON CONFLICT (slug) DO NOTHING;

  -- Pega o ID da feature
  SELECT id INTO v_feature_id FROM public.features WHERE slug = 'top_10_produtos';

  IF v_feature_id IS NULL THEN
    RETURN;
  END IF;

  -- 2. Calcula os top 10 produtos ativos mais vendidos da plataforma
  -- Se houver menos de 10 produtos com vendas, preenche com os produtos ativos mais recentes
  WITH top_sold AS (
    SELECT oi.product_id, SUM(oi.quantity) as total_sales
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered')
    GROUP BY oi.product_id
  ),
  ranked_products AS (
    SELECT p.id as product_id, COALESCE(ts.total_sales, 0) as total_sales
    FROM public.products p
    LEFT JOIN top_sold ts ON p.id = ts.product_id
    WHERE p.active = true
    ORDER BY total_sales DESC, p.created_at DESC
    LIMIT 10
  )
  SELECT COALESCE(array_agg(product_id), ARRAY[]::UUID[]) INTO v_top_products FROM ranked_products;

  -- 3. Remove produtos da feature que não estão mais no top 10
  DELETE FROM public.feature_produtos 
  WHERE feature_id = v_feature_id AND NOT (produto_id = ANY(v_top_products));

  -- 4. Insere ou atualiza os novos top 10 produtos na tabela feature_produtos (preservando reference_link)
  IF cardinality(v_top_products) > 0 THEN
    FOREACH v_prod_id IN ARRAY v_top_products LOOP
      INSERT INTO public.feature_produtos (feature_id, produto_id, ordem, ativo)
      VALUES (v_feature_id, v_prod_id, v_ordem, true)
      ON CONFLICT (feature_id, produto_id) DO UPDATE 
      SET ordem = EXCLUDED.ordem, ativo = EXCLUDED.ativo;
      
      v_ordem := v_ordem + 1;
    END LOOP;
  END IF;

  -- 5. Sincroniza a categoria "Produtos Campeões" (coluna products.featured)
  -- Desmarca quem não é top 10
  UPDATE public.products SET featured = false WHERE featured = true AND NOT (id = ANY(v_top_products));
  
  -- Marca quem é top 10
  UPDATE public.products SET featured = true WHERE id = ANY(v_top_products);

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger function
CREATE OR REPLACE FUNCTION public.trigger_sync_top_products()
RETURNS trigger AS $$
DECLARE
  v_should_sync BOOLEAN := FALSE;
BEGIN
  IF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN
      IF NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered') THEN
        v_should_sync := TRUE;
      END IF;
    ELSIF TG_OP = 'UPDATE' THEN
      IF NEW.status IS DISTINCT FROM OLD.status AND 
         (NEW.status IN ('confirmed', 'processing', 'shipped', 'delivered') OR 
          OLD.status IN ('confirmed', 'processing', 'shipped', 'delivered')) THEN
        v_should_sync := TRUE;
      END IF;
    END IF;
  ELSIF TG_TABLE_NAME = 'order_items' THEN
    v_should_sync := TRUE;
  ELSIF TG_TABLE_NAME = 'products' THEN
    IF TG_OP = 'UPDATE' THEN
      IF NEW.active IS DISTINCT FROM OLD.active THEN
        v_should_sync := TRUE;
      END IF;
    END IF;
  END IF;

  IF v_should_sync THEN
    PERFORM public.sync_top_10_and_featured_products();
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  ELSE
    RETURN NEW;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create triggers
DROP TRIGGER IF EXISTS trigger_sync_top_products_orders ON public.orders;
CREATE TRIGGER trigger_sync_top_products_orders
AFTER INSERT OR UPDATE ON public.orders
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_top_products();

DROP TRIGGER IF EXISTS trigger_sync_top_products_order_items ON public.order_items;
CREATE TRIGGER trigger_sync_top_products_order_items
AFTER INSERT OR UPDATE OR DELETE ON public.order_items
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_top_products();

DROP TRIGGER IF EXISTS trigger_sync_top_products_products ON public.products;
CREATE TRIGGER trigger_sync_top_products_products
AFTER UPDATE OF active ON public.products
FOR EACH ROW
EXECUTE FUNCTION public.trigger_sync_top_products();

-- Run the sync initially to update existing items
SELECT public.sync_top_10_and_featured_products();
