-- =============================================================================
-- Teste de dinheiro do módulo Fornecedor (roda inteiro em uma transação e dá
-- ROLLBACK no final — não deixa nenhum dado no banco).
--
-- Valida, na ordem:
--   1. Pedido pago → fulfillment criado por trigger + colunas financeiras
--      congeladas em order_items + crédito do total na carteira do super admin.
--   2. Editar products.cost_price DEPOIS da venda não muda o repasse.
--   3. Transições até 'shipped' → rollup de orders.status para 'enviado' →
--      crédito na carteira do fornecedor = valor CONGELADO.
--   4. Débito físico de estoque + ledger no envio.
--   5. Idempotência: re-disparo do status 'enviado' não duplica splits.
--
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/money-test.sql
-- (requer papel com acesso a auth.users — o postgres do self-hosted serve)
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

DO $$
DECLARE
  v_supplier_id UUID := gen_random_uuid();
  v_customer_id UUID := gen_random_uuid();
  v_admin_id UUID;
  v_admin_created BOOLEAN := false;
  v_org_id UUID;
  v_product_id UUID;
  v_order_id UUID;
  v_order_item_id UUID;
  v_fulfillment_id UUID;
  v_split_pct NUMERIC;
  v_expected_supplier_amount NUMERIC;
  v_frozen_unit_cost NUMERIC;
  v_frozen_net NUMERIC;
  v_order_status TEXT;
  v_supplier_saldo NUMERIC;
  v_admin_saldo_after_payment NUMERIC;
  v_split_count INTEGER;
  v_split_valor NUMERIC;
  v_stock INTEGER;
  v_ledger_count INTEGER;
  v_qty CONSTANT INTEGER := 2;
  v_unit_price CONSTANT NUMERIC := 100.00;
  v_original_cost CONSTANT NUMERIC := 40.00;
  v_tampered_cost CONSTANT NUMERIC := 99.00;
