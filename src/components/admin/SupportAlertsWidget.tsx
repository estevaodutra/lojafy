import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertCircle, Clock, MessageSquare, CheckCircle, ArrowRight } from 'lucide-react';
import { useSupportAlerts } from '@/hooks/useSupportAlerts';
import { Skeleton } from '@/components/ui/skeleton';
import { Link } from 'react-router-dom';

export const SupportAlertsWidget = () => {
  const { data, isLoading } = useSupportAlerts();

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Alertas de Suporte</CardTitle>
          <CardDescription>Monitoramento de tickets e atendimento</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </CardContent>
      </Card>
    );
  }

  const hasAlerts = (data?.criticalTickets || 0) > 0 || (data?.urgentTickets || 0) > 0;

  return (
    <Card className={hasAlerts ? 'border-destructive/50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              {hasAlerts && <AlertCircle className="h-5 w-5 text-destructive" />}
              Alertas de Suporte
            </CardTitle>
            <CardDescription>Monitoramento de tickets e atendimento</CardDescription>
          </div>
          <Button asChild size="sm" variant="outline">
            <Link to="/super-admin/chat-support">
              Ver Todos <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Tickets Críticos */}
        {(data?.criticalTickets || 0) > 0 && (
          <div className="flex items-center justify-between p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-destructive" />
              <div>
                <p className="font-semibold text-sm">Tickets Críticos</p>
                <p className="text-xs text-muted-foreground">Aguardando há mais de 2 dias</p>
              </div>
            </div>
            <Badge variant="destructive" className="text-lg px-3 py-1">
              {data.criticalTickets}
            </Badge>
          </div>
        )}

        {/* Tickets Urgentes */}
        {(data?.urgentTickets || 0) > 0 && (
          <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
            <div className="flex items-center gap-3">
              <Clock className="h-5 w-5 text-yellow-600 dark:text-yellow-500" />
              <div>
                <p className="font-semibold text-sm">Tickets Urgentes</p>
                <p className="text-xs text-muted-foreground">Aguardando há 1-2 dias</p>
              </div>
            </div>
            <Badge variant="outline" className="bg-yellow-100 dark:bg-yellow-950 text-yellow-700 dark:text-yellow-400 border-yellow-300 dark:border-yellow-700 text-lg px-3 py-1">
              {data.urgentTickets}
            </Badge>
          </div>
        )}

        {/* Métricas Gerais */}
        <div className="grid grid-cols-3 gap-4 pt-2">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{data?.pendingQuestions || 0}</p>
            <p className="text-xs text-muted-foreground">Perguntas Pendentes</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <Clock className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{data?.avgResponseTime || 0}m</p>
            <p className="text-xs text-muted-foreground">Tempo Médio</p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </div>
            <p className="text-2xl font-bold">{data?.aiResolutionRate || 0}%</p>
            <p className="text-xs text-muted-foreground">Taxa IA</p>
          </div>
        </div>

        {!hasAlerts && (
          <div className="text-center py-4 text-muted-foreground">
            <CheckCircle className="h-8 w-8 mx-auto mb-2 text-green-500" />
            <p className="text-sm font-medium">Tudo em Ordem!</p>
            <p className="text-xs">Nenhum ticket crítico ou urgente</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
