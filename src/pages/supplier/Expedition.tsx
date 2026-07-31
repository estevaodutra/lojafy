import { useState } from 'react';
import { Loader2, Send, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { OperationQueue } from '@/components/supplier/operations/OperationQueue';
import { TrackingImportDialog } from '@/components/supplier/operations/TrackingImportDialog';
import {
  useSupplierFulfillments,
  useFulfillmentMutations,
  type FulfillmentRow,
} from '@/hooks/supplier/useSupplierFulfillments';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FulfillmentStatusBadge } from '@/components/supplier/operations/FulfillmentStatusBadge';

/** Diálogo de confirmação de postagem: exige rastreio (regra do banco). */
const ShipDialog = ({
  fulfillment,
  onClose,
}: {
  fulfillment: FulfillmentRow | null;
  onClose: () => void;
}) => {
  const { data: orgData } = useSupplierOrganization();
  const { transition } = useFulfillmentMutations();
  const [tracking, setTracking] = useState('');
  const [carrier, setCarrier] = useState('');

  const handleShip = () => {
    transition.mutate(
      {
        fulfillmentId: fulfillment!.id,
        toStatus: 'shipped',
        options: {
          trackingCode: tracking.trim(),
          carrier: carrier.trim() || orgData?.settings?.default_carrier || undefined,
        },
      },
      { onSuccess: onClose },
    );
  };

  return (
    <Dialog open={!!fulfillment} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirmar postagem — #{fulfillment?.orders?.order_number}</DialogTitle>
          <DialogDescription>O código de rastreio é obrigatório.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="tracking">Código de rastreio</Label>
            <Input
              id="tracking"
              value={tracking}
              onChange={(e) => setTracking(e.target.value)}
              placeholder="BR123456789BR"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="carrier">Transportadora</Label>
            <Input
              id="carrier"
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder={orgData?.settings?.default_carrier ?? 'Ex.: Correios'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleShip} disabled={!tracking.trim() || transition.isPending}>
            {transition.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Confirmar envio
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

/** Fila de prontos para envio, com confirmação individual e import de rastreios. */
const ReadyToShipQueue = ({ onShip }: { onShip: (row: FulfillmentRow) => void }) => {
  const { data, isLoading } = useSupplierFulfillments({ statuses: ['label_ready'], pageSize: 50 });

  if (isLoading) return <Skeleton className="h-40 w-full" />;
  const rows = data?.rows ?? [];
  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-muted-foreground">
          Nenhum pedido pronto para envio. Gere as etiquetas na tela Etiquetas.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="pt-6 overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell className="font-mono text-sm">{row.tracking_code ?? '—'}</TableCell>
                <TableCell className="text-right">
                  <Button size="sm" onClick={() => onShip(row)}>
                    <Send className="mr-1 h-4 w-4" />
                    Confirmar postagem
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
};

const SupplierExpedition = () => {
  const [shipTarget, setShipTarget] = useState<FulfillmentRow | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Expedição</h1>
          <p className="text-muted-foreground">Confirme postagens e acompanhe envios em trânsito</p>
        </div>
        <Button variant="outline" onClick={() => setImportOpen(true)}>
          <Upload className="mr-2 h-4 w-4" />
          Importar rastreios (CSV)
        </Button>
      </div>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Prontos para envio</h2>
        <ReadyToShipQueue onShip={setShipTarget} />
      </section>

      <section className="space-y-2">
        <h2 className="text-lg font-semibold">Em trânsito</h2>
        <OperationQueue
          title=""
          description=""
          statuses={['shipped', 'in_transit']}
          primaryAction={{
            shipped: { label: 'Em trânsito', to: 'in_transit' },
            in_transit: { label: 'Marcar entregue', to: 'delivered' },
          }}
          emptyMessage="Nenhum envio em trânsito."
        />
      </section>

      <ShipDialog fulfillment={shipTarget} onClose={() => setShipTarget(null)} />
      <TrackingImportDialog isOpen={importOpen} onClose={() => setImportOpen(false)} />
    </div>
  );
};

export default SupplierExpedition;
