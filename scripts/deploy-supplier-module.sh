#!/usr/bin/env bash
# Aplica as migrations do módulo Fornecedor (P0+P1) em ordem e roda o teste de
# dinheiro (transacional, com ROLLBACK — não deixa dados no banco).
#
# Uso:
#   DATABASE_URL='postgresql://postgres:SENHA@HOST:5432/postgres' ./scripts/deploy-supplier-module.sh
#   ./scripts/deploy-supplier-module.sh --only-test      # só o teste de dinheiro
#   ./scripts/deploy-supplier-module.sh --skip-test      # só as migrations
#
# Na VPS (docker compose do Supabase self-hosted), o equivalente é:
#   docker compose exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 < arquivo.sql
set -euo pipefail

cd "$(dirname "$0")/.."

MIGRATIONS=(
  supabase/migrations/20260801100000_supplier_organizations.sql
  supabase/migrations/20260801100500_rls_hardening.sql
  supabase/migrations/20260801101000_supplier_fulfillments.sql
  supabase/migrations/20260801101500_frozen_order_financials.sql
  supabase/migrations/20260801102000_two_stage_products.sql
  supabase/migrations/20260801102500_supplier_inventory.sql
  supabase/migrations/20260801103000_supplier_occurrences.sql
  supabase/migrations/20260801103500_supplier_dashboard.sql
  supabase/migrations/20260801104000_storefront_view_swap.sql
)

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "ERRO: defina DATABASE_URL (ex.: postgresql://postgres:SENHA@HOST:5432/postgres)" >&2
  exit 1
fi

run_sql() {
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 --single-transaction -f "$1"
}

if [[ "${1:-}" != "--only-test" ]]; then
  echo "== Aplicando ${#MIGRATIONS[@]} migrations em ordem =="
  for m in "${MIGRATIONS[@]}"; do
    echo "-> $m"
    run_sql "$m"
  done
  echo "== Migrations aplicadas com sucesso =="
fi

if [[ "${1:-}" != "--skip-test" ]]; then
  echo "== Rodando teste de dinheiro (BEGIN...ROLLBACK) =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/money-test.sql
  echo "== Rodando teste de RLS (BEGIN...ROLLBACK) =="
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f scripts/rls-test.sql
  echo "== Testes concluídos =="
fi
