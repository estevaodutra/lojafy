-- Migration: Função e Agendamento Semanal para Top Produtos
-- Date: 2026-11-10

CREATE OR REPLACE FUNCTION public.sync_weekly_top_products(
  p_limit integer DEFAULT 10,
  p_notify boolean DEFAULT true
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_feature_id UUID;
  v_prod_id UUID;
  v_ordem INTEGER := 1;
  v_top_products UUID[] := ARRAY[]::UUID[];
  v_campaign_id UUID;
  v_user_record RECORD;
BEGIN
  -- 1. Garante que a feature existe
  SELECT id INTO v_feature_id FROM public.features WHERE slug = 'top_10_produtos' LIMIT 1;
  
  IF v_feature_id IS NULL THEN
    INSERT INTO public.features (
      slug, nome, descricao, icone, categoria, ordem_exibicao,
      preco_mensal, preco_anual, preco_vitalicio, trial_dias,
      roles_permitidas, requer_features, ativo, visivel_catalogo,
      gerencia_produtos, limite_produtos, metadata
    )
    VALUES (
      'top_10_produtos',
      'Top 10 Produtos Vencedores',
      'Os produtos mais vendidos da plataforma com base em pedidos processados',
      'Trophy',
      'recursos',
      10,
      0.00, 0.00, 0.00, 0,
      ARRAY['reseller', 'supplier', 'customer'],
      ARRAY[]::TEXT[],
      true,
      true,
      true,
      p_limit,
      jsonb_build_object(
        'top_ranking_config', jsonb_build_object(
          'auto_update_weekly', true,
          'limit', p_limit,
          'notify_on_update', p_notify,
          'last_updated_at', now()
        )
      )
    )
    RETURNING id INTO v_feature_id;
  END IF;

  -- 2. Calcula os produtos com mais vendas em quantidade nos pedidos processados
  WITH top_sold AS (
    SELECT oi.product_id, SUM(oi.quantity) as total_qty
    FROM public.order_items oi
    JOIN public.orders o ON oi.order_id = o.id
    WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'approved', 'paid', 'concluido', 'enviado')
      AND o.created_at >= (now() - INTERVAL '7 days')
    GROUP BY oi.product_id
  ),
  ranked_recent AS (
    SELECT p.id as product_id, COALESCE(ts.total_qty, 0) as total_qty
    FROM public.products p
    LEFT JOIN top_sold ts ON p.id = ts.product_id
    WHERE p.active = true
    ORDER BY total_qty DESC, p.created_at DESC
    LIMIT p_limit
  )
  SELECT COALESCE(array_agg(product_id), ARRAY[]::UUID[]) INTO v_top_products FROM ranked_recent;

  -- Se menos de p_limit produtos foram encontrados nos últimos 7 dias, completa com os mais vendidos de todo o histórico
  IF cardinality(v_top_products) < p_limit THEN
    WITH top_sold_all AS (
      SELECT oi.product_id, SUM(oi.quantity) as total_qty
      FROM public.order_items oi
      JOIN public.orders o ON oi.order_id = o.id
      WHERE o.status IN ('confirmed', 'processing', 'shipped', 'delivered', 'approved', 'paid', 'concluido', 'enviado')
      GROUP BY oi.product_id
    ),
    ranked_all AS (
      SELECT p.id as product_id, COALESCE(ts.total_qty, 0) as total_qty
      FROM public.products p
      LEFT JOIN top_sold_all ts ON p.id = ts.product_id
      WHERE p.active = true
      ORDER BY total_qty DESC, p.created_at DESC
      LIMIT p_limit
    )
    SELECT COALESCE(array_agg(product_id), ARRAY[]::UUID[]) INTO v_top_products FROM ranked_all;
  END IF;

  -- 3. Atualiza a tabela feature_produtos preservando reference_links existentes
  CREATE TEMP TABLE IF NOT EXISTS temp_saved_links AS
  SELECT produto_id, reference_link 
  FROM public.feature_produtos 
  WHERE feature_id = v_feature_id;

  DELETE FROM public.feature_produtos WHERE feature_id = v_feature_id;

  IF cardinality(v_top_products) > 0 THEN
    FOREACH v_prod_id IN ARRAY v_top_products LOOP
      INSERT INTO public.feature_produtos (feature_id, produto_id, ordem, ativo, reference_link)
      VALUES (
        v_feature_id,
        v_prod_id,
        v_ordem,
        true,
        (SELECT reference_link FROM temp_saved_links WHERE produto_id = v_prod_id LIMIT 1)
      );
      v_ordem := v_ordem + 1;
    END LOOP;
  END IF;

  DROP TABLE IF EXISTS temp_saved_links;

  -- 4. Atualiza metadata da feature com a data da execução
  UPDATE public.features
  SET metadata = jsonb_set(
    COALESCE(metadata, '{}'::jsonb),
    '{top_ranking_config}',
    jsonb_build_object(
      'auto_update_weekly', true,
      'limit', p_limit,
      'notify_on_update', p_notify,
      'last_updated_at', to_jsonb(now()::text)
    )
  )
  WHERE id = v_feature_id;

  -- 5. Dispara notificações para todos os usuários se solicitado
  IF p_notify THEN
    INSERT INTO public.notifications (
      user_id,
      title,
      message,
      type,
      action_url,
      action_label,
      metadata,
      is_read
    )
    SELECT 
      p.id,
      '🏆 Top ' || p_limit || ' Produtos da Semana Atualizado!',
      'O ranking dos produtos mais vendidos da plataforma foi atualizado com base nos pedidos processados. Confira as oportunidades em alta!',
      'system',
      '/ranking',
      'Ver Ranking',
      jsonb_build_object('feature', 'top_10_produtos', 'limit', p_limit, 'updated_at', now()),
      false
    FROM public.profiles p;
  END IF;

END;
$$;

-- Agendamento semanal via pg_cron (toda segunda-feira às 09:00 UTC)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule(jobid)
    FROM cron.job
    WHERE jobname = 'weekly-top-products-sync';

    PERFORM cron.schedule(
      'weekly-top-products-sync',
      '0 9 * * 1',
      $$ SELECT public.sync_weekly_top_products(10, true); $$
    );
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE 'pg_cron not available or schedule failed: %', SQLERRM;
END;
$$;
