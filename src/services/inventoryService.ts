import { supabase } from '@/integrations/supabase/client';
import { parseCsv, csvRowsToObjects, buildCsv, downloadCsv } from '@/lib/csv';
import type { Database } from '@/integrations/supabase/types';

export type InventoryMovement = Database['public']['Tables']['supplier_inventory_movements']['Row'];
export type StockOverviewRow = Database['public']['Views']['supplier_stock_overview']['Row'];

export type MovementType =
  | 'entry'
  | 'exit'
  | 'adjustment'
  | 'reservation'
  | 'reservation_release'
  | 'sale_deduction'
  | 'return_entry'
  | 'import_load'
  | 'correction';

export const MOVEMENT_TYPE_LABELS: Record<MovementType, string> = {
  entry: 'Entrada',
  exit: 'Saída',
  adjustment: 'Ajuste',
  reservation: 'Reserva',
  reservation_release: 'Liberação de reserva',
  sale_deduction: 'Baixa por venda',
  return_entry: 'Entrada por devolução',
  import_load: 'Carga por importação',
  correction: 'Correção',
};

interface ApplyMovementParams {
  productId: string;
  movementType: MovementType;
  quantity: number;
  reason?: string;
  locationId?: string;
  variantId?: string;
}

/** Único caminho de escrita de estoque do fornecedor (RPC transacional). */
export async function applyInventoryMovement(params: ApplyMovementParams): Promise<number> {
  const { data, error } = await supabase.rpc('apply_inventory_movement', {
    p_product_id: params.productId,
    p_movement_type: params.movementType,
    p_quantity: params.quantity,
    p_reason: params.reason,
    p_location_id: params.locationId,
    p_variant_id: params.variantId,
  });
  if (error) throw error;
  const result = data as { success: boolean; error?: string; new_quantity?: number };
  if (!result.success) throw new Error(result.error ?? 'Falha ao movimentar estoque');
  return result.new_quantity ?? 0;
}

export interface StockImportRow {
  sku: string;
  quantity: number;
}

/** Cabeçalhos aceitos: sku; quantidade/estoque/qty. */
export function parseStockCsv(text: string): StockImportRow[] {
  return csvRowsToObjects(parseCsv(text))
    .map((row) => ({
      sku: row.sku ?? '',
      quantity: parseInt(row.quantidade || row.estoque || row.qty || '', 10),
    }))
    .filter((row) => row.sku && Number.isFinite(row.quantity) && row.quantity >= 0);
}

export interface StockImportResult {
  applied: number;
  errors: { sku: string; error: string }[];
}

/** Aplica carga de estoque por SKU como movimentos 'import_load' (ajuste absoluto). */
export async function importStockCsv(
  rows: StockImportRow[],
  organizationId: string,
): Promise<StockImportResult> {
  const result: StockImportResult = { applied: 0, errors: [] };

  for (const row of rows) {
    const { data: product, error } = await supabase
      .from('products')
      .select('id, stock_quantity')
      .eq('sku', row.sku)
      .eq('supplier_organization_id', organizationId)
      .maybeSingle();

    if (error || !product) {
      result.errors.push({ sku: row.sku, error: 'SKU não encontrado' });
      continue;
    }

    const delta = row.quantity - (product.stock_quantity ?? 0);
    if (delta === 0) {
      result.applied += 1;
      continue;
    }

    try {
      await applyInventoryMovement({
        productId: product.id,
        movementType: 'correction',
        quantity: delta,
        reason: `Carga por planilha (novo total: ${row.quantity})`,
      });
      result.applied += 1;
    } catch (err) {
      result.errors.push({ sku: row.sku, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return result;
}

/** Exporta a visão de estoque atual em CSV. */
export function exportStockCsv(rows: StockOverviewRow[]): void {
  const csv = buildCsv(
    ['sku', 'produto', 'fisico', 'reservado', 'disponivel', 'estoque_minimo'],
    rows.map((row) => [
      row.sku,
      row.name,
      row.stock_quantity,
      row.reserved_quantity,
      row.available_quantity,
      row.min_stock_level,
    ]),
  );
  downloadCsv(`lojafy_estoque_${new Date().toISOString().slice(0, 10)}.csv`, csv);
}
