import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useApiLogs, LogSource, LogPeriod, LogStatus } from '@/hooks/useApiLogs';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  RefreshCw, ScrollText, AlertCircle, CheckCircle2, 
  ArrowDownLeft, ArrowUpRight, Clock, Activity, 
  TrendingUp, Eye, Search, Copy, Check, Terminal, 
  User, Key, Wifi, Play, Pause, Database, Globe
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface UnifiedLog {
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
  path?: string | null;
  ip_address?: string | null;
  user_id?: string | null;
}

const methodOptions = [
  { value: 'all', label: 'Todos os Métodos' },
  { value: 'GET', label: 'GET' },
  { value: 'POST', label: 'POST' },
  { value: 'PUT', label: 'PUT' },
  { value: 'DELETE', label: 'DELETE' },
];

const sourceOptions: { value: LogSource; label: string }[] = [
  { value: 'all', label: 'Todas as Origens' },
  { value: 'api_request', label: '📥 API Inbound' },
  { value: 'webhook', label: '📤 Webhook Outbound' },
];

const periodOptions: { value: LogPeriod; label: string }[] = [
  { value: '24h', label: 'Últimas 24 horas' },
  { value: '7d', label: 'Últimos 7 dias' },
  { value: 'all', label: 'Todo o período' },
];

const statusOptions: { value: LogStatus; label: string }[] = [
  { value: 'all', label: 'Todos os Status' },
  { value: 'success', label: 'Sucesso (2xx)' },
  { value: 'error', label: 'Erro (4xx/5xx)' },
];

