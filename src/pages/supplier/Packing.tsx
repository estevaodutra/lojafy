import { OperationQueue } from '@/components/supplier/operations/OperationQueue';

const SupplierPacking = () => (
  <OperationQueue
    title="Embalagem"
    description="Pedidos separados aguardando embalagem"
    statuses={['picked', 'packing']}
    primaryAction={{
      picked: { label: 'Iniciar embalagem', to: 'packing' },
      packing: { label: 'Marcar embalado', to: 'packed' },
    }}
    batchLabel="Avançar selecionados"
    emptyMessage="Nada para embalar agora."
  />
);

export default SupplierPacking;
