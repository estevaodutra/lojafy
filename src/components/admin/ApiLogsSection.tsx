import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { CodeBlock } from '@/components/admin/CodeBlock';
import { useApiLogs, LogSource, LogEventType, LogPeriod, LogStatus } from '@/hooks/useApiLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ChevronDown, ChevronRight, ScrollText, AlertCircle, CheckCircle2, ArrowDownLeft, ArrowUpRight, Clock, Activity, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

const sourceOptions: { value: LogSource; label: string }[] = [
  { value: 'all', label: 'Todas as origens' },
  { value: 'api_request', label: '📥 Requisições de API' },
  { value: 'webhook', label: '📤 Webhooks Enviados' },
];

const eventTypeOptions: { value: LogEventType; label: string }[] = [
  { value: 'all', label: 'Todos os eventos' },
  { value: 'api.request', label: 'Requisições API' },
  { value: 'order.paid', label: 'order.paid' },
  { value: 'user.created', label: 'user.created' },
  { value: 'user.inactive.7d', label: 'user.inactive.7d' },
  { value: 'user.inactive.15d', label: 'user.inactive.15d' },
  { value: 'user.inactive.30d', label: 'user.inactive.30d' },
];

const periodOptions: { value: LogPeriod; label: string }[] = [
  { value: '24h', label: 'Últimas 24h' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'all', label: 'Todo o período' },
];

const statusOptions: { value: LogStatus; label: string }[] = [
  { value: 'all', label: 'Todos' },
  { value: 'success', label: 'Sucesso (2xx)' },
  { value: 'error', label: 'Erro (4xx/5xx)' },
];

const getStatusBadge = (statusCode: number | null) => {
  if (statusCode === null) {
    return (
      <Badge variant="destructive" className="gap-1">
        <AlertCircle className="h-3 w-3" />
        Erro
      </Badge>
    );
  }
  
  if (statusCode >= 200 && statusCode < 300) {
    return (
      <Badge variant="secondary" className="gap-1 bg-secondary text-secondary-foreground">
        <CheckCircle2 className="h-3 w-3" />
        {statusCode}
      </Badge>
    );
  }
  
  return (
    <Badge variant="destructive" className="gap-1">
      <AlertCircle className="h-3 w-3" />
      {statusCode}
    </Badge>
  );
};

const getSourceBadge = (source: 'webhook' | 'api_request') => {
  if (source === 'webhook') {
    return (
      <Badge variant="outline" className="gap-1">
        <ArrowUpRight className="h-3 w-3" />
        OUT
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <ArrowDownLeft className="h-3 w-3" />
      IN
    </Badge>
  );
};

interface LogRowProps {
  log: {
    id: string;
    source: 'webhook' | 'api_request';
    event_type: string;
    function_name?: string;
    method?: string;
    payload?: Record<string, unknown>;
    query_params?: Record<string, unknown>;
    status_code: number | null;
    response_body?: string | null;
    error_message: string | null;
    duration_ms?: number | null;
    timestamp: string;
    webhook_url?: string | null;
  };
}

const LogRow: React.FC<LogRowProps> = ({ log }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  const formattedDate = format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR });

  return (
    <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
      <TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
        <TableCell className="font-mono text-xs text-muted-foreground">
          {formattedDate}
        </TableCell>
        <TableCell>
          {getSourceBadge(log.source)}
        </TableCell>
        <TableCell>
          <div className="flex flex-col gap-1">
            <Badge variant="outline" className="font-mono text-xs w-fit">
              {log.source === 'api_request' ? log.function_name : log.event_type}
            </Badge>
            {log.method && (
              <span className="text-xs text-muted-foreground">{log.method}</span>
            )}
          </div>
        </TableCell>
        <TableCell>
          {getStatusBadge(log.status_code)}
        </TableCell>
        <TableCell className="text-xs text-muted-foreground font-mono">
          {log.duration_ms !== undefined && log.duration_ms !== null ? `${log.duration_ms}ms` : '-'}
        </TableCell>
        <TableCell className="text-right">
          <CollapsibleTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          </CollapsibleTrigger>
        </TableCell>
      </TableRow>
      
      <CollapsibleContent asChild>
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell colSpan={6} className="p-0">
            <div className="p-4 space-y-4">
              {log.webhook_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">URL de Destino</p>
                  <p className="font-mono text-xs break-all">{log.webhook_url}</p>
                </div>
              )}
              
              {log.payload && Object.keys(log.payload).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Payload Enviado</p>
                  <ScrollArea className="max-h-60">
                    <CodeBlock 
                      code={JSON.stringify(log.payload, null, 2)} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}

              {log.query_params && Object.keys(log.query_params).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Query Parameters</p>
                  <ScrollArea className="max-h-40">
                    <CodeBlock 
                      code={JSON.stringify(log.query_params, null, 2)} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}
              
              {log.response_body && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Resposta</p>
                  <ScrollArea className="max-h-40">
                    <CodeBlock 
                      code={log.response_body} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}
              
              {log.error_message && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Mensagem de Erro</p>
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {log.error_message}
                  </p>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      </CollapsibleContent>
    </Collapsible>
  );
};

