import { supabase } from '@/integrations/supabase/client';
import { parseCsv, csvRowsToObjects } from '@/lib/csv';
import type { FulfillmentStatus } from '@/constants/fulfillmentStatus';
import type { Database } from '@/integrations/supabase/types';

export type SupplierFulfillment = Database['public']['Tables']['supplier_fulfillments']['Row'];

export interface TransitionOptions {
  trackingCode?: string;
  carrier?: string;
  notes?: string;
  labelStatus?: Database['public']['Tables']['supplier_fulfillments']['Row']['label_status'];
}

/**
 * Transiciona um fulfillment. A validação da transição acontece no banco
 * (validate_fulfillment_transition); erros voltam como mensagem do Postgres.
 */
export async function transitionFulfillment(
  fulfillmentId: string,
  toStatus: FulfillmentStatus,
  options: TransitionOptions = {},
): Promise<void> {
  const update: Record<string, unknown> = { status: toStatus };
  if (options.trackingCode !== undefined) update.tracking_code = options.trackingCode;
  if (options.carrier !== undefined) update.carrier = options.carrier;
  if (options.notes !== undefined) update.notes = options.notes;
  if (options.labelStatus !== undefined) update.label_status = options.labelStatus;

  const { error, data } = await supabase
    .from('supplier_fulfillments')
    .update(update)
    .eq('id', fulfillmentId)
    .select('id');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('Fulfillment não encontrado ou sem permissão para atualizar');
  }
}

/** Transição em lote (sequencial para preservar mensagens de erro por item). */
export async function batchTransition(
  fulfillmentIds: string[],
  toStatus: FulfillmentStatus,
): Promise<{ ok: string[]; failed: { id: string; error: string }[] }> {
  const ok: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const id of fulfillmentIds) {
    try {
      await transitionFulfillment(id, toStatus);
      ok.push(id);
    } catch (error) {
      failed.push({ id, error: error instanceof Error ? error.message : String(error) });
    }
  }
  return { ok, failed };
}

export async function updateLabelStatus(
  fulfillmentId: string,
  labelStatus: 'none' | 'pending' | 'generated' | 'printed' | 'error',
): Promise<void> {
  const { error } = await supabase
    .from('supplier_fulfillments')
    .update({ label_status: labelStatus })
    .eq('id', fulfillmentId);
  if (error) throw error;
}

export interface TrackingImportRow {
  orderNumber: string;
  trackingCode: string;
  carrier: string | null;
}

export interface TrackingImportResult {
  updated: number;
  shipped: number;
  errors: { orderNumber: string; error: string }[];
}

/** Cabeçalhos aceitos: pedido/order_number; rastreio/tracking/codigo_rastreio; transportadora/carrier. */
export function parseTrackingCsv(text: string): TrackingImportRow[] {
  const objects = csvRowsToObjects(parseCsv(text));
  return objects
    .map((row) => ({
      orderNumber: row.pedido || row.order_number || row.numero_pedido || '',
      trackingCode: row.rastreio || row.tracking || row.codigo_rastreio || row.tracking_code || '',
      carrier: row.transportadora || row.carrier || null,
    }))
    .filter((row) => row.orderNumber && row.trackingCode);
}

/**
 * Aplica rastreios em lote e opcionalmente confirma a postagem (shipped).
 * Resolve order_number → fulfillment da própria org (RLS limita o escopo).
 */
export async function importTracking(
  rows: TrackingImportRow[],
  organizationId: string,
  markAsShipped: boolean,
): Promise<TrackingImportResult> {
  const result: TrackingImportResult = { updated: 0, shipped: 0, errors: [] };

  for (const row of rows) {
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id')
      .eq('order_number', row.orderNumber)
      .maybeSingle();

    if (orderError || !order) {
      result.errors.push({ orderNumber: row.orderNumber, error: 'Pedido não encontrado' });
      continue;
    }

    const { data: fulfillment, error: fError } = await supabase
      .from('supplier_fulfillments')
      .select('id, status')
      .eq('order_id', order.id)
      .eq('supplier_organization_id', organizationId)
      .maybeSingle();

    if (fError || !fulfillment) {
      result.errors.push({ orderNumber: row.orderNumber, error: 'Fulfillment não encontrado' });
      continue;
    }

    try {
      if (markAsShipped && fulfillment.status === 'label_ready') {
        await transitionFulfillment(fulfillment.id, 'shipped', {
          trackingCode: row.trackingCode,
          carrier: row.carrier ?? undefined,
        });
        result.shipped += 1;
      } else {
        const { error } = await supabase
          .from('supplier_fulfillments')
          .update({ tracking_code: row.trackingCode, carrier: row.carrier })
          .eq('id', fulfillment.id);
        if (error) throw error;
      }
      result.updated += 1;
    } catch (error) {
      result.errors.push({
        orderNumber: row.orderNumber,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  return result;
}
