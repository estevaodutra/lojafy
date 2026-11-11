#!/usr/bin/env bash
set -euo pipefail

cd /root/supabase-lojafy
DC="docker compose"
$DC version >/dev/null 2>&1 || DC="docker-compose"

MIGRATION="/root/lojafy-deploy/migrations/20261111130000_product_primary_ads_and_kits.sql"
if [ ! -f "$MIGRATION" ]; then
  echo "Migração de anúncios principais não encontrada: $MIGRATION" >&2
  exit 1
fi

APPLIED=$($DC exec -T db psql -U postgres -d postgres -tAc \
  "SELECT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'create_primary_ad_for_product' AND tgrelid = 'public.products'::regclass)")

if [ "$APPLIED" = "t" ]; then
  echo "Migração de anúncios principais já aplicada"
else
  PARTIAL=$($DC exec -T db psql -U postgres -d postgres -tAc \
    "SELECT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = 'ml_listing_variants' AND column_name = 'is_primary')")
  if [ "$PARTIAL" = "t" ]; then
    echo "Migração parcialmente aplicada; revisão manual necessária" >&2
    exit 1
  fi

  echo "Aplicando migração de anúncios principais e kits"
  {
    printf 'BEGIN;\n'
    cat "$MIGRATION"
    printf '\nCOMMIT;\n'
  } | $DC exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1
fi

MISSING=$($DC exec -T db psql -U postgres -d postgres -tAc \
  "SELECT count(*) FROM public.products p WHERE NOT EXISTS (SELECT 1 FROM public.ml_listing_variants a WHERE a.product_id = p.id AND a.is_primary)")
echo "Produtos sem anúncio principal: $MISSING"
if [ "$MISSING" != "0" ]; then
  echo "Verificar produtos sem anúncio principal em ad_restructure_review" >&2
  exit 1
fi

$DC exec -T db psql -U postgres -d postgres -v ON_ERROR_STOP=1 \
  -c "NOTIFY pgrst, 'reload schema';"
$DC restart rest
echo "Anúncios principais aplicados e PostgREST recarregado"
