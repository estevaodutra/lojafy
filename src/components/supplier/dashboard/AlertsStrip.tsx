import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Clock, PackageX } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useSupplierDashboardMetrics } from '@/hooks/supplier/useSupplierDashboardMetrics';

/**
 * Faixa de alertas orientada a dados no header do portal fornecedor.
 * Mostra apenas o que exige ação agora; some quando está tudo em dia.
 */
export const AlertsStrip = () => {
  const navigate = useNavigate();
  const { data: metrics } = useSupplierDashboardMetrics();

  if (!metrics) return null;

  const alerts: { key: string; label: string; icon: React.ComponentType<{ className?: string }>; to: string; tone: 'destructive' | 'warning' }[] = [];

  if (metrics.late > 0) {
    alerts.push({
      key: 'late',
      label: `${metrics.late} pedido${metrics.late > 1 ? 's' : ''} atrasado${metrics.late > 1 ? 's' : ''}`,
      icon: Clock,
      to: '/supplier/pedidos?sla=late',
      tone: 'destructive',
    });
  }
  if (metrics.due_today > 0) {
    alerts.push({
      key: 'due_today',
      label: `${metrics.due_today} vence${metrics.due_today > 1 ? 'm' : ''} hoje`,
      icon: Clock,
      to: '/supplier/pedidos?sla=due_today',
      tone: 'warning',
    });
  }
  if (metrics.occurrences_open > 0) {
    alerts.push({
      key: 'occurrences',
      label: `${metrics.occurrences_open} ocorrência${metrics.occurrences_open > 1 ? 's' : ''} aberta${metrics.occurrences_open > 1 ? 's' : ''}`,
      icon: AlertTriangle,
      to: '/supplier/ocorrencias',
      tone: 'warning',
    });
  }
  if (metrics.critical_stock > 0) {
    alerts.push({
      key: 'stock',
      label: `${metrics.critical_stock} produto${metrics.critical_stock > 1 ? 's' : ''} com estoque crítico`,
      icon: PackageX,
      to: '/supplier/estoque?filtro=critico',
      tone: 'warning',
    });
  }

  if (alerts.length === 0) return null;

  return (
    <div className="flex items-center gap-2 overflow-x-auto">
      {alerts.map((alert) => (
        <Badge
          key={alert.key}
          variant={alert.tone === 'destructive' ? 'destructive' : 'outline'}
          className="cursor-pointer whitespace-nowrap gap-1"
          onClick={() => navigate(alert.to)}
        >
          <alert.icon className="h-3 w-3" />
          {alert.label}
        </Badge>
      ))}
    </div>
  );
};
