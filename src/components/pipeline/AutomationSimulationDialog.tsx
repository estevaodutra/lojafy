import React, { useState } from "react";
import {
  OrderPipelineAutomation,
  OrderPipelineItem,
  AutomationSimulationResult,
} from "@/types/orderPipeline";
import { orderAutomationService } from "@/services/orderAutomationService";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, ShieldAlert, CheckCircle2, AlertTriangle, Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface AutomationSimulationDialogProps {
  automation: OrderPipelineAutomation | null;
  orders: OrderPipelineItem[];
  isOpen: boolean;
  onClose: () => void;
  onExecuted?: () => void;
}

export const AutomationSimulationDialog: React.FC<AutomationSimulationDialogProps> = ({
  automation,
  orders,
  isOpen,
  onClose,
  onExecuted,
}) => {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!automation || !isOpen) return null;

  const result = orderAutomationService.simulate(automation, orders);

  const handleExecuteNow = async () => {
    try {
      setIsExecuting(true);
      const res = await orderAutomationService.executeNow(automation, orders);
      toast.success(
        `Regra executada: ${res.executed} pedido(s) arquivado(s). ${res.blocked} protegido(s).`
      );
      onExecuted?.();
      onClose();
    } catch {
      toast.error("Erro ao executar regra de automação.");
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-bold text-foreground">
                Simulação da Regra: {automation.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Prévia da avaliação dos pedidos sem executar qualquer alteração no banco de dados.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto space-y-4 py-2 pr-1">
          {/* Summary counters */}
          <div className="grid grid-cols-3 gap-2.5">
            <div className="p-3 rounded-lg bg-muted/50 border text-xs">
              <span className="text-muted-foreground block text-[11px]">Pedidos Avaliados</span>
              <span className="text-xl font-bold text-foreground">{result.totalEvaluated}</span>
              <span className="text-[10px] text-muted-foreground block mt-0.5">
                Na etapa "{automation.stage_key}"
              </span>
            </div>

            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs">
              <span className="text-emerald-700 dark:text-emerald-300 block text-[11px] font-medium">
                Elegíveis para Ação
              </span>
              <span className="text-xl font-bold text-emerald-700 dark:text-emerald-300">
                {result.eligibleCount}
              </span>
              <span className="text-[10px] text-emerald-600/80 block mt-0.5">
                Atendem a todos os critérios
              </span>
            </div>

            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
              <span className="text-amber-700 dark:text-amber-300 block text-[11px] font-medium">
                Bloqueados por Regras
              </span>
              <span className="text-xl font-bold text-amber-700 dark:text-amber-300">
                {result.blockedCount}
              </span>
              <span className="text-[10px] text-amber-600/80 block mt-0.5">
                Protegidos contra arquivamento
              </span>
            </div>
          </div>

          {/* Condition parameters */}
          <div className="p-3 rounded-lg border bg-muted/20 text-xs space-y-1.5">
            <span className="font-semibold text-foreground">Critérios configurados na regra:</span>
            <div className="flex flex-wrap gap-1.5 text-[11px]">
              <Badge variant="outline">Tempo mínimo: +{automation.time_limit_hours} horas</Badge>
              {automation.conditions?.require_unpaid && (
                <Badge variant="outline">Apenas não pagos</Badge>
              )}
              {automation.conditions?.block_with_open_ticket && (
                <Badge variant="outline">Bloquear se houver ocorrência</Badge>
              )}
              {automation.conditions?.block_with_shipping_label && (
                <Badge variant="outline">Bloquear se houver etiqueta/envio</Badge>
              )}
            </div>
          </div>

          {/* Tabs for detailed breakdown */}
          <Tabs defaultValue="eligible" className="w-full">
            <TabsList className="h-8">
              <TabsTrigger value="eligible" className="text-xs h-7">
                Elegíveis ({result.eligibleCount})
              </TabsTrigger>
              <TabsTrigger value="blocked" className="text-xs h-7">
                Bloqueados ({result.blockedCount})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="eligible" className="mt-2">
              {result.eligibleOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg">
                  Nenhum pedido atende simultaneamente aos critérios desta automação no momento.
                </div>
              ) : (
                <div className="border rounded-lg max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="py-2">Pedido</TableHead>
                        <TableHead className="py-2">Cliente</TableHead>
                        <TableHead className="py-2">Canal</TableHead>
                        <TableHead className="py-2">Permanência</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.eligibleOrders.map((o) => (
                        <TableRow key={o.id} className="text-xs">
                          <TableCell className="font-semibold py-2">#{o.order_number}</TableCell>
                          <TableCell className="py-2">{o.customer_name}</TableCell>
                          <TableCell className="py-2">{o.channel_label}</TableCell>
                          <TableCell className="py-2 text-muted-foreground">
                            {o.time_in_stage_display || "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="blocked" className="mt-2">
              {result.blockedOrders.length === 0 ? (
                <div className="p-6 text-center text-xs text-muted-foreground border rounded-lg">
                  Nenhum pedido foi bloqueado.
                </div>
              ) : (
                <div className="border rounded-lg max-h-56 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="text-xs">
                        <TableHead className="py-2">Pedido</TableHead>
                        <TableHead className="py-2">Cliente</TableHead>
                        <TableHead className="py-2">Motivo do Bloqueio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {result.blockedOrders.map(({ order, reasons }) => (
                        <TableRow key={order.id} className="text-xs">
                          <TableCell className="font-semibold py-2">
                            #{order.order_number}
                          </TableCell>
                          <TableCell className="py-2">{order.customer_name}</TableCell>
                          <TableCell className="py-2 text-destructive font-medium">
                            {reasons.join(" • ")}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 pt-2 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isExecuting}>
            Fechar Simulação
          </Button>

          {result.eligibleCount > 0 && (
            <Button
              variant="default"
              size="sm"
              onClick={handleExecuteNow}
              disabled={isExecuting}
              className="gap-1.5 bg-amber-600 hover:bg-amber-700 text-white"
            >
              {isExecuting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Play className="w-4 h-4" />
              )}
              Executar Regra Agora ({result.eligibleCount} pedidos)
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
