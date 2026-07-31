import { useState } from 'react';
import { Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { ShippingLabelUpload, type ShippingLabelData } from '@/components/orders/ShippingLabelUpload';
import { FulfillmentStatusBadge } from '@/components/supplier/operations/FulfillmentStatusBadge';
import {
  useSupplierFulfillments,
  useFulfillmentMutations,
  type FulfillmentRow,
} from '@/hooks/supplier/useSupplierFulfillments';

const LABEL_STATUS_LABELS: Record<string, string> = {
  none: 'Sem etiqueta',
  pending: 'Pendente',
  generated: 'Gerada',
  printed: 'Impressa',
  error: 'Erro',
};

/** Anexa uma etiqueta (upload no bucket shipping-labels + extração de rastreio). */
const LabelDialog = ({
  fulfillment,
  onClose,
}: {
  fulfillment: FulfillmentRow | null;
  onClose: () => void;
}) => {
  const { transition } = useFulfillmentMutations();

  const handleProcessed = (data: ShippingLabelData | null) => {
    if (!data || !fulfillment) return;
    transition.mutate(
      {
        fulfillmentId: fulfillment.id,
        toStatus: 'label_ready',
        options: {
          trackingCode: data.trackingCode ?? undefined,
          labelStatus: 'generated',
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!fulfillment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Etiqueta — Pedido #{fulfillment?.orders?.order_number}</DialogTitle>
          <DialogDescription>
            Envie o PDF/imagem da etiqueta; o código de rastreio é extraído automaticamente.
          </DialogDescription>
        </DialogHeader>
        <ShippingLabelUpload onLabelProcessed={handleProcessed} />
      </DialogContent>
    </Dialog>
  );
};

const SupplierLabels = () => {
  const [labelTarget, setLabelTarget] = useState<FulfillmentRow | null>(null);
  const { data, isLoading } = useSupplierFulfillments({
    statuses: ['packed', 'label_ready'],
    pageSize: 50,
  });
  const { transition } = useFulfillmentMutations();

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Etiquetas</h1>
        <p className="text-muted-foreground">
          Pedidos embalados aguardando etiqueta de envio
        </p>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhum pedido aguardando etiqueta.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Pedido</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Etiqueta</TableHead>
                    <TableHead>Rastreio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="font-medium">#{row.orders?.order_number}</TableCell>
                      <TableCell>
                        <FulfillmentStatusBadge status={row.status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={row.label_status === 'error' ? 'destructive' : 'outline'}>
                          {LABEL_STATUS_LABELS[row.label_status] ?? row.label_status}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{row.tracking_code ?? '—'}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button size="sm" variant="outline" onClick={() => setLabelTarget(row)}>
                            <Tag className="mr-1 h-4 w-4" />
                            {row.status === 'packed' ? 'Anexar etiqueta' : 'Reanexar'}
                          </Button>
                          {row.status === 'label_ready' && row.label_status === 'generated' && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                transition.mutate({
                                  fulfillmentId: row.id,
                                  toStatus: 'label_ready',
                                  options: { labelStatus: 'printed' },
                                })
                              }
                            >
                              Marcar impressa
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <LabelDialog fulfillment={labelTarget} onClose={() => setLabelTarget(null)} />
    </div>
  );
};

export default SupplierLabels;
