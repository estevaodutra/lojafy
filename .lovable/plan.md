

## ✅ Concluído: Simplificar tabela `product_marketplace_data` para formato JSONB

### O que foi feito

**Etapa 1 - Migração SQL:** Tabela recriada com estrutura simplificada (campo `data` JSONB + campos de controle). Views `v_products_with_marketplace` e `v_products_mercadolivre` criadas.

**Etapa 2 - Edge Function:** `lojafy-integra` reescrita para usar upsert com campo `data` JSONB. Endpoint bulk removido (substituído pelo upsert automático no POST).

**Etapa 3 - Documentação:** `apiEndpointsData.ts` atualizado com novos exemplos refletindo o formato JSONB.
