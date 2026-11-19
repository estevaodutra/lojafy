-- Migration: Prevenção definitiva de pedidos duplicados do Mercado Livre e arquivamento de duplicados existentes
-- Data: 2026-11-19

-- 1. Identificar e arquivar pedidos duplicados existentes por ml_order_id
WITH ranked_ml_orders AS (
  SELECT 
    id,
    order_number,
    ml_order_id,
    status,
    payment_status,
    ml_label_url,
    has_shipping_file,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY ml_order_id 
      ORDER BY 
        -- Prioridade 1: Pedido que já possui etiqueta emitida/baixada
        CASE WHEN ml_label_url IS NOT NULL OR has_shipping_file = true THEN 1 ELSE 2 END ASC,
        -- Prioridade 2: Pedido pago / não pendente
        CASE WHEN payment_status = 'paid' OR status NOT IN ('pendente', 'Novo Pedido') THEN 1 ELSE 2 END ASC,
        -- Prioridade 3: Mais recente
        created_at DESC
    ) as rn
  FROM public.orders
  WHERE ml_order_id IS NOT NULL 
    AND ml_order_id <> ''
    AND is_archived = false
)
UPDATE public.orders o
SET 
  is_archived = true,
  archived_at = NOW(),
  archived_reason = 'Pedido duplicado do Mercado Livre arquivado automaticamente',
  archived_type = 'auto'
FROM ranked_ml_orders r
WHERE o.id = r.id 
  AND r.rn > 1;

-- 2. Identificar e arquivar pedidos duplicados existentes por payment_id (ml_...)
WITH ranked_payment_ml_orders AS (
  SELECT 
    id,
    order_number,
    payment_id,
    status,
    payment_status,
    ml_label_url,
    has_shipping_file,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY payment_id 
      ORDER BY 
        CASE WHEN ml_label_url IS NOT NULL OR has_shipping_file = true THEN 1 ELSE 2 END ASC,
        CASE WHEN payment_status = 'paid' OR status NOT IN ('pendente', 'Novo Pedido') THEN 1 ELSE 2 END ASC,
        created_at DESC
    ) as rn
  FROM public.orders
  WHERE payment_id LIKE 'ml_%'
    AND payment_id NOT LIKE 'ml_pay_%'
    AND is_archived = false
)
UPDATE public.orders o
SET 
  is_archived = true,
  archived_at = NOW(),
  archived_reason = 'Pedido duplicado do Mercado Livre arquivado automaticamente',
  archived_type = 'auto'
FROM ranked_payment_ml_orders r
WHERE o.id = r.id 
  AND r.rn > 1;

-- 3. Identificar e arquivar pedidos duplicados existentes por ml_shipment_id
WITH ranked_shipment_ml_orders AS (
  SELECT 
    id,
    order_number,
    ml_shipment_id,
    status,
    payment_status,
    ml_label_url,
    has_shipping_file,
    created_at,
    ROW_NUMBER() OVER (
      PARTITION BY ml_shipment_id 
      ORDER BY 
        CASE WHEN ml_label_url IS NOT NULL OR has_shipping_file = true THEN 1 ELSE 2 END ASC,
        CASE WHEN payment_status = 'paid' OR status NOT IN ('pendente', 'Novo Pedido') THEN 1 ELSE 2 END ASC,
        created_at DESC
    ) as rn
  FROM public.orders
  WHERE ml_shipment_id IS NOT NULL
    AND ml_shipment_id <> ''
    AND is_archived = false
)
UPDATE public.orders o
SET 
  is_archived = true,
  archived_at = NOW(),
  archived_reason = 'Pedido duplicado do Mercado Livre arquivado automaticamente',
  archived_type = 'auto'
FROM ranked_shipment_ml_orders r
WHERE o.id = r.id 
  AND r.rn > 1;

-- 4. Criar índice único condicional para impedir múltiplos pedidos ATIVOS com o mesmo ml_order_id
CREATE UNIQUE INDEX IF NOT EXISTS unq_active_orders_ml_order_id 
ON public.orders(ml_order_id) 
WHERE ml_order_id IS NOT NULL AND ml_order_id <> '' AND is_archived = false;

-- 5. Trigger BEFORE INSERT para adquirir advisory lock atômico e prevenir inserções concorrentes
CREATE OR REPLACE FUNCTION public.check_and_prevent_duplicate_ml_orders()
RETURNS TRIGGER AS $$
DECLARE
  v_ml_id TEXT;
  v_existing_id UUID;
  v_existing_order_number TEXT;
BEGIN
  v_ml_id := COALESCE(NEW.ml_order_id, NEW.marketplace_order_id);
  
  -- Se não for pedido do Mercado Livre ou se for arquivado, permite
  IF v_ml_id IS NULL OR v_ml_id = '' OR NEW.is_archived = true THEN
    RETURN NEW;
  END IF;

  -- Advisory lock no escopo da transação para serializar webhooks simultâneos do mesmo pedido
  PERFORM pg_advisory_xact_lock(hashtext('ml_order_' || v_ml_id));

  -- Verifica se já existe um pedido ativo com o mesmo identificador ML
  SELECT id, order_number INTO v_existing_id, v_existing_order_number
  FROM public.orders
  WHERE (ml_order_id = v_ml_id OR marketplace_order_id = v_ml_id OR payment_id = 'ml_' || v_ml_id)
    AND is_archived = false
    AND id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid)
  ORDER BY 
    CASE WHEN ml_label_url IS NOT NULL OR has_shipping_file = true THEN 1 ELSE 2 END ASC,
    created_at ASC
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RAISE EXCEPTION 'DUPLICATE_ML_ORDER: Pedido ML #% já existe no sistema com o Pedido #%', v_ml_id, v_existing_order_number
      USING ERRCODE = '23505'; -- unique_violation
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_duplicate_ml_orders ON public.orders;
CREATE TRIGGER trg_prevent_duplicate_ml_orders
  BEFORE INSERT ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.check_and_prevent_duplicate_ml_orders();
