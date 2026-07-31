# Backup e restauração do catálogo do fornecedor

Depois da perda da VPS e do catálogo, este é o procedimento mínimo para nunca mais
depender de um único ponto de falha.

## Export pelo portal (fornecedor)

Em **Fornecedor → Meus Produtos → Exportar**:

- **Planilha (CSV)** — conferência e re-importação rápida (colunas compatíveis com a
  importação do Estágio 1).
- **Backup completo (JSON)** — todos os campos do catálogo da organização, incluindo
  specifications/attributes, estágio e status de aprovação. É o formato para restauração fiel.

O export roda no navegador com busca paginada (500 produtos por página) — não depende
de edge function.

## Restauração

1. **A partir do CSV**: use **Fornecedor → Importação** (recria os produtos no Estágio 1;
   o enriquecimento/aprovação precisa ser refeito).
2. **A partir do JSON**: restauração fiel exige acesso ao banco (INSERT direto na tabela
   `products`). Manter o JSON como fonte de verdade para um script de restauração pontual.

## Backup do banco (infraestrutura self-hosted)

O Supabase self-hosted **não faz backup sozinho**. Recomendação mínima na VPS:

```bash
# dump diário completo (agendar via cron)
pg_dump "$DATABASE_URL" --format=custom --file=/backups/lojafy_$(date +%F).dump

# reter 14 dias
find /backups -name 'lojafy_*.dump' -mtime +14 -delete
```

- Copie os dumps para fora da VPS (S3/Backblaze/rclone para qualquer storage externo).
- Teste a restauração periodicamente: `pg_restore --clean --if-exists -d "$DATABASE_URL" arquivo.dump`.
- Buckets de storage (imagens, etiquetas) também precisam de sincronização externa
  (`rclone sync` do diretório de storage do Supabase).

## O que o novo modelo já protege

- `supplier_audit_logs`, `supplier_inventory_movements` e
  `supplier_fulfillment_status_history` são insert-only — histórico não é sobrescrevível.
- Valores financeiros de pedidos ficam congelados em `order_items` no momento da compra —
  não dependem do catálogo vivo.
- `product_reference_imports` guarda snapshot before/after de cada enriquecimento —
  qualquer import pode ser revertido pelo portal.
