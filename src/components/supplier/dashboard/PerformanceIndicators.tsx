import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { SupplierDashboardMetrics } from '@/hooks/supplier/useSupplierDashboardMetrics';

export const PerformanceIndicators = ({ metrics }: { metrics: SupplierDashboardMetrics }) => (
  <Card>
    <CardHeader>
      <CardTitle className="text-base">Desempenho</CardTitle>
    </CardHeader>
    <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <div>
        <p className="text-sm text-muted-foreground">Enviados hoje</p>
        <p className="text-2xl font-bold">{metrics.shipped_today}</p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Tempo médio de separação (7d)</p>
        <p className="text-2xl font-bold">
          {metrics.avg_picking_hours_7d != null ? `${metrics.avg_picking_hours_7d}h` : '—'}
        </p>
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Atrasados</p>
        <p className={`text-2xl font-bold ${metrics.late > 0 ? 'text-destructive' : ''}`}>
          {metrics.late}
        </p>
      </div>
    </CardContent>
  </Card>
);