export const ApiLogsSection: React.FC = () => {
  const [source, setSource] = useState<LogSource>('all');
  const [eventType, setEventType] = useState<LogEventType>('all');
  const [period, setPeriod] = useState<LogPeriod>('7d');
  const [status, setStatus] = useState<LogStatus>('all');

  const { logs, isLoading, refetch, page, setPage, totalPages, totalCount, metrics } = useApiLogs({
    source,
    eventType,
    period,
    status,
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2 flex items-center gap-2">
          <ScrollText className="h-6 w-6" />
          Logs de API
        </h2>
        <p className="text-muted-foreground">
          Visualize requisições de API recebidas e webhooks enviados com seus respectivos payloads e respostas.
        </p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total de Logs</p>
                <p className="text-2xl font-bold">{metrics.totalRequests}</p>
              </div>
              <Activity className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Taxa de Sucesso</p>
                <p className="text-2xl font-bold text-primary">{metrics.successRate.toFixed(1)}%</p>
              </div>
              <TrendingUp className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-bold">{metrics.avgDuration}ms</p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4 items-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Origem</label>
              <Select value={source} onValueChange={(v) => { setSource(v as LogSource); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {sourceOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Evento</label>
              <Select value={eventType} onValueChange={(v) => { setEventType(v as LogEventType); setPage(1); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {eventTypeOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Período</label>
              <Select value={period} onValueChange={(v) => { setPeriod(v as LogPeriod); setPage(1); }}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {periodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Status</label>
              <Select value={status} onValueChange={(v) => { setStatus(v as LogStatus); setPage(1); }}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {statusOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              disabled={isLoading}
              className="gap-2"
            >
              <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
              Atualizar
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Logs Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Histórico de Eventos</CardTitle>
            <Badge variant="secondary">{totalCount} registros</Badge>
          </div>
          <CardDescription>
            Clique em uma linha para ver os detalhes do payload e resposta
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <ScrollText className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>Nenhum log encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[140px]">Data/Hora</TableHead>
                  <TableHead className="w-[80px]">Origem</TableHead>
                  <TableHead>Evento/Função</TableHead>
                  <TableHead className="w-[100px]">Status</TableHead>
                  <TableHead className="w-[80px]">Duração</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground">
            Página {page} de {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(page + 1)}
            disabled={page === totalPages}
          >
            Próxima
          </Button>
        </div>
      )}

      {/* Retention Notice */}
      <p className="text-xs text-muted-foreground text-center">
        ⏰ Logs são retidos por 7 dias e excluídos automaticamente após esse período.
      </p>
    </div>
  );
};
