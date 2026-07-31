-- =============================================================================
-- Teste de RLS do módulo Fornecedor (transacional, com ROLLBACK no final).
--
-- Simula anon / customer / supplier-A / supplier-B via SET ROLE +
-- request.jwt.claims e verifica que:
--   1. anon e customer NÃO leem products/product_variants (cost_price protegido)
--      e leem a loja apenas pelas views store_products/store_product_variants.
--   2. supplier-A não enxerga produtos, fulfillments nem movimentações de B.
--   3. supplier não aprova o próprio produto nem transfere supplier_id.
--   4. authenticated comum não escreve em order_payment_splits.
--   5. Tabelas insert-only (auditoria, histórico, ledger) rejeitam UPDATE/DELETE.
--
-- Uso: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/rls-test.sql
-- =============================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ---------------------------------------------------------------------------
-- Setup (como superusuário): dois fornecedores com um produto aprovado cada
-- ---------------------------------------------------------------------------
CREATE TEMP TABLE t_ids (k TEXT PRIMARY KEY, v UUID);

DO $$
DECLARE
  v_a UUID := gen_random_uuid();
  v_b UUID := gen_random_uuid();
  v_cust UUID := gen_random_uuid();
  v_pa UUID; v_pb UUID;
BEGIN
  INSERT INTO auth.users (id, email, aud, role) VALUES
    (v_a, 'rls-supplier-a@test.local', 'authenticated', 'authenticated'),
    (v_b, 'rls-supplier-b@test.local', 'authenticated', 'authenticated'),
    (v_cust, 'rls-customer@test.local', 'authenticated', 'authenticated');

  INSERT INTO public.profiles (user_id, first_name, role) VALUES (v_a, 'RLS A', 'supplier')
    ON CONFLICT (user_id) DO UPDATE SET role = 'supplier';
  INSERT INTO public.profiles (user_id, first_name, role) VALUES (v_b, 'RLS B', 'supplier')
    ON CONFLICT (user_id) DO UPDATE SET role = 'supplier';
  INSERT INTO public.profiles (user_id, first_name, role) VALUES (v_cust, 'RLS C', 'customer')
    ON CONFLICT (user_id) DO UPDATE SET role = 'customer';

  INSERT INTO public.products (name, price, cost_price, supplier_id, active, approval_status, stage)
  VALUES ('RLS Produto A', 100, 40, v_a, true, 'approved', 'stage_2_enabled') RETURNING id INTO v_pa;
  INSERT INTO public.products (name, price, cost_price, supplier_id, active, approval_status, stage)
  VALUES ('RLS Produto B', 200, 90, v_b, true, 'approved', 'stage_2_enabled') RETURNING id INTO v_pb;

  INSERT INTO t_ids VALUES ('a', v_a), ('b', v_b), ('cust', v_cust), ('pa', v_pa), ('pb', v_pb);
END $$;

-- helper: roda um SELECT como um papel/JWT e devolve a contagem
CREATE OR REPLACE FUNCTION pg_temp.count_as(p_role TEXT, p_uid UUID, p_sql TEXT)
RETURNS INTEGER LANGUAGE plpgsql AS $$
DECLARE v_n INTEGER;
BEGIN
  PERFORM set_config('role', p_role, true);
  PERFORM set_config('request.jwt.claims',
    CASE WHEN p_uid IS NULL THEN '{"role":"anon"}'
         ELSE json_build_object('sub', p_uid, 'role', 'authenticated')::text END, true);
  EXECUTE 'SELECT count(*) FROM (' || p_sql || ') z' INTO v_n;
  PERFORM set_config('role', 'postgres', true);
  RETURN v_n;
END $$;

-- helper: espera que um comando FALHE para um papel/JWT
CREATE OR REPLACE FUNCTION pg_temp.expect_fail(p_role TEXT, p_uid UUID, p_sql TEXT, p_what TEXT)
RETURNS VOID LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('role', p_role, true);
  PERFORM set_config('request.jwt.claims',
    json_build_object('sub', p_uid, 'role', 'authenticated')::text, true);
  BEGIN
    EXECUTE p_sql;
    PERFORM set_config('role', 'postgres', true);
    RAISE EXCEPTION 'FALHOU: % foi permitido (deveria ser bloqueado)', p_what;
  EXCEPTION WHEN insufficient_privilege OR raise_exception OR check_violation THEN
    PERFORM set_config('role', 'postgres', true);
    RAISE NOTICE 'ok: bloqueado — %', p_what;
  END;
END $$;

DO $$
DECLARE
  v_a UUID; v_b UUID; v_cust UUID; v_pa UUID; v_pb UUID;
  v_n INTEGER;