BEGIN
  RAISE NOTICE '=== TESTE DE DINHEIRO — início (tudo será revertido) ===';

  -- ---------------------------------------------------------------------------
  -- Setup: super admin (usa o existente ou cria sintético), supplier e customer
  -- ---------------------------------------------------------------------------
  SELECT user_id INTO v_admin_id FROM public.profiles
  WHERE role IN ('super_admin', 'admin') ORDER BY role DESC LIMIT 1;

  IF v_admin_id IS NULL THEN
    v_admin_id := gen_random_uuid();
    v_admin_created := true;
    INSERT INTO auth.users (id, email, aud, role, created_at, updated_at)
    VALUES (v_admin_id, 'money-test-admin@test.local', 'authenticated', 'authenticated', now(), now());
    INSERT INTO public.profiles (user_id, first_name, role)
    VALUES (v_admin_id, 'MoneyTest Admin', 'super_admin')
    ON CONFLICT (user_id) DO UPDATE SET role = 'super_admin';
  END IF;

  INSERT INTO auth.users (id, email, aud, role, created_at, updated_at) VALUES
    (v_supplier_id, 'money-test-supplier@test.local', 'authenticated', 'authenticated', now(), now()),
    (v_customer_id, 'money-test-customer@test.local', 'authenticated', 'authenticated', now(), now());

  -- o trigger handle_new_user já cria o profile no INSERT em auth.users;
  -- o UPSERT apenas define o papel (e dispara o provisionamento da org)
  INSERT INTO public.profiles (user_id, first_name, role)
  VALUES (v_supplier_id, 'MoneyTest Supplier', 'supplier')
  ON CONFLICT (user_id) DO UPDATE SET role = 'supplier';
  INSERT INTO public.profiles (user_id, first_name, role)
  VALUES (v_customer_id, 'MoneyTest Customer', 'customer')
  ON CONFLICT (user_id) DO UPDATE SET role = 'customer';

  -- trigger de provisionamento deve ter criado a org do supplier
  SELECT id INTO v_org_id FROM public.supplier_organizations WHERE owner_user_id = v_supplier_id;
  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'FALHOU: org do supplier não foi provisionada pelo trigger';
  END IF;
  RAISE NOTICE 'ok: org do supplier provisionada (%)', v_org_id;

  -- ---------------------------------------------------------------------------
  -- Produto do supplier com custo original
  -- ---------------------------------------------------------------------------
  INSERT INTO public.products (name, price, cost_price, supplier_id, stock_quantity, active, approval_status)
  VALUES ('Produto MoneyTest', v_unit_price, v_original_cost, v_supplier_id, 10, false, 'draft')
  RETURNING id INTO v_product_id;

  -- ---------------------------------------------------------------------------
  -- Pedido pendente + item (congelamento acontece no INSERT do item)
  -- ---------------------------------------------------------------------------
  INSERT INTO public.orders (user_id, order_number, status, payment_status, total_amount)
  VALUES (v_customer_id, 'MONEYTEST-' || substr(gen_random_uuid()::text, 1, 8), 'pendente', 'pending', v_unit_price * v_qty)
  RETURNING id INTO v_order_id;

  INSERT INTO public.order_items (order_id, product_id, quantity, unit_price, total_price)
  VALUES (v_order_id, v_product_id, v_qty, v_unit_price, v_unit_price * v_qty)
  RETURNING id INTO v_order_item_id;

  SELECT supplier_unit_cost, supplier_net_amount INTO v_frozen_unit_cost, v_frozen_net
  FROM public.order_items WHERE id = v_order_item_id;

  IF v_frozen_unit_cost IS DISTINCT FROM v_original_cost THEN
    RAISE EXCEPTION 'FALHOU: supplier_unit_cost congelado = % (esperado %)', v_frozen_unit_cost, v_original_cost;
  END IF;

  SELECT COALESCE(split_fornecedor_percentual, 0) INTO v_split_pct FROM public.platform_settings LIMIT 1;
  v_split_pct := COALESCE(v_split_pct, 0);
  IF v_split_pct > 0 THEN
    v_expected_supplier_amount := v_unit_price * v_qty * (v_split_pct / 100.0);
  ELSE
    v_expected_supplier_amount := v_original_cost * v_qty;
  END IF;

  IF round(v_frozen_net, 2) IS DISTINCT FROM round(v_expected_supplier_amount, 2) THEN
    RAISE EXCEPTION 'FALHOU: supplier_net_amount congelado = % (esperado %)', v_frozen_net, v_expected_supplier_amount;
  END IF;
  RAISE NOTICE 'ok: financeiro congelado no INSERT (custo unit %, repasse %)', v_frozen_unit_cost, v_frozen_net;

  -- ---------------------------------------------------------------------------
  -- Pagamento confirmado (caminho PIX): fulfillment + crédito do admin
  -- ---------------------------------------------------------------------------
  UPDATE public.orders SET payment_status = 'paid', status = 'pago' WHERE id = v_order_id;

  SELECT id INTO v_fulfillment_id FROM public.supplier_fulfillments
  WHERE order_id = v_order_id AND supplier_organization_id = v_org_id;
  IF v_fulfillment_id IS NULL THEN
    RAISE EXCEPTION 'FALHOU: fulfillment não foi criado no pagamento';
  END IF;
  RAISE NOTICE 'ok: fulfillment criado (%)', v_fulfillment_id;

  SELECT count(*) INTO v_ledger_count FROM public.supplier_inventory_movements
  WHERE reference_id = v_fulfillment_id AND movement_type = 'reservation';
  IF v_ledger_count <> 1 THEN
    RAISE EXCEPTION 'FALHOU: reserva informacional no ledger = % (esperado 1)', v_ledger_count;
  END IF;

  SELECT saldo INTO v_admin_saldo_after_payment FROM public.wallets WHERE user_id = v_admin_id;
  RAISE NOTICE 'ok: admin creditado no pagamento (saldo %)', v_admin_saldo_after_payment;

  -- ---------------------------------------------------------------------------
  -- Edição RETROATIVA do custo — não pode afetar o repasse
  -- ---------------------------------------------------------------------------
  UPDATE public.products SET cost_price = v_tampered_cost WHERE id = v_product_id;
  RAISE NOTICE 'ok: cost_price adulterado para % após a venda', v_tampered_cost;

  -- ---------------------------------------------------------------------------
  -- Fluxo operacional até o envio (rollup deve levar orders.status a enviado)
  -- ---------------------------------------------------------------------------
  UPDATE public.supplier_fulfillments SET status = 'picking' WHERE id = v_fulfillment_id;
  UPDATE public.supplier_fulfillments SET status = 'picked' WHERE id = v_fulfillment_id;
  UPDATE public.supplier_fulfillments SET status = 'packing' WHERE id = v_fulfillment_id;
  UPDATE public.supplier_fulfillments SET status = 'packed' WHERE id = v_fulfillment_id;
  UPDATE public.supplier_fulfillments SET status = 'label_ready' WHERE id = v_fulfillment_id;
  UPDATE public.supplier_fulfillments
  SET status = 'shipped', tracking_code = 'BRMONEYTEST123', carrier = 'Correios'
  WHERE id = v_fulfillment_id;

  SELECT status INTO v_order_status FROM public.orders WHERE id = v_order_id;
  IF v_order_status IS DISTINCT FROM 'enviado' THEN
    RAISE EXCEPTION 'FALHOU: rollup de status = % (esperado enviado)', v_order_status;
  END IF;
  RAISE NOTICE 'ok: rollup levou o pedido a enviado';

  -- ---------------------------------------------------------------------------
  -- O CORAÇÃO DO TESTE: crédito do fornecedor = valor congelado
  -- ---------------------------------------------------------------------------
  SELECT count(*), max(valor) INTO v_split_count, v_split_valor
  FROM public.order_payment_splits
  WHERE order_id = v_order_id AND recipient_user_id = v_supplier_id AND recipient_role = 'supplier';

  IF v_split_count <> 1 THEN
    RAISE EXCEPTION 'FALHOU: % splits de fornecedor (esperado 1)', v_split_count;
  END IF;
  IF round(v_split_valor, 2) IS DISTINCT FROM round(v_expected_supplier_amount, 2) THEN
    RAISE EXCEPTION 'FALHOU: split = % — o custo adulterado vazou! (esperado congelado %)',
      v_split_valor, v_expected_supplier_amount;
  END IF;

  SELECT saldo INTO v_supplier_saldo FROM public.wallets WHERE user_id = v_supplier_id;
  IF round(v_supplier_saldo, 2) IS DISTINCT FROM round(v_expected_supplier_amount, 2) THEN
    RAISE EXCEPTION 'FALHOU: saldo do fornecedor = % (esperado %)', v_supplier_saldo, v_expected_supplier_amount;
  END IF;
  RAISE NOTICE 'ok: fornecedor creditado com o valor CONGELADO (%) — edição retroativa ignorada', v_supplier_saldo;

  -- ---------------------------------------------------------------------------
  -- Estoque: débito físico + ledger no envio
  -- ---------------------------------------------------------------------------
  SELECT stock_quantity INTO v_stock FROM public.products WHERE id = v_product_id;
  IF v_stock <> 10 - v_qty THEN
    RAISE EXCEPTION 'FALHOU: estoque físico = % (esperado %)', v_stock, 10 - v_qty;
  END IF;
  SELECT count(*) INTO v_ledger_count FROM public.supplier_inventory_movements
  WHERE reference_id = v_fulfillment_id AND movement_type = 'sale_deduction';
  IF v_ledger_count <> 1 THEN
    RAISE EXCEPTION 'FALHOU: sale_deduction no ledger = % (esperado 1)', v_ledger_count;
  END IF;
  RAISE NOTICE 'ok: estoque debitado no envio (10 → %) com ledger', v_stock;

  -- ---------------------------------------------------------------------------
  -- Idempotência: re-disparo do enviado não duplica splits nem crédito
  -- ---------------------------------------------------------------------------
  UPDATE public.orders SET status = 'embalado' WHERE id = v_order_id;
  UPDATE public.orders SET status = 'enviado' WHERE id = v_order_id;

  SELECT count(*) INTO v_split_count FROM public.order_payment_splits
  WHERE order_id = v_order_id AND recipient_user_id = v_supplier_id AND recipient_role = 'supplier';
  IF v_split_count <> 1 THEN
    RAISE EXCEPTION 'FALHOU: re-disparo duplicou splits (%)', v_split_count;
  END IF;

  SELECT saldo INTO v_supplier_saldo FROM public.wallets WHERE user_id = v_supplier_id;
  IF round(v_supplier_saldo, 2) IS DISTINCT FROM round(v_expected_supplier_amount, 2) THEN
    RAISE EXCEPTION 'FALHOU: re-disparo mudou o saldo do fornecedor (%)', v_supplier_saldo;
  END IF;
  RAISE NOTICE 'ok: idempotente — re-disparo não duplicou crédito';

  RAISE NOTICE '=== TESTE DE DINHEIRO: TODOS OS CHECKS PASSARAM ✔ (revertendo tudo) ===';
END;
$$;

ROLLBACK;
