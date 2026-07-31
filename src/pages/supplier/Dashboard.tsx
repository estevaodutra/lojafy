import {
  Hand,
  Inbox,
  PackageOpen,
  Tag,
  AlertTriangle,
  PackageX,
  Clock,
} from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { ActionCard } from '@/components/supplier/dashboard/ActionCard';
import { PerformanceIndicators } from '@/components/supplier/dashboard/PerformanceIndicators';
import { useSupplierDashboardMetrics } from '@/hooks/supplier/useSupplierDashboardMetrics';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';

const SupplierDashboard = () => {
  const { data: orgData, isLoading: orgLoading } = useSupplierOrganization();
  const { data: metrics, isLoading } = useSupplierDashboardMetrics();

  if (orgLoading || isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(8)].map((_, i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!orgData) {
    return (
      <p className="text-muted-foreground">
        Nenhuma organização de fornecedor encontrada para este usuário. Contate o suporte.
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard Operacional</h1>
        <p className="text-muted-foreground">O que precisa da sua ação agora</p>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <ActionCard
          title="Aguardando separação"
          value={metrics?.awaiting_picking}
          icon={Inbox}
          to="/supplier/separacao"
        />
        <ActionCard
          title="Em separação"
          value={metrics?.picking}
          icon={Hand}
          to="/supplier/separacao"
        />
        <ActionCard
          title="Em embalagem"
          value={metrics?.packing}
          icon={PackageOpen}
          to="/supplier/embalagem"
        />
        <ActionCard
          title="Etiquetas pendentes"
          value={metrics?.labels_pending}
          icon={Tag}
          to="/supplier/etiquetas"
        />
        <ActionCard
          title="Vencem hoje"
          value={metrics?.due_today}
          icon={Clock}
          to="/supplier/pedidos?sla=due_today"
          tone={metrics && metrics.due_today > 0 ? 'warning' : 'default'}
        />
        <ActionCard
          title="Atrasados"
          value={metrics?.late}
          icon={Clock}
          to="/supplier/pedidos?sla=late"
          tone={metrics && metrics.late > 0 ? 'destructive' : 'default'}
        />
        <ActionCard
          title="Ocorrências abertas"
          value={metrics?.occurrences_open}
          icon={AlertTriangle}
          to="/supplier/ocorrencias"
          tone={metrics && metrics.occurrences_open > 0 ? 'warning' : 'default'}
        />
        <ActionCard
          title="Estoque crítico"
          value={metrics?.critical_stock}
          icon={PackageX}
          to="/supplier/estoque?filtro=critico"
          tone={metrics && metrics.critical_stock > 0 ? 'warning' : 'default'}
        />
      </div>

      {metrics && <PerformanceIndicators metrics={metrics} />}
    </div>
  );
};

export default SupplierDashboard;
