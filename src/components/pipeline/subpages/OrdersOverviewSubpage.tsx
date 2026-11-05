import React, { useMemo } from "react";
import { OrderPipelineItem } from "@/types/orderPipeline";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  Package,
  Clock,
  CheckCircle2,
  AlertCircle,
  Truck,
  Archive,
  RotateCcw,
  DollarSign,
  Layers,
  ArrowUpRight,
  ShieldCheck,
  ShoppingBag,
} from "lucide-react";

interface OrdersOverviewSubpageProps {
  orders: OrderPipelineItem[];
}

export const OrdersOverviewSubpage: React.FC<OrdersOverviewSubpageProps> = ({ orders }) => {
  const metrics = useMemo(() => {
    const total = orders.length;
    const active = orders.filter((o) => !o.is_archived);
    const archived = orders.filter((o) => o.is_archived);

    // Operational stages in active orders
    const newOrders = active.filter(
      (o) => (o.status || "").toLowerCase() === "pendente"
    );
    const awaitingReceipt = active.filter(
      (o) => (o.status || "").toLowerCase() === "pago"
    );
    const awaitingShipment = active.filter((o) =>
      ["recebido", "embalado"].includes((o.status || "").toLowerCase())
    );
    const shipped = active.filter(
      (o) => (o.status || "").toLowerCase() === "enviado"
    );
    const finished = active.filter(
      (o) => (o.status || "").toLowerCase() === "finalizado"
    );
    const occurrences = active.filter(
      (o) => !!o.active_ticket_status || !!o.has_solicitation
    );

    // Financial calculations
    const totalRevenue = active.reduce((acc, o) => acc + (o.total_amount || 0), 0);
    const avgTicket = active.length > 0 ? totalRevenue / active.length : 0;
    const paidCount = active.filter((o) => o.payment_status === "paid").length;
    const conversionRate = active.length > 0 ? (paidCount / active.length) * 100 : 0;

    // Channels breakdown
    const channelCounts: Record<string, number> = {};
    active.forEach((o) => {
      const ch = o.channel_label || "Outros";
      channelCounts[ch] = (channelCounts[ch] || 0) + 1;
    });

    // Archiving stats
    const autoArchived = archived.filter((o) => o.archived_type === "auto").length;
    const manualArchived = archived.filter((o) => o.archived_type !== "auto").length;

    const reasonsCount: Record<string, number> = {};
    archived.forEach((o) => {
      const r = o.archived_reason || "Não informado";
      reasonsCount[r] = (reasonsCount[r] || 0) + 1;
    });

    const topReasons = Object.entries(reasonsCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4);

    return {
      total,
      activeCount: active.length,
      archivedCount: archived.length,
      newOrdersCount: newOrders.length,
      awaitingReceiptCount: awaitingReceipt.length,
      awaitingShipmentCount: awaitingShipment.length,
      shippedCount: shipped.length,
      finishedCount: finished.length,
      occurrencesCount: occurrences.length,
      totalRevenue,
      avgTicket,
      conversionRate,
      channelCounts,
      autoArchived,
      manualArchived,
      topReasons,
    };
  }, [orders]);

  const formatCurrency = (val: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(val);

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1 pr-2 pb-6">
      {/* Top Banner & Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pedidos Ativos na Operação
            </CardTitle>
            <div className="p-1.5 rounded-md bg-primary/10 text-primary">
              <Package className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">{metrics.activeCount}</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              De um total histórico de {metrics.total} pedidos
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Volume Financeiro Ativo
            </CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">
              {formatCurrency(metrics.totalRevenue)}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Ticket médio de {formatCurrency(metrics.avgTicket)}
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ocorrências & Solicitações
            </CardTitle>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">
              {metrics.occurrencesCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Devoluções, cancelamentos e garantias
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Pedidos Arquivados
            </CardTitle>
            <div className="p-1.5 rounded-md bg-slate-500/10 text-slate-600 dark:text-slate-300">
              <Archive className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">
              {metrics.archivedCount}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              {metrics.autoArchived} automáticos • {metrics.manualArchived} manuais
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operational Flow Funnel */}
      <Card className="shadow-2xs border">
        <CardHeader className="px-4 py-3 border-b">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-semibold">Funil Operacional de Pedidos</CardTitle>
              <CardDescription className="text-xs">
                Distribuição dos pedidos ativos ao longo das etapas do pipeline
              </CardDescription>
            </div>
            <Badge variant="outline" className="text-xs font-normal">
              {metrics.activeCount} pedidos no fluxo
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                Novos Pedidos (Aguardando Pagamento)
              </span>
              <span>
                {metrics.newOrdersCount} (
                {metrics.activeCount > 0
                  ? Math.round((metrics.newOrdersCount / metrics.activeCount) * 100)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={metrics.activeCount > 0 ? (metrics.newOrdersCount / metrics.activeCount) * 100 : 0}
              className="h-2 bg-blue-500/10 [&>div]:bg-blue-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                Pedido Pago (Aguardando Recebimento pela Expedição)
              </span>
              <span>
                {metrics.awaitingReceiptCount} (
                {metrics.activeCount > 0
                  ? Math.round((metrics.awaitingReceiptCount / metrics.activeCount) * 100)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={
                metrics.activeCount > 0
                  ? (metrics.awaitingReceiptCount / metrics.activeCount) * 100
                  : 0
              }
              className="h-2 bg-emerald-500/10 [&>div]:bg-emerald-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                Separação / Embalagem (Aguardando Envio)
              </span>
              <span>
                {metrics.awaitingShipmentCount} (
                {metrics.activeCount > 0
                  ? Math.round((metrics.awaitingShipmentCount / metrics.activeCount) * 100)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={
                metrics.activeCount > 0
                  ? (metrics.awaitingShipmentCount / metrics.activeCount) * 100
                  : 0
              }
              className="h-2 bg-amber-500/10 [&>div]:bg-amber-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
                Pedido Enviado em Trânsito
              </span>
              <span>
                {metrics.shippedCount} (
                {metrics.activeCount > 0
                  ? Math.round((metrics.shippedCount / metrics.activeCount) * 100)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={metrics.activeCount > 0 ? (metrics.shippedCount / metrics.activeCount) * 100 : 0}
              className="h-2 bg-indigo-500/10 [&>div]:bg-indigo-500"
            />
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-medium">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-teal-500" />
                Finalizados & Entregues
              </span>
              <span>
                {metrics.finishedCount} (
                {metrics.activeCount > 0
                  ? Math.round((metrics.finishedCount / metrics.activeCount) * 100)
                  : 0}
                %)
              </span>
            </div>
            <Progress
              value={metrics.activeCount > 0 ? (metrics.finishedCount / metrics.activeCount) * 100 : 0}
              className="h-2 bg-teal-500/10 [&>div]:bg-teal-500"
            />
          </div>
        </CardContent>
      </Card>

      {/* 2 Column Details: Channels & Archiving Diagnostics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {/* Marketplace Channels */}
        <Card className="shadow-2xs border">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-semibold">Origem por Marketplace / Canal</CardTitle>
            <CardDescription className="text-xs">
              Volume de pedidos ativos processados por integração
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-2.5">
            {Object.entries(metrics.channelCounts).map(([channel, count]) => {
              const pct = metrics.activeCount > 0 ? Math.round((count / metrics.activeCount) * 100) : 0;
              return (
                <div key={channel} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-foreground">{channel}</span>
                    <span className="text-muted-foreground">
                      {count} pedido(s) ({pct}%)
                    </span>
                  </div>
                  <Progress value={pct} className="h-1.5" />
                </div>
              );
            })}
          </CardContent>
        </Card>

        {/* Archiving Analytics */}
        <Card className="shadow-2xs border">
          <CardHeader className="px-4 py-3 border-b">
            <CardTitle className="text-sm font-semibold">Diagnóstico de Arquivamento</CardTitle>
            <CardDescription className="text-xs">
              Estatísticas dos pedidos retirados da esteira operacional
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <span className="text-muted-foreground block text-[11px]">Arquivados Automáticos</span>
                <span className="text-base font-bold text-foreground">{metrics.autoArchived}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Por inatividade (+24h)</span>
              </div>
              <div className="p-2.5 rounded-lg bg-muted/40 border">
                <span className="text-muted-foreground block text-[11px]">Arquivados Manuais</span>
                <span className="text-base font-bold text-foreground">{metrics.manualArchived}</span>
                <span className="text-[10px] text-muted-foreground block mt-0.5">Por operadores</span>
              </div>
            </div>

            <div className="space-y-1.5 pt-1">
              <span className="text-xs font-semibold text-foreground">Principais motivos de arquivamento:</span>
              {metrics.topReasons.length > 0 ? (
                metrics.topReasons.map(([reason, count]) => (
                  <div key={reason} className="flex justify-between items-center text-xs py-1 border-b last:border-0 border-border/40">
                    <span className="text-muted-foreground truncate max-w-[220px]">{reason}</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {count}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground py-2">Nenhum pedido arquivado até o momento.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
