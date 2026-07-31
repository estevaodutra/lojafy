import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useSupplierFulfillments } from '@/hooks/supplier/useSupplierFulfillments';
import { OperationQueue } from '@/components/supplier/operations/OperationQueue';

/** Soma as quantidades por SKU de tudo que está aguardando/em separação. */
const PickingSummary = () => {
  const { data } = useSupplierFulfillments({
    statuses: ['awaiting_picking', 'picking'],
    pageSize: 100,
  });

  const bySku = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; quantity: number }>();
    (data?.rows ?? []).forEach((row) => {
      row.supplier_fulfillment_items.forEach((item) => {
        const sku = item.products?.sku ?? item.product_id ?? 'sem-sku';
        const existing = map.get(sku);
        if (existing) {
          existing.quantity += item.quantity;
        } else {
          map.set(sku, {
            name: item.products?.name ?? 'Produto removido',
            sku: item.products?.sku ?? '—',
            quantity: item.quantity,
          });
        }
      });
    });
    return [...map.values()].sort((a, b) => b.quantity - a.quantity);
  }, [data]);

  if (bySku.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Lista de separação por SKU</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap gap-2">
          {bySku.map((entry) => (
            <Badge key={entry.sku} variant="outline" className="gap-2 py-1">
              <span className="font-mono">{entry.sku}</span>
              <span className="max-w-[200px] truncate">{entry.name}</span>
              <span className="font-bold">×{entry.quantity}</span>
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

const SupplierPicking = () => (
  <div className="space-y-6">
    <PickingSummary />
    <OperationQueue
      title="Separação"
      description="Pedidos pagos aguardando separação dos itens"
      statuses={['awaiting_picking', 'picking']}
      primaryAction={{
        awaiting_picking: { label: 'Iniciar separação', to: 'picking' },
        picking: { label: 'Marcar separado', to: 'picked' },
      }}
      batchLabel="Avançar selecionados"
      emptyMessage="Nenhum pedido aguardando separação. 🎉"
    />
  </div>
);

export default SupplierPicking;