export const SystemLogs: React.FC = () => {
  const [source, setSource] = useState<LogSource>('all');
  const [period, setPeriod] = useState<LogPeriod>('7d');
  const [status, setStatus] = useState<LogStatus>('all');
  const [method, setMethod] = useState<string>('all');
  const [search, setSearch] = useState<string>('');
  const [debouncedSearch, setDebouncedSearch] = useState<string>('');
  const [selectedLog, setSelectedLog] = useState<UnifiedLog | null>(null);
  
  // Auto refresh
  const [autoRefreshInterval, setAutoRefreshInterval] = useState<number>(0); // 0 = disabled

  // Copy helper
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Debounce search input
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(search);
    }, 400);

    return () => clearTimeout(handler);
  }, [search]);

  const { logs, isLoading, refetch, page, setPage, totalPages, totalCount, metrics } = useApiLogs({
    source,
    period,
    status,
    method,
    search: debouncedSearch,
  });

  // Polling implementation
  useEffect(() => {
    if (autoRefreshInterval <= 0) return;

    const interval = setInterval(() => {
      refetch();
    }, autoRefreshInterval);

    return () => clearInterval(interval);
  }, [autoRefreshInterval, refetch]);

  const handleCopy = (text: string, type: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(type);
    toast.success('Copiado para a área de transferência!');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getMethodBadge = (methodString?: string) => {
    if (!methodString) return null;
    const m = methodString.toUpperCase();
    switch (m) {
      case 'GET':
        return <Badge className="bg-sky-500/10 text-sky-500 border border-sky-500/20 font-mono font-bold text-xs px-2.5 py-0.5">GET</Badge>;
      case 'POST':
        return <Badge className="bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 font-mono font-bold text-xs px-2.5 py-0.5">POST</Badge>;
      case 'PUT':
        return <Badge className="bg-amber-500/10 text-amber-500 border border-amber-500/20 font-mono font-bold text-xs px-2.5 py-0.5">PUT</Badge>;
      case 'DELETE':
        return <Badge className="bg-rose-500/10 text-rose-500 border border-rose-500/20 font-mono font-bold text-xs px-2.5 py-0.5">DELETE</Badge>;
      default:
        return <Badge className="bg-purple-500/10 text-purple-500 border border-purple-500/20 font-mono font-bold text-xs px-2.5 py-0.5">{m}</Badge>;
    }
  };

  const getStatusBadge = (statusCode: number | null) => {
    if (statusCode === null) {
      return (
        <Badge variant="destructive" className="gap-1 border border-destructive/20 bg-destructive/10 text-destructive-foreground">
          <AlertCircle className="h-3 w-3" />
          N/A
        </Badge>
      );
    }
    
    if (statusCode >= 200 && statusCode < 300) {
      return (
        <Badge className="gap-1 bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
          {statusCode}
        </Badge>
      );
    }

    if (statusCode >= 300 && statusCode < 400) {
      return (
        <Badge className="gap-1 bg-blue-500/10 text-blue-600 border border-blue-500/20">
          <Globe className="h-3 w-3 text-blue-500" />
          {statusCode}
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="gap-1 border border-rose-500/20 bg-rose-500/10 text-rose-600 hover:bg-rose-500/20">
        <AlertCircle className="h-3 w-3 text-rose-500" />
        {statusCode}
      </Badge>
    );
  };

  const getSourceBadge = (logSource: 'webhook' | 'api_request') => {
    if (logSource === 'webhook') {
      return (
        <Badge variant="outline" className="gap-1 border-purple-500/30 text-purple-600 bg-purple-500/5 hover:bg-purple-500/10">
          <ArrowUpRight className="h-3.5 w-3.5" />
          Outbound
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="gap-1 border-blue-500/30 text-blue-600 bg-blue-500/5 hover:bg-blue-500/10">
        <ArrowDownLeft className="h-3.5 w-3.5" />
        Inbound
      </Badge>
    );
  };

  const getDurationBadge = (duration: number | null | undefined) => {
    if (duration === undefined || duration === null) return '-';
    
    let colorClass = "text-emerald-500";
    if (duration > 800) {
      colorClass = "text-rose-500 font-bold";
    } else if (duration > 350) {
      colorClass = "text-amber-500 font-medium";
    }

    return (
      <span className={cn("font-mono text-xs flex items-center gap-1", colorClass)}>
        <Clock className="h-3.5 w-3.5 opacity-70" />
        {duration}ms
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-full overflow-x-hidden pb-12">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-5">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2.5">
            <span className="p-2 bg-primary/10 text-primary rounded-xl">
              <Terminal className="h-7 w-7" />
            </span>
            Logs de Requisições & API
          </h1>
          <p className="text-muted-foreground mt-2 text-sm md:text-base">
            Monitore requisições HTTP GET, POST e eventos de webhook em tempo real com inspeção de payload.
          </p>
        </div>

        {/* Polling and refresh actions */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-muted/60 border rounded-lg p-1 text-xs gap-1.5 shadow-sm">
            <span className="px-2 py-1 text-muted-foreground flex items-center gap-1">
              {autoRefreshInterval > 0 ? (
                <span className="flex h-2 w-2 relative">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                </span>
              ) : (
                <span className="h-2 w-2 rounded-full bg-zinc-400"></span>
              )}
              Auto-atualizar:
            </span>
            <button
              onClick={() => setAutoRefreshInterval(0)}
              className={cn("px-2.5 py-1 rounded-md transition-all font-medium", autoRefreshInterval === 0 ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              Off
            </button>
            <button
              onClick={() => setAutoRefreshInterval(10000)}
              className={cn("px-2.5 py-1 rounded-md transition-all font-medium", autoRefreshInterval === 10000 ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              10s
            </button>
            <button
              onClick={() => setAutoRefreshInterval(30000)}
              className={cn("px-2.5 py-1 rounded-md transition-all font-medium", autoRefreshInterval === 30000 ? "bg-background text-foreground shadow" : "text-muted-foreground hover:text-foreground")}
            >
              30s
            </button>
          </div>

          <Button 
            variant="outline" 
            onClick={() => { refetch(); toast.success('Logs updated!'); }}
            disabled={isLoading}
            className="shadow-sm border hover:bg-muted"
          >
            <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
            Atualizar
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="shadow-sm border border-muted/70 hover:shadow transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Volume de Requisições</p>
                <p className="text-2xl font-black mt-1.5">{metrics.totalRequests}</p>
                <p className="text-xs text-muted-foreground mt-1">no período atual</p>
              </div>
              <div className="p-3 bg-blue-500/10 text-blue-600 rounded-xl">
                <Activity className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-muted/70 hover:shadow transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Taxa de Sucesso</p>
                <p className={cn("text-2xl font-black mt-1.5", metrics.successRate >= 95 ? "text-emerald-600" : metrics.successRate >= 80 ? "text-amber-600" : "text-rose-600")}>
                  {metrics.successRate.toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground mt-1">status 2xx</p>
              </div>
              <div className="p-3 bg-emerald-500/10 text-emerald-600 rounded-xl">
                <TrendingUp className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-muted/70 hover:shadow transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tempo Médio</p>
                <p className="text-2xl font-black mt-1.5">{metrics.avgDuration} ms</p>
                <p className="text-xs text-muted-foreground mt-1">latência de resposta</p>
              </div>
              <div className="p-3 bg-amber-500/10 text-amber-600 rounded-xl">
                <Clock className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="shadow-sm border border-muted/70 hover:shadow transition-shadow">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Falhas Detectadas</p>
                <p className="text-2xl font-black mt-1.5 text-rose-600">
                  {logs.filter(l => l.status_code === null || l.status_code >= 400).length}
                </p>
                <p className="text-xs text-muted-foreground mt-1">nesta página de listagem</p>
              </div>
              <div className="p-3 bg-rose-500/10 text-rose-600 rounded-xl">
                <AlertCircle className="h-6 w-6" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters Card */}
      <Card className="shadow-sm border-muted/80">
        <CardHeader className="pb-3 flex flex-row items-center gap-2">
          <Database className="h-4.5 w-4.5 text-muted-foreground" />
          <CardTitle className="text-sm font-semibold">Filtros de Pesquisa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            
            {/* Search Input */}
            <div className="space-y-1.5 md:col-span-2">
              <label className="text-xs font-semibold text-muted-foreground flex items-center gap-1">
                <Search className="h-3 w-3" />
                Busca Textual
              </label>
              <div className="relative">
                <Input 
                  placeholder="Filtrar por path, função ou evento..." 
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 h-9.5 text-sm"
                />
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground/75" />
              </div>
            </div>

            {/* Source */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Origem</label>
              <Select value={source} onValueChange={(v) => { setSource(v as LogSource); setPage(1); }}>
                <SelectTrigger className="h-9.5">
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

            {/* Method */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Método HTTP</label>
              <Select value={method} onValueChange={(v) => { setMethod(v); setPage(1); }}>
                <SelectTrigger className="h-9.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {methodOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Period */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Período de Tempo</label>
              <Select value={period} onValueChange={(v) => { setPeriod(v as LogPeriod); setPage(1); }}>
                <SelectTrigger className="h-9.5">
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

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-muted-foreground">Status HTTP</label>
              <Select value={status} onValueChange={(v) => { setStatus(v as LogStatus); setPage(1); }}>
                <SelectTrigger className="h-9.5">
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

          </div>
        </CardContent>
      </Card>

      {/* Main logs list card */}
      <Card className="shadow-sm border-muted/80 overflow-hidden">
        <CardHeader className="pb-3 border-b flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <ScrollText className="h-5 w-5 text-muted-foreground" />
              Linha do Tempo de Requisições
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Dados atualizados. Clique no ícone de olho para inspecionar payloads completos.
            </CardDescription>
          </div>
          <Badge className="font-semibold px-2.5 py-0.5 bg-primary/10 text-primary border-primary/20">
            {totalCount} registros
          </Badge>
        </CardHeader>
        <CardContent className="p-0">
          
          {isLoading ? (
            <div className="p-6 space-y-4">
              {[...Array(6)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full rounded-md" />
              ))}
            </div>
          ) : logs.length === 0 ? (
            <div className="p-16 text-center text-muted-foreground flex flex-col items-center justify-center">
              <ScrollText className="h-16 w-16 mb-4 text-muted-foreground/40 stroke-[1.5]" />
              <h3 className="text-lg font-bold text-foreground">Nenhum log encontrado</h3>
              <p className="max-w-md text-sm text-muted-foreground mt-2">
                Nenhum log corresponde aos filtros atuais. Tente mudar o método, a origem ou o termo de pesquisa.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-muted/40">
                  <TableRow>
                    <TableHead className="w-[17%] font-semibold text-xs text-foreground">Data/Hora</TableHead>
                    <TableHead className="w-[12%] font-semibold text-xs text-foreground">Origem</TableHead>
                    <TableHead className="w-[10%] font-semibold text-xs text-foreground">Método</TableHead>
                    <TableHead className="w-[31%] font-semibold text-xs text-foreground">Caminho / Evento</TableHead>
                    <TableHead className="w-[10%] font-semibold text-xs text-foreground">Status</TableHead>
                    <TableHead className="w-[12%] font-semibold text-xs text-foreground">Duração</TableHead>
                    <TableHead className="w-[8%] text-right"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {logs.map((log) => {
                    const formattedDate = format(new Date(log.timestamp), "dd/MM/yyyy HH:mm:ss", { locale: ptBR });
                    
                    return (
                      <TableRow key={log.id} className="hover:bg-muted/30 transition-colors group">
                        <TableCell className="font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {formattedDate}
                        </TableCell>
                        <TableCell>
                          {getSourceBadge(log.source)}
                        </TableCell>
                        <TableCell>
                          {log.source === 'api_request' ? getMethodBadge(log.method) : getMethodBadge('POST')}
                        </TableCell>
                        <TableCell className="max-w-xs">
                          <div className="flex flex-col gap-0.5 truncate max-w-full">
                            <span className="font-mono text-xs font-bold text-foreground truncate block">
                              {log.source === 'api_request' 
                                ? (log.path || `/api/v1/functions/${log.function_name}`) 
                                : log.event_type
                              }
                            </span>
                            {log.source === 'api_request' && log.function_name && (
                              <span className="text-[10px] text-muted-foreground font-mono">
                                fn: {log.function_name}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(log.status_code)}
                        </TableCell>
                        <TableCell>
                          {getDurationBadge(log.duration_ms)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-8 w-8 p-0 hover:bg-primary/10 hover:text-primary transition-colors opacity-80 group-hover:opacity-100"
                            onClick={() => setSelectedLog(log)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>

        {/* Pagination bar */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t bg-muted/20">
            <span className="text-sm text-muted-foreground font-medium">
              Página {page} de {totalPages} <span className="text-xs text-muted-foreground/60">({totalCount} logs no total)</span>
            </span>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="h-8 shadow-sm"
              >
                Anterior
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="h-8 shadow-sm"
              >
                Próxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Log Details Sheet */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-2xl overflow-y-auto border-l flex flex-col h-full bg-background p-0">
          
          {selectedLog && (
            <div className="flex flex-col h-full">
              {/* Sheet Header */}
              <div className="p-6 border-b bg-muted/30">
                <SheetHeader className="space-y-1">
                  <div className="flex items-center gap-2">
                    {getSourceBadge(selectedLog.source)}
                    {selectedLog.source === 'api_request' && getMethodBadge(selectedLog.method)}
                  </div>
                  <SheetTitle className="text-xl font-black mt-2 font-mono break-all leading-tight text-foreground select-all">
                    {selectedLog.source === 'api_request' 
                      ? (selectedLog.path || `/api/v1/functions/${selectedLog.function_name}`) 
                      : selectedLog.event_type
                    }
                  </SheetTitle>
                  <SheetDescription className="text-xs font-mono break-all mt-1 opacity-80 select-all">
                    ID: {selectedLog.id}
                  </SheetDescription>
                </SheetHeader>
              </div>

              {/* Tabs Content */}
              <div className="flex-1 overflow-hidden">
                <Tabs defaultValue="overview" className="flex flex-col h-full">
                  <div className="border-b px-6 bg-muted/10">
                    <TabsList className="w-full justify-start h-11 bg-transparent p-0 gap-5 border-none">
                      <TabsTrigger 
                        value="overview" 
                        className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-11 px-1 bg-transparent data-[state=active]:bg-transparent shadow-none font-semibold text-sm transition-all"
                      >
                        Resumo Geral
                      </TabsTrigger>
                      <TabsTrigger 
                        value="request" 
                        className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-11 px-1 bg-transparent data-[state=active]:bg-transparent shadow-none font-semibold text-sm transition-all"
                      >
                        Payload Enviado
                      </TabsTrigger>
                      <TabsTrigger 
                        value="response" 
                        className="data-[state=active]:border-primary border-b-2 border-transparent rounded-none h-11 px-1 bg-transparent data-[state=active]:bg-transparent shadow-none font-semibold text-sm transition-all"
                      >
                        Resposta
                      </TabsTrigger>
                    </TabsList>
                  </div>

                  <ScrollArea className="flex-1 p-6">
                    
                    {/* Tab 1: Overview */}
                    <TabsContent value="overview" className="m-0 space-y-5">
                      
                      {/* Status and Performance cards */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 rounded-xl border bg-muted/30">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Código HTTP</span>
                          <div className="mt-1.5">{getStatusBadge(selectedLog.status_code)}</div>
                        </div>
                        <div className="p-4 rounded-xl border bg-muted/30">
                          <span className="text-[10px] uppercase font-bold text-muted-foreground block">Latência</span>
                          <div className="mt-1.5">{getDurationBadge(selectedLog.duration_ms)}</div>
                        </div>
                      </div>

                      {/* Details list */}
                      <Card className="border shadow-none">
                        <CardHeader className="py-3 px-4 border-b">
                          <CardTitle className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Metadados da Requisição</CardTitle>
                        </CardHeader>
                        <CardContent className="p-0 divide-y font-mono text-xs">
                          <div className="flex justify-between items-center py-2.5 px-4">
                            <span className="text-muted-foreground">Data/Hora:</span>
                            <span className="font-semibold text-right">{format(new Date(selectedLog.timestamp), "dd/MM/yyyy HH:mm:ss.SSS", { locale: ptBR })}</span>
                          </div>
                          
                          {selectedLog.webhook_url && (
                            <div className="flex flex-col py-2.5 px-4 gap-1">
                              <span className="text-muted-foreground">URL Destinatária:</span>
                              <span className="font-semibold text-xs break-all bg-muted/40 p-2 rounded text-foreground select-all">{selectedLog.webhook_url}</span>
                            </div>
                          )}

                          {selectedLog.ip_address && (
                            <div className="flex justify-between items-center py-2.5 px-4">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Wifi className="h-3.5 w-3.5 opacity-70" />
                                Endereço IP:
                              </span>
                              <span className="font-semibold select-all">{selectedLog.ip_address}</span>
                            </div>
                          )}

                          {selectedLog.user_id && (
                            <div className="flex justify-between items-center py-2.5 px-4">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <User className="h-3.5 w-3.5 opacity-70" />
                                User ID associado:
                              </span>
                              <span className="font-semibold text-[10px] break-all max-w-[240px] text-right select-all">{selectedLog.user_id}</span>
                            </div>
                          )}

                          {selectedLog.source === 'api_request' && (
                            <div className="flex justify-between items-center py-2.5 px-4">
                              <span className="text-muted-foreground flex items-center gap-1">
                                <Key className="h-3.5 w-3.5 opacity-70" />
                                API Key ID:
                              </span>
                              <span className="font-semibold text-[10px] select-all">
                                {selectedLog.id ? selectedLog.id.slice(0, 8) + '...' : 'N/A'}
                              </span>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      {/* Error Banner */}
                      {selectedLog.error_message && (
                        <div className="p-4 rounded-xl border border-destructive/20 bg-destructive/5 text-destructive space-y-1.5">
                          <div className="flex items-center gap-1.5 font-bold text-sm">
                            <AlertCircle className="h-4.5 w-4.5" />
                            Erro Detectado
                          </div>
                          <p className="font-mono text-xs whitespace-pre-wrap break-all bg-destructive/10 p-2.5 rounded-lg border border-destructive/10">
                            {selectedLog.error_message}
                          </p>
                        </div>
                      )}
                    </TabsContent>

                    {/* Tab 2: Request Payload */}
                    <TabsContent value="request" className="m-0 space-y-4">
                      
                      {/* Query parameters section */}
                      {selectedLog.query_params && Object.keys(selectedLog.query_params).length > 0 && (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Query Parameters (?query=val)</h4>
                            <Button 
                              variant="ghost" 
                              size="xs" 
                              onClick={() => handleCopy(JSON.stringify(selectedLog.query_params, null, 2), 'query')}
                              className="h-7 text-[10px] gap-1 px-2"
                            >
                              {copiedId === 'query' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              Copiar
                            </Button>
                          </div>
                          <pre className="p-4 rounded-xl border bg-muted/40 font-mono text-xs overflow-x-auto text-foreground select-all leading-relaxed">
                            {JSON.stringify(selectedLog.query_params, null, 2)}
                          </pre>
                        </div>
                      )}

                      {/* Body payload section */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Corpo da Requisição (JSON Payload)</h4>
                          {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 && (
                            <Button 
                              variant="ghost" 
                              size="xs" 
                              onClick={() => handleCopy(JSON.stringify(selectedLog.payload, null, 2), 'payload')}
                              className="h-7 text-[10px] gap-1 px-2 hover:bg-muted"
                            >
                              {copiedId === 'payload' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              Copiar JSON
                            </Button>
                          )}
                        </div>

                        {selectedLog.payload && Object.keys(selectedLog.payload).length > 0 ? (
                          <pre className="p-4 rounded-xl border bg-muted/45 font-mono text-xs overflow-x-auto text-foreground select-all leading-relaxed max-h-[360px] overflow-y-auto">
                            {JSON.stringify(selectedLog.payload, null, 2)}
                          </pre>
                        ) : (
                          <div className="p-6 text-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground text-xs font-mono">
                            Nenhum payload enviado no corpo desta requisição.
                          </div>
                        )}
                      </div>
                    </TabsContent>

                    {/* Tab 3: Response body */}
                    <TabsContent value="response" className="m-0 space-y-4">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <h4 className="text-xs font-extrabold uppercase tracking-wider text-muted-foreground">Corpo do Retorno (Response Body)</h4>
                          {selectedLog.response_body && (
                            <Button 
                              variant="ghost" 
                              size="xs" 
                              onClick={() => handleCopy(selectedLog.response_body || '', 'response')}
                              className="h-7 text-[10px] gap-1 px-2 hover:bg-muted"
                            >
                              {copiedId === 'response' ? <Check className="h-3.5 w-3.5 text-emerald-500" /> : <Copy className="h-3.5 w-3.5" />}
                              Copiar Retorno
                            </Button>
                          )}
                        </div>

                        {selectedLog.response_body ? (
                          <pre className="p-4 rounded-xl border bg-muted/45 font-mono text-xs overflow-x-auto text-foreground select-all leading-relaxed max-h-[420px] overflow-y-auto">
                            {(() => {
                              try {
                                const parsed = JSON.parse(selectedLog.response_body);
                                return JSON.stringify(parsed, null, 2);
                              } catch {
                                return selectedLog.response_body;
                              }
                            })()}
                          </pre>
                        ) : (
                          <div className="p-6 text-center rounded-xl border border-dashed bg-muted/10 text-muted-foreground text-xs font-mono">
                            Nenhum corpo de retorno registrado.
                          </div>
                        )}
                      </div>
                    </TabsContent>

                  </ScrollArea>
                </Tabs>
              </div>

              {/* Sheet Footer */}
              <div className="p-4 border-t bg-muted/20 flex justify-end">
                <Button variant="outline" size="sm" onClick={() => setSelectedLog(null)} className="h-9 px-4">
                  Fechar Inspecionador
                </Button>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Retention alert */}
      <div className="flex items-center justify-center p-3 rounded-lg border border-amber-500/10 bg-amber-500/5 text-amber-600/90 text-xs text-center max-w-lg mx-auto">
        ℹ️ Os logs de requisições de API e webhook são retidos por um período máximo de 7 dias e limpos automaticamente.
      </div>
    </div>
  );
};

export default SystemLogs;
