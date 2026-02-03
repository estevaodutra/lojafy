import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { CodeBlock } from '@/components/admin/CodeBlock';
import { useApiLogs, LogSource, LogEventType, LogPeriod, LogStatus } from '@/hooks/useApiLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { RefreshCw, ScrollText, AlertCircle, CheckCircle2, ArrowDownLeft, ArrowUpRight, Clock, Activity, TrendingUp, Eye } from 'lucide-react';
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

interface LogData {
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
}

interface LogRowProps {
  log: LogData;
  onViewDetails: (log: LogData) => void;
}

const LogRow: React.FC<LogRowProps> = ({ log, onViewDetails }) => {
  const formattedDate = format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR });

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="w-[15%] font-mono text-xs text-muted-foreground">
        {formattedDate}
      </TableCell>
      <TableCell className="w-[12%]">
        {getSourceBadge(log.source)}
      </TableCell>
      <TableCell className="w-[33%]">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="font-mono text-xs w-fit truncate max-w-full">
            {log.source === 'api_request' ? log.function_name : log.event_type}
          </Badge>
          {log.method && (
            <span className="text-xs text-muted-foreground">{log.method}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[15%]">
        {getStatusBadge(log.status_code)}
      </TableCell>
      <TableCell className="w-[15%] text-xs text-muted-foreground font-mono">
        {log.duration_ms !== undefined && log.duration_ms !== null ? `${log.duration_ms}ms` : '-'}
      </TableCell>
      <TableCell className="w-[10%] text-right">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => onViewDetails(log)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export const ApiLogsSection: React.FC = () => {
  const [source, setSource] = useState<LogSource>('all');
  const [eventType, setEventType] = useState<LogEventType>('all');
  const [period, setPeriod] = useState<LogPeriod>('7d');
  const [status, setStatus] = useState<LogStatus>('all');
  const [selectedLog, setSelectedLog] = useState<LogData | null>(null);

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
            Clique no ícone de olho para ver os detalhes do payload e resposta
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
            <Table className="table-fixed w-full">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[15%]">Data/Hora</TableHead>
                  <TableHead className="w-[12%]">Origem</TableHead>
                  <TableHead className="w-[33%]">Evento/Função</TableHead>
                  <TableHead className="w-[15%]">Status</TableHead>
                  <TableHead className="w-[15%]">Duração</TableHead>
                  <TableHead className="w-[10%]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((log) => (
                  <LogRow key={log.id} log={log} onViewDetails={setSelectedLog} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>

        {/* Pagination inline */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Página {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Log</SheetTitle>
            <SheetDescription>
              {selectedLog?.source === 'webhook' ? 'Webhook enviado' : 'Requisição de API recebida'}
            </SheetDescription>
          </SheetHeader>
          
          {selectedLog && (
            <div className="mt-6 space-y-4">
              {/* Timestamp and Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">
                  {format(new Date(selectedLog.timestamp), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                </span>
                {getStatusBadge(selectedLog.status_code)}
              </div>

              {/* Duration */}
              {selectedLog.duration_ms !== undefined && selectedLog.duration_ms !== null && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">Duração</p>
                  <p className="font-mono text-sm">{selectedLog.duration_ms}ms</p>
                </div>
              )}

              {/* Webhook URL */}
              {selectedLog.webhook_url && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-1">URL de Destino</p>
                  <p className="font-mono text-xs break-all bg-muted p-2 rounded">{selectedLog.webhook_url}</p>
                </div>
              )}
              
              {/* Payload */}
              {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Payload Enviado</p>
                  <ScrollArea className="max-h-60">
                    <CodeBlock 
                      code={JSON.stringify(selectedLog.payload, null, 2)} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}

              {/* Query Params */}
              {selectedLog.query_params && Object.keys(selectedLog.query_params).length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Query Parameters</p>
                  <ScrollArea className="max-h-40">
                    <CodeBlock 
                      code={JSON.stringify(selectedLog.query_params, null, 2)} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}
              
              {/* Response */}
              {selectedLog.response_body && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground mb-2">Resposta</p>
                  <ScrollArea className="max-h-40">
                    <CodeBlock 
                      code={selectedLog.response_body} 
                      language="json"
                      className="text-xs"
                    />
                  </ScrollArea>
                </div>
              )}
              
              {/* Error */}
              {selectedLog.error_message && (
                <div>
                  <p className="text-xs font-medium text-destructive mb-1">Mensagem de Erro</p>
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {selectedLog.error_message}
                  </p>
                </div>
              )}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Retention Notice */}
      <p className="text-xs text-muted-foreground text-center">
        ⏰ Logs são retidos por 7 dias e excluídos automaticamente após esse período.
      </p>
    </div>
  );
};