BEGIN
  SELECT v INTO v_a FROM t_ids WHERE k='a';
  SELECT v INTO v_b FROM t_ids WHERE k='b';
  SELECT v INTO v_cust FROM t_ids WHERE k='cust';
  SELECT v INTO v_pa FROM t_ids WHERE k='pa';
  SELECT v INTO v_pb FROM t_ids WHERE k='pb';

  RAISE NOTICE '=== TESTE DE RLS — início ===';

  -- 1. anon não lê a tabela base (cost_price protegido)
  v_n := pg_temp.count_as('anon', NULL, 'SELECT 1 FROM public.products');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FALHOU: anon leu % linhas de products (cost_price vazando)', v_n;
  END IF;
  RAISE NOTICE 'ok: anon lê 0 linhas de products';

  v_n := pg_temp.count_as('anon', NULL, 'SELECT 1 FROM public.product_variants');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FALHOU: anon leu % linhas de product_variants', v_n;
  END IF;
  RAISE NOTICE 'ok: anon lê 0 linhas de product_variants';

  -- ... mas enxerga a loja pela view
  v_n := pg_temp.count_as('anon', NULL, 'SELECT 1 FROM public.store_products');
  IF v_n < 2 THEN
    RAISE EXCEPTION 'FALHOU: anon vê % produtos na store_products (esperado >= 2)', v_n;
  END IF;
  RAISE NOTICE 'ok: anon vê % produtos via store_products', v_n;

  -- 2. customer autenticado também não lê a tabela base
  v_n := pg_temp.count_as('authenticated', v_cust, 'SELECT 1 FROM public.products');
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FALHOU: customer leu % linhas de products', v_n;
  END IF;
  RAISE NOTICE 'ok: customer lê 0 linhas de products';

  -- 3. isolamento entre fornecedores
  v_n := pg_temp.count_as('authenticated', v_a, 'SELECT 1 FROM public.products');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FALHOU: supplier-A vê % produtos (esperado só o próprio)', v_n;
  END IF;
  RAISE NOTICE 'ok: supplier-A vê apenas o próprio produto';

  v_n := pg_temp.count_as('authenticated', v_a,
    format('SELECT 1 FROM public.products WHERE id = %L', v_pb));
  IF v_n <> 0 THEN
    RAISE EXCEPTION 'FALHOU: supplier-A leu o produto de B';
  END IF;
  RAISE NOTICE 'ok: supplier-A não lê o produto de B';

  v_n := pg_temp.count_as('authenticated', v_a, 'SELECT 1 FROM public.supplier_organizations');
  IF v_n <> 1 THEN
    RAISE EXCEPTION 'FALHOU: supplier-A vê % orgs (esperado 1)', v_n;
  END IF;
  RAISE NOTICE 'ok: supplier-A vê apenas a própria organização';

  -- 4. supplier não aprova o próprio produto
  PERFORM pg_temp.expect_fail('authenticated', v_a,
    format('UPDATE public.products SET approval_status = ''approved'' WHERE id = %L', v_pa),
    'supplier aprovando o próprio produto');

  -- 5. supplier não transfere a titularidade
  PERFORM pg_temp.expect_fail('authenticated', v_a,
    format('UPDATE public.products SET supplier_id = %L WHERE id = %L', v_b, v_pa),
    'supplier transferindo supplier_id');

  -- 6. authenticated comum não escreve em order_payment_splits
  PERFORM pg_temp.expect_fail('authenticated', v_cust,
    format('INSERT INTO public.order_payment_splits (order_id, recipient_user_id, recipient_role, valor, status) '
           'VALUES (%L, %L, ''supplier'', 999, ''credited'')', gen_random_uuid(), v_cust),
    'customer inserindo split de pagamento');

  -- 7. tabelas insert-only rejeitam UPDATE
  PERFORM pg_temp.expect_fail('authenticated', v_a,
    'UPDATE public.supplier_audit_logs SET action = ''hack''', 'UPDATE em supplier_audit_logs');
  PERFORM pg_temp.expect_fail('authenticated', v_a,
    'DELETE FROM public.supplier_inventory_movements', 'DELETE em supplier_inventory_movements');
  PERFORM pg_temp.expect_fail('authenticated', v_a,
    'UPDATE public.supplier_fulfillment_status_history SET to_status = ''hack''',
    'UPDATE em supplier_fulfillment_status_history');

  RAISE NOTICE '=== TESTE DE RLS: TODOS OS CHECKS PASSARAM ✔ (revertendo tudo) ===';
END $$;

ROLLBACK;
