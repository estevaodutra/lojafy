import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from './useSupplierOrganization';
import { useSupplierPaginatedQuery } from './useSupplierPaginatedQuery';
import {
  transitionFulfillment,
  batchTransition,
  importTracking,
  type TrackingImportRow,
  type TransitionOptions,
} from '@/services/supplierFulfillmentService';
import { PRE_SHIPMENT_STATUSES, type FulfillmentStatus } from '@/constants/fulfillmentStatus';

export interface FulfillmentFilters {
  statuses?: FulfillmentStatus[];
  sla?: 'late' | 'due_today' | null;
  search?: string;
  page?: number;
  pageSize?: number;
}

export interface FulfillmentRow {
  id: string;
  order_id: string;
  status: FulfillmentStatus;
  label_status: string;
  carrier: string | null;
  tracking_code: string | null;
  sla_picking_deadline: string | null;
  sla_shipping_deadline: string | null;
  shipped_at: string | null;
  delivered_at: string | null;
  notes: string | null;
  created_at: string;
  orders: {
    order_number: string;
    status: string;
    payment_status: string | null;
    total_amount: number;
    shipping_address: unknown;
    user_id: string;
    created_at: string;
  } | null;
  supplier_fulfillment_items: {
    id: string;
    order_item_id: string;
    product_id: string | null;
    quantity: number;
    products: {
      name: string;
      sku: string | null;
      main_image_url: string | null;
      image_url: string | null;
    } | null;
  }[];
}

/** Lista paginada de fulfillments da org, com filtros server-side. */
export const useSupplierFulfillments = (filters: FulfillmentFilters = {}) => {
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;
  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 20;

  return useSupplierPaginatedQuery<FulfillmentRow>({
    queryKey: orgId
      ? supplierKeys.fulfillments(orgId, {
          statuses: filters.statuses ?? null,
          sla: filters.sla ?? null,
          search: filters.search ?? null,
          page,
          pageSize,
        })
      : ['supplier', 'fulfillments', 'pending'],
    page,
    pageSize,
    enabled: !!orgId,
    fetcher: async (from, to) => {
      let query = supabase
        .from('supplier_fulfillments')
        .select(
          `id, order_id, status, label_status, carrier, tracking_code,
           sla_picking_deadline, sla_shipping_deadline, shipped_at, delivered_at, notes, created_at,
           orders!inner ( order_number, status, payment_status, total_amount, shipping_address, user_id, created_at ),
           supplier_fulfillment_items ( id, order_item_id, product_id, quantity,
             products ( name, sku, main_image_url, image_url ) )`,
          { count: 'exact' },
        )
        .eq('supplier_organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range(from, to);

      if (filters.statuses && filters.statuses.length > 0) {
        query = query.in('status', filters.statuses);
      }
      if (filters.sla === 'late') {
        query = query
          .in('status', PRE_SHIPMENT_STATUSES)
          .lt('sla_shipping_deadline', new Date().toISOString());
      } else if (filters.sla === 'due_today') {
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        const end = new Date();
        end.setHours(23, 59, 59, 999);
        query = query
          .in('status', PRE_SHIPMENT_STATUSES)
          .gte('sla_shipping_deadline', start.toISOString())
          .lte('sla_shipping_deadline', end.toISOString());
      }
      if (filters.search) {
        query = query.ilike('orders.order_number', `%${filters.search}%`);
      }

      const { data, count, error } = await query;
      return { data: (data ?? []) as unknown as FulfillmentRow[], count, error };
    },
  });
};

/** Mutations de transição/lote/import de rastreio, com invalidation por org. */
export const useFulfillmentMutations = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const invalidate = () => {
    if (orgId) {
      queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
    }
  };

  const transition = useMutation({
    mutationFn: async ({
      fulfillmentId,
      toStatus,
      options,
    }: {
      fulfillmentId: string;
      toStatus: FulfillmentStatus;
      options?: TransitionOptions;
    }) => transitionFulfillment(fulfillmentId, toStatus, options),
    onSuccess: () => {
      invalidate();
      toast({ title: 'Status atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar status', description: error.message, variant: 'destructive' });
    },
  });

  const batch = useMutation({
    mutationFn: async ({ ids, toStatus }: { ids: string[]; toStatus: FulfillmentStatus }) =>
      batchTransition(ids, toStatus),
    onSuccess: (result) => {
      invalidate();
      if (result.failed.length > 0) {
        toast({
          title: `${result.ok.length} atualizados, ${result.failed.length} com erro`,
          description: result.failed[0]?.error,
          variant: 'destructive',
        });
      } else {
        toast({ title: `${result.ok.length} fulfillments atualizados` });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro no lote', description: error.message, variant: 'destructive' });
    },
  });

  const trackingImport = useMutation({
    mutationFn: async ({ rows, markAsShipped }: { rows: TrackingImportRow[]; markAsShipped: boolean }) => {
      if (!orgId) throw new Error('Organização não carregada');
      return importTracking(rows, orgId, markAsShipped);
    },
    onSuccess: (result) => {
      invalidate();
      toast({
        title: `${result.updated} rastreios aplicados${result.shipped ? `, ${result.shipped} enviados` : ''}`,
        description: result.errors.length > 0 ? `${result.errors.length} linhas com erro` : undefined,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' });
    },
  });

  return { transition, batch, trackingImport };
};
