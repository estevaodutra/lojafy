import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { FulfillmentStatusBadge } from './FulfillmentStatusBadge';
import { getFulfillmentStatusConfig } from '@/constants/fulfillmentStatus';
import type { FulfillmentRow } from '@/hooks/supplier/useSupplierFulfillments';

interface FulfillmentDetailsDrawerProps {
  fulfillment: FulfillmentRow | null;
  onClose: () => void;
}

interface ShippingAddress {
  street?: string;
  number?: string;
  complement?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  zip_code?: string;
}

export const FulfillmentDetailsDrawer = ({ fulfillment, onClose }: FulfillmentDetailsDrawerProps) => {
  const { data: history, isLoading: historyLoading } = useQuery({
    queryKey: ['supplier', 'fulfillment-history', fulfillment?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_fulfillment_status_history')
        .select('id, from_status, to_status, notes, created_at')
        .eq('fulfillment_id', fulfillment!.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!fulfillment,
  });

  const address = (fulfillment?.orders?.shipping_address ?? null) as ShippingAddress | null;

  return (
    <Sheet open={!!fulfillment} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {fulfillment && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                Pedido #{fulfillment.orders?.order_number}
                <FulfillmentStatusBadge status={fulfillment.status} />
              </SheetTitle>
              <SheetDescription>
                Criado em{' '}
                {format(new Date(fulfillment.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
              </SheetDescription>
            </SheetHeader>

            <div className="mt-6 space-y-6">
              <section>
                <h3 className="font-semibold mb-2">Itens</h3>
                <div className="space-y-2">
                  {fulfillment.supplier_fulfillment_items.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 rounded-md border p-2">
                      {(item.products?.main_image_url || item.products?.image_url) && (
                        <img
                          src={item.products.main_image_url || item.products.image_url || ''}
                          alt=""
                          className="h-10 w-10 rounded object-cover"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {item.products?.name ?? 'Produto removido'}
                        </p>
                        {item.products?.sku && (
                          <p className="text-xs text-muted-foreground">SKU: {item.products.sku}</p>
                        )}
                      </div>
                      <span className="text-sm font-medium">×{item.quantity}</span>
                    </div>
                  ))}
                </div>
              </section>

              <Separator />

              <section className="grid grid-cols-2 gap-3 text-sm">
                <div>
                  <p className="text-muted-foreground">SLA de separação</p>
                  <p>
                    {fulfillment.sla_picking_deadline
                      ? format(new Date(fulfillment.sla_picking_deadline), 'dd/MM HH:mm')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">SLA de envio</p>
                  <p>
                    {fulfillment.sla_shipping_deadline
                      ? format(new Date(fulfillment.sla_shipping_deadline), 'dd/MM HH:mm')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Transportadora</p>
                  <p>{fulfillment.carrier ?? '—'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Rastreio</p>
                  <p className="break-all">{fulfillment.tracking_code ?? '—'}</p>
                </div>
              </section>

              {address && (
                <>
                  <Separator />
                  <section className="text-sm">
                    <h3 className="font-semibold mb-2">Endereço de entrega</h3>
                    <p>
                      {address.street}, {address.number}
                      {address.complement ? ` — ${address.complement}` : ''}
                    </p>
                    <p>
                      {address.neighborhood} — {address.city}/{address.state}
                    </p>
                    <p>CEP: {address.zip_code}</p>
                  </section>
                </>
              )}

              <Separator />

              <section>
                <h3 className="font-semibold mb-2">Histórico</h3>
                {historyLoading ? (
                  <Skeleton className="h-20 w-full" />
                ) : (
                  <div className="space-y-2">
                    {(history ?? []).map((entry) => (
                      <div key={entry.id} className="flex items-center justify-between text-sm">
                        <span>
                          {entry.from_status
                            ? `${getFulfillmentStatusConfig(entry.from_status).label} → `
                            : ''}
                          {getFulfillmentStatusConfig(entry.to_status).label}
                        </span>
                        <span className="text-muted-foreground">
                          {format(new Date(entry.created_at), 'dd/MM HH:mm')}
                        </span>
                      </div>
                    ))}
                    {(history ?? []).length === 0 && (
                      <p className="text-sm text-muted-foreground">Sem histórico.</p>
                    )}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};
