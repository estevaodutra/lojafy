import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  RefreshCw, 
  Search, 
  History, 
  ArrowRight, 
  User, 
  Package, 
  Calendar, 
  TrendingDown, 
  TrendingUp, 
  Tag, 
  CheckCircle2, 
  XCircle, 
  Edit3, 
  Boxes, 
  DollarSign, 
  Clock, 
  Filter,
  Trash2,
  PlusCircle,
  ShieldCheck
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  usePlatformAuditLogs, 
  AuditActionType, 
  AuditPeriod, 
  PlatformAuditLog, 
  AuditChangeItem 
} from '@/hooks/usePlatformAuditLogs';

export const AuditLogs: React.FC = () => {
  const navigate = useNavigate();

  // Estados dos filtros
  const [search, setSearch] = useState('');
  const [actionType, setActionType] = useState<AuditActionType>('all');
  const [period, setPeriod] = useState<AuditPeriod>('all');
  const [page, setPage] = useState(1);

  const {
    logs,
    totalCount,
    totalPages,
    currentPage,
    setCurrentPage,
    isLoading,
    isFetching,
    refetch
  } = usePlatformAuditLogs({
    search,
    actionType,
    period,
    page,
    pageSize: 12,
  });

  const getActionBadge = (log: PlatformAuditLog) => {
    switch (log.action_type) {
      case 'status_change': {
        const isActivated = log.action_label?.toLowerCase().includes('ativad') && !log.action_label?.toLowerCase().includes('desativad');
        return isActivated ? (
          <Badge className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            {log.action_label || 'Produto Ativado'}
          </Badge>
        ) : (
          <Badge variant="outline" className="bg-slate-500/10 text-slate-700 dark:text-slate-300 border-slate-500/20 font-medium">
            <XCircle className="w-3 h-3 mr-1 text-rose-500" />
            {log.action_label || 'Produto Desativado'}
          </Badge>
        );
      }
      case 'stock_change': {
        const isReduction = log.action_label?.toLowerCase().includes('remoção') || log.action_label?.toLowerCase().includes('saída');
        return (
          <Badge className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 font-medium">
            {isReduction ? <TrendingDown className="w-3 h-3 mr-1" /> : <TrendingUp className="w-3 h-3 mr-1" />}
            {log.action_label || 'Ajuste de Estoque'}
          </Badge>
        );
      }
      case 'price_change':
      case 'cost_change':
        return (
          <Badge className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 font-medium">
            <DollarSign className="w-3 h-3 mr-1" />
            {log.action_label || 'Alteração de Preço'}
          </Badge>
        );
      case 'product_create':
        return (
          <Badge className="bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20 font-medium">
            <PlusCircle className="w-3 h-3 mr-1" />
            {log.action_label || 'Produto Cadastrado'}
          </Badge>
        );
      case 'product_delete':
        return (
          <Badge variant="destructive" className="font-medium">
            <Trash2 className="w-3 h-3 mr-1" />
            {log.action_label || 'Produto Removido'}
          </Badge>
        );
      default:
        return (
          <Badge variant="outline" className="bg-muted text-muted-foreground font-medium">
            <Edit3 className="w-3 h-3 mr-1" />
            {log.action_label || 'Edição de Produto'}
          </Badge>
        );
    }
  };

  const getRoleBadge = (role: string | null) => {
    if (!role) return null;
    const cleanRole = role.toLowerCase();
    if (cleanRole === 'super_admin') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
          Super Admin
        </span>
      );
    }
    if (cleanRole === 'admin') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
          Admin
        </span>
      );
    }
    if (cleanRole === 'supplier') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
          Fornecedor
        </span>
      );
    }
    if (cleanRole === 'system') {
      return (
        <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400 border border-slate-500/20">
          Sistema
        </span>
      );
    }
    return (
      <span className="inline-flex items-center text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-slate-500/10 text-slate-600 dark:text-slate-400">
        {role}
      </span>
    );
  };

  const formatFieldValue = (field: string, val: any) => {
    if (val === null || val === undefined || val === '') {
      return <span className="text-muted-foreground italic">—</span>;
    }
    if (field === 'price' || field === 'cost_price' || field === 'supplier_cost_price') {
      const num = Number(val);
      if (!isNaN(num)) {
        return <span className="font-semibold">{num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>;
      }
    }
    if (field === 'active' || field === 'status') {
      const isAct = val === true || val === 'Ativo';
      return (
        <span className={`inline-flex items-center font-medium ${isAct ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-600 dark:text-slate-400'}`}>
          {isAct ? 'Ativo' : 'Inativo'}
        </span>
      );
    }
    if (field === 'stock_quantity') {
      return <span className="font-semibold font-mono">{val} un.</span>;
    }
    return <span className="font-medium text-foreground">{String(val)}</span>;
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6 animate-in fade-in duration-300">
      {/* Top Bar com Navegação */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b">
        <div className="space-y-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/super-admin/recursos')}
            className="group -ml-2 mb-2 text-muted-foreground hover:text-foreground text-xs flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5 transition-transform group-hover:-translate-x-1" />
            <span>Voltar para Recursos</span>
          </Button>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <History className="h-6 w-6 stroke-[2.2]" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground">
                Histórico de Alterações
              </h1>
              <p className="text-sm text-muted-foreground">
                Acompanhe em formato de lista simples o que mudou, quem alterou e como estava antes e depois.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="flex items-center gap-1.5 text-xs h-9"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            <span>Atualizar</span>
          </Button>
        </div>
      </div>

      {/* Barra de Filtros */}
      <Card className="border border-border/70 shadow-sm bg-card">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-3">
            {/* Busca textual */}
            <div className="relative lg:col-span-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por produto, usuário, e-mail ou ação..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setCurrentPage(1);
                }}
                className="pl-9 h-10 text-sm"
              />
            </div>

            {/* Filtro por Tipo de Ação */}
            <div className="lg:col-span-3">
              <Select
                value={actionType}
                onValueChange={(val: AuditActionType) => {
                  setActionType(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Tipo de Ação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Alterações</SelectItem>
                  <SelectItem value="status_change">Ativação / Inativação</SelectItem>
                  <SelectItem value="stock_change">Alterações de Estoque</SelectItem>
                  <SelectItem value="price_change">Alterações de Preço</SelectItem>
                  <SelectItem value="product_update">Edições de Produto</SelectItem>
                  <SelectItem value="product_create">Novos Produtos</SelectItem>
                  <SelectItem value="product_delete">Produtos Removidos</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Filtro por Período */}
            <div className="lg:col-span-3">
              <Select
                value={period}
                onValueChange={(val: AuditPeriod) => {
                  setPeriod(val);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todo o Período</SelectItem>
                  <SelectItem value="24h">Últimas 24 Horas</SelectItem>
                  <SelectItem value="7d">Últimos 7 Dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 Dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Lista de Registros */}
      <div className="space-y-3">
        {isLoading ? (
          // Estado de Carregamento
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <Card key={i} className="p-4 space-y-3">
                <div className="flex justify-between items-center">
                  <Skeleton className="h-5 w-48" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-64" />
                <Skeleton className="h-12 w-full rounded-md" />
              </Card>
            ))}
          </div>
        ) : logs.length === 0 ? (
          // Estado Vazio
          <Card className="border-dashed p-12 text-center">
            <div className="mx-auto w-12 h-12 rounded-full bg-muted/60 flex items-center justify-center text-muted-foreground mb-3">
              <History className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-foreground">Nenhuma alteração encontrada</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto mt-1">
              {search || actionType !== 'all' || period !== 'all'
                ? 'Nenhum registro corresponde aos filtros selecionados. Tente limpar os filtros.'
                : 'Quando produtos forem ativados, inativados ou tiverem estoque e preços alterados, o histórico aparecerá aqui.'}
            </p>
            {(search || actionType !== 'all' || period !== 'all') && (
              <Button
                variant="outline"
                size="sm"
                className="mt-4 text-xs"
                onClick={() => {
                  setSearch('');
                  setActionType('all');
                  setPeriod('all');
                  setCurrentPage(1);
                }}
              >
                Limpar filtros
              </Button>
            )}
          </Card>
        ) : (
          // Listagem de Logs
          logs.map((log) => {
            const dateObj = new Date(log.created_at);
            const dateFormatted = format(dateObj, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
            const timeAgo = formatDistanceToNow(dateObj, { addSuffix: true, locale: ptBR });

            return (
              <Card 
                key={log.id} 
                className="border border-border/80 hover:border-border transition-all shadow-xs hover:shadow-sm bg-card overflow-hidden"
              >
                <div className="p-4 sm:p-5 space-y-3.5">
                  {/* Cabeçalho do Item */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-2.5 border-b border-border/50">
                    <div className="flex flex-wrap items-center gap-2">
                      {getActionBadge(log)}
                      
                      <div className="flex items-center gap-1.5 font-semibold text-foreground text-sm sm:text-base">
                        <Package className="w-4 h-4 text-muted-foreground shrink-0" />
                        <span>{log.entity_name || 'Produto sem nome'}</span>
                      </div>
                    </div>

                    {/* Autor e Data */}
                    <div className="flex flex-wrap items-center gap-2.5 text-xs text-muted-foreground">
                      <div className="flex items-center gap-1.5 bg-muted/50 px-2.5 py-1 rounded-md">
                        <User className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="font-medium text-foreground">
                          {log.actor_name || 'Usuário'}
                        </span>
                        {log.actor_email && (
                          <span className="text-muted-foreground/80 hidden md:inline">({log.actor_email})</span>
                        )}
                        {getRoleBadge(log.actor_role)}
                      </div>

                      <div className="flex items-center gap-1" title={dateFormatted}>
                        <Clock className="w-3.5 h-3.5 text-muted-foreground" />
                        <span>{timeAgo}</span>
                      </div>
                    </div>
                  </div>

                  {/* Lista de Alterações: O que mudou (Antes ➔ Depois) */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/80">
                      Alterações realizadas:
                    </span>

                    {Array.isArray(log.changes) && log.changes.length > 0 ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                        {log.changes.map((change: AuditChangeItem, idx: number) => {
                          const isStock = change.field === 'stock_quantity';
                          const diff = isStock && change.before !== null && change.after !== null 
                            ? Number(change.after) - Number(change.before) 
                            : null;

                          return (
                            <div 
                              key={idx} 
                              className="flex items-center justify-between p-2.5 rounded-lg bg-muted/40 border border-border/50 text-xs gap-3"
                            >
                              <span className="font-medium text-muted-foreground shrink-0">
                                {change.label || change.field}:
                              </span>

                              <div className="flex items-center gap-2 font-mono">
                                {/* Como estava antes */}
                                <div className="text-muted-foreground line-through opacity-80">
                                  {formatFieldValue(change.field, change.before)}
                                </div>

                                <ArrowRight className="w-3 h-3 text-muted-foreground shrink-0" />

                                {/* Como ficou agora */}
                                <div className="font-semibold text-foreground">
                                  {formatFieldValue(change.field, change.after)}
                                </div>

                                {/* Diferença numérica se for estoque */}
                                {diff !== null && diff !== 0 && (
                                  <span className={`text-[10px] px-1 rounded font-sans font-medium ${diff > 0 ? 'bg-emerald-500/10 text-emerald-600' : 'bg-rose-500/10 text-rose-600'}`}>
                                    {diff > 0 ? `+${diff}` : diff}
                                  </span>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-xs text-muted-foreground italic">
                        Nenhum detalhe específico registrado.
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })
        )}
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <p className="text-xs text-muted-foreground">
            Mostrando {logs.length} de {totalCount} registro(s)
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage <= 1 || isLoading}
              className="text-xs h-8"
            >
              Anterior
            </Button>
            <span className="text-xs text-muted-foreground font-medium px-2">
              Página {currentPage} de {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage >= totalPages || isLoading}
              className="text-xs h-8"
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogs;
