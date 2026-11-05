import React from "react";
import { OrderPipelineItem } from "@/types/orderPipeline";
import { OrderSolicitations } from "@/components/admin/OrderSolicitations";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, RotateCcw, AlertTriangle, ShieldCheck } from "lucide-react";

interface OrdersOccurrencesSubpageProps {
  orders: OrderPipelineItem[];
}

export const OrdersOccurrencesSubpage: React.FC<OrdersOccurrencesSubpageProps> = ({ orders }) => {
  const occurrenceOrders = orders.filter(
    (o) => !!o.active_ticket_status || !!o.has_solicitation
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1 pr-2 pb-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total de Ocorrências Abertas
            </CardTitle>
            <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-600">
              <AlertCircle className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">
              {occurrenceOrders.length}
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Casos em análise ou aguardando resolução operacional
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Devoluções & Trocas
            </CardTitle>
            <div className="p-1.5 rounded-md bg-blue-500/10 text-blue-600">
              <RotateCcw className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-foreground">
              {
                orders.filter((o) =>
                  (o.status || "").toLowerCase().includes("devolucao")
                ).length
              }
            </div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Solicitações de logística reversa e devoluções
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-2xs border bg-card/60">
          <CardHeader className="flex flex-row items-center justify-between pb-1 space-y-0 px-4 pt-3.5">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Proteção contra Arquivamento
            </CardTitle>
            <div className="p-1.5 rounded-md bg-emerald-500/10 text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent className="px-4 pb-3.5">
            <div className="text-2xl font-bold text-emerald-600">100% Ativa</div>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Pedidos com ocorrência não são arquivados automaticamente
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Solicitations Interface */}
      <div className="rounded-xl border bg-card shadow-2xs p-3">
        <OrderSolicitations />
      </div>
    </div>
  );
};
