import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { OperationQueue } from '@/components/supplier/operations/OperationQueue';
import {
  FULFILLMENT_STATUS_CONFIG,
  type FulfillmentStatus,
} from '@/constants/fulfillmentStatus';

/**
 * Visão geral de pedidos (fulfillments) do fornecedor.
 * Escreve em supplier_fulfillments — o status do pedido é recalculado pelo
 * banco (recompute_order_status), o que corrige o update silencioso da
 * versão antiga que gravava direto em orders sem policy de UPDATE.
 */
const SupplierOrderManagement = () => {
  const [searchParams] = useSearchParams();
  const slaParam = searchParams.get('sla');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');

  const statuses: FulfillmentStatus[] | undefined =
    statusFilter === 'all' ? undefined : [statusFilter as FulfillmentStatus];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Pedidos</h1>
          <p className="text-muted-foreground">
            Todos os fulfillments da sua operação
            {slaParam === 'late' && ' — mostrando atrasados'}
            {slaParam === 'due_today' && ' — vencendo hoje'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Nº do pedido"
              className="w-44 pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os status</SelectItem>
              {Object.entries(FULFILLMENT_STATUS_CONFIG).map(([value, config]) => (
                <SelectItem key={value} value={value}>
                  {config.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <OperationQueue
        key={`${statusFilter}-${search}-${slaParam}`}
        title=""
        description=""
        statuses={statuses ?? (Object.keys(FULFILLMENT_STATUS_CONFIG) as FulfillmentStatus[])}
        primaryAction={{
          awaiting_picking: { label: 'Iniciar separação', to: 'picking' },
          picking: { label: 'Marcar separado', to: 'picked' },
          picked: { label: 'Embalar', to: 'packing' },
          packing: { label: 'Marcar embalado', to: 'packed' },
          shipped: { label: 'Em trânsito', to: 'in_transit' },
          in_transit: { label: 'Marcar entregue', to: 'delivered' },
        }}
        emptyMessage="Nenhum pedido encontrado."
        sla={slaParam === 'late' || slaParam === 'due_today' ? slaParam : null}
        search={search || undefined}
      />
    </div>
  );
};

export default SupplierOrderManagement;
