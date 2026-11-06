import React, { useState, useEffect } from "react";
import {
  OrderPipelineItem,
  OrderPipelineAutomation,
  OrderPipelineAutomationLog,
  OrderPipelineWebhook,
  OrderSortDirection,
  OrderAgeCriteria,
} from "@/types/orderPipeline";
import { orderAutomationService } from "@/services/orderAutomationService";
import { restoreOrder, ARCHIVE_REASONS } from "@/services/orderArchivingService";
import { useOrderPreferences } from "@/hooks/useOrderPreferences";
import { AutomationSimulationDialog } from "../AutomationSimulationDialog";
import { OrderPipelinesSettings } from "@/components/admin/OrderPipelinesSettings";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Sparkles,
  Archive,
  Layers,
  Webhook,
  Settings2,
  Play,
  RotateCcw,
  Search,
  Plus,
  Trash2,
  Clock,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  History,
  Send,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface OrdersSettingsSubpageProps {
  orders: OrderPipelineItem[];
  onRefreshOrders?: () => void;
}

export const OrdersSettingsSubpage: React.FC<OrdersSettingsSubpageProps> = ({
  orders,
  onRefreshOrders,
}) => {
  const { preferences, updatePreferences } = useOrderPreferences();

  // Settings Sub-tabs
  const [activeTab, setActiveTab] = useState("automations");

  // Automations state
  const [automations, setAutomations] = useState<OrderPipelineAutomation[]>([]);
  const [automationLogs, setAutomationLogs] = useState<OrderPipelineAutomationLog[]>([]);
  const [selectedSimAutomation, setSelectedSimAutomation] =
    useState<OrderPipelineAutomation | null>(null);
  const [isSimOpen, setIsSimOpen] = useState(false);
  const [isSyncingLabels, setIsSyncingLabels] = useState(false);

  // New Rule Modal
  const [isNewRuleOpen, setIsNewRuleOpen] = useState(false);
  const [newRuleName, setNewRuleName] = useState("");
  const [newRuleStage, setNewRuleStage] = useState("pendente");
  const [newRuleHours, setNewRuleHours] = useState("24");
  const [newRuleAction, setNewRuleAction] = useState<"archive" | "notify" | "webhook">("archive");
  const [newRuleUnpaidOnly, setNewRuleUnpaidOnly] = useState(true);

  // Webhooks state
  const [webhooks, setWebhooks] = useState<OrderPipelineWebhook[]>([]);
  const [isNewWebhookOpen, setIsNewWebhookOpen] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");

  // Archived orders table state
  const [archivedSearch, setArchivedSearch] = useState("");
  const [archivedReasonFilter, setArchivedReasonFilter] = useState("all");
  const [archivedTypeFilter, setArchivedTypeFilter] = useState("all");
  const [restoringOrderId, setRestoringOrderId] = useState<string | null>(null);

  useEffect(() => {
    loadAutomationsData();
    loadWebhooksData();
  }, []);

  const loadAutomationsData = async () => {
    const list = await orderAutomationService.getAutomations();
    setAutomations(list);
    const logs = await orderAutomationService.getLogs();
    setAutomationLogs(logs);
  };

  const loadWebhooksData = async () => {
    const list = await orderAutomationService.getWebhooks();
    setWebhooks(list);
  };

  const handleToggleAutomation = async (id: string, current: boolean) => {
    await orderAutomationService.toggleAutomation(id, !current);
    toast.success(`Automação ${!current ? "ativada" : "desativada"} com sucesso.`);
    loadAutomationsData();
  };

  const handleSyncLabels = async () => {
    setIsSyncingLabels(true);
    try {
      toast.info("Iniciando varredura de etiquetas pendentes no Mercado Livre...");
      const { data, error } = await supabase.functions.invoke("ml-order-webhook", {
        body: { action: "sync_pending_labels" },
      });
      if (error) throw error;
      if (data?.success) {
        toast.success(
          `Sincronização concluída: ${data.updated_count ?? 0} etiqueta(s) vinculada(s) de ${data.processed ?? 0} pedido(s) analisado(s).`
        );
        onRefreshOrders?.();
      } else {
        toast.warning(data?.message || "Nenhuma etiqueta atualizada no momento.");
      }
    } catch (err: any) {
      console.error("Erro ao sincronizar etiquetas ML:", err);
      toast.error("Erro ao sincronizar etiquetas: " + (err?.message || "Tente novamente"));
    } finally {
      setIsSyncingLabels(false);
    }
  };

  const handleCreateRule = async () => {
    if (!newRuleName.trim()) {
      toast.error("Informe o nome da regra.");
      return;
    }

    await orderAutomationService.saveAutomation({
      name: newRuleName,
      stage_key: newRuleStage,
      time_limit_hours: Number(newRuleHours) || 24,
      action_type: newRuleAction,
      conditions: {
        require_unpaid: newRuleUnpaidOnly,
        block_with_open_ticket: true,
        block_with_shipping_label: true,
      },
      is_active: false,
    });

    toast.success("Nova regra de automação criada (iniciada como desativada).");
    setIsNewRuleOpen(false);
    setNewRuleName("");
    loadAutomationsData();
  };

  const handleDeleteRule = async (id: string) => {
    await orderAutomationService.deleteAutomation(id);
    toast.success("Regra removida.");
    loadAutomationsData();
  };

  const handleCreateWebhook = async () => {
    if (!newWebhookName.trim() || !newWebhookUrl.trim()) {
      toast.error("Preencha nome e URL do webhook.");
      return;
    }

    await orderAutomationService.saveWebhook({
      name: newWebhookName,
      url: newWebhookUrl,
      events: ["order.archived", "order.stage_changed", "order.restored"],
    });

    toast.success("Webhook configurado com sucesso.");
    setIsNewWebhookOpen(false);
    setNewWebhookName("");
    setNewWebhookUrl("");
    loadWebhooksData();
  };

  const handleDeleteWebhook = async (id: string) => {
    await orderAutomationService.deleteWebhook(id);
    toast.success("Webhook removido.");
    loadWebhooksData();
  };

  const handleRestore = async (orderId: string, currentStatus?: string) => {
    try {
      setRestoringOrderId(orderId);
      const res = await restoreOrder(orderId, currentStatus || "pendente");
      if (!res.success) {
        toast.error(res.error || "Erro ao restaurar pedido.");
        return;
      }
      toast.success("Pedido restaurado para a esteira operacional.");
      onRefreshOrders?.();
    } catch {
      toast.error("Erro ao restaurar pedido.");
    } finally {
      setRestoringOrderId(null);
    }
  };

  // Filtered archived orders
  const archivedOrders = orders.filter((o) => {
    if (!o.is_archived) return false;

    if (archivedSearch.trim()) {
      const term = archivedSearch.toLowerCase();
      const matchNum = o.order_number.toLowerCase().includes(term);
      const matchCust = o.customer_name.toLowerCase().includes(term);
      const matchReason = (o.archived_reason || "").toLowerCase().includes(term);
      if (!matchNum && !matchCust && !matchReason) return false;
    }

    if (archivedReasonFilter !== "all" && o.archived_reason !== archivedReasonFilter) {
      return false;
    }

    if (archivedTypeFilter !== "all" && o.archived_type !== archivedTypeFilter) {
      return false;
    }

    return true;
  });

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-4 p-1 pr-2 pb-6">
      {/* Internal Navigation for Settings */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full space-y-4">
        <div className="flex items-center justify-between border-b pb-2">
          <TabsList className="h-9">
            <TabsTrigger value="automations" className="text-xs h-7 gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              Automações & Regras
            </TabsTrigger>
            <TabsTrigger value="archived" className="text-xs h-7 gap-1.5">
              <Archive className="w-3.5 h-3.5 text-slate-500" />
              Gestão de Arquivados ({orders.filter((o) => o.is_archived).length})
            </TabsTrigger>
            <TabsTrigger value="pipelines" className="text-xs h-7 gap-1.5">
              <Layers className="w-3.5 h-3.5 text-blue-500" />
              Pipelines & Etapas
            </TabsTrigger>
            <TabsTrigger value="webhooks" className="text-xs h-7 gap-1.5">
              <Webhook className="w-3.5 h-3.5 text-indigo-500" />
              Webhooks
            </TabsTrigger>
            <TabsTrigger value="preferences" className="text-xs h-7 gap-1.5">
              <Settings2 className="w-3.5 h-3.5 text-foreground" />
              Preferências de Ordenação
            </TabsTrigger>
          </TabsList>
        </div>

        {/* ── 1. AUTOMAÇÕES & REGRAS ─────────────────────────────────── */}
        <TabsContent value="automations" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Automações do Pipeline de Pedidos</h2>
              <p className="text-xs text-muted-foreground">
                Configure regras para identificar pedidos sem movimentação (ex: +24h), arquivar e notificar.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsNewRuleOpen(true)} className="gap-1.5 text-xs h-8">
              <Plus className="w-3.5 h-3.5" />
              Nova Regra
            </Button>
          </div>

          {/* Rotina Automática de Etiquetas ML */}
          <Card className="shadow-2xs border bg-linear-to-r from-blue-50/50 to-indigo-50/30 dark:from-blue-950/20 dark:to-indigo-950/20 border-blue-200/60 dark:border-blue-800/40">
            <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h3 className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                    Sincronização Periódica de Etiquetas (Mercado Livre)
                  </h3>
                  <Badge className="bg-emerald-600 hover:bg-emerald-600 text-[10px]">
                    Ativo (De hora em hora)
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground">
                  Varredura de hora em hora via rotina em segundo plano no Mercado Livre. Quando a etiqueta for liberada pela transportadora (<code>ready_to_print</code>), o PDF é baixado para o sistema e os pedidos com Pix pago são avançados automaticamente para a fila de expedição.
                </p>
                <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                  <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Clientes podem pagar o Pix do pedido imediatamente mesmo antes do Mercado Livre emitir a etiqueta.
                  </span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                disabled={isSyncingLabels}
                onClick={handleSyncLabels}
                className="h-8 text-xs gap-1.5 border-blue-500/30 text-blue-700 dark:text-blue-300 hover:bg-blue-500/10 shrink-0"
              >
                {isSyncingLabels ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                Verificar Etiquetas Agora
              </Button>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 gap-3">
            {automations.map((auto) => (
              <Card key={auto.id} className="shadow-2xs border">
                <CardContent className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-foreground">{auto.name}</h3>
                      <Badge
                        variant={auto.is_active ? "default" : "secondary"}
                        className={
                          auto.is_active
                            ? "bg-emerald-600 hover:bg-emerald-600 text-[10px]"
                            : "text-[10px]"
                        }
                      >
                        {auto.is_active ? "Ativa" : "Desativada"}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        +{auto.time_limit_hours}h na etapa "{auto.stage_key}"
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">{auto.description}</p>
                    <div className="flex items-center gap-2 pt-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                        Proteções obrigatórias: pagos, etiquetas e ocorrências são protegidos
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 text-xs gap-1 border-amber-500/30 text-amber-700 hover:bg-amber-500/10"
                      onClick={() => {
                        setSelectedSimAutomation(auto);
                        setIsSimOpen(true);
                      }}
                    >
                      <Play className="w-3 h-3 text-amber-600" />
                      Simular Regra
                    </Button>

                    <div className="flex items-center gap-1.5 pl-2 border-l">
                      <Switch
                        checked={auto.is_active}
                        onCheckedChange={() => handleToggleAutomation(auto.id, auto.is_active)}
                      />
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteRule(auto.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Audit Logs Table */}
          <Card className="shadow-2xs border mt-6">
            <CardHeader className="px-4 py-3 border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5">
                    <History className="w-3.5 h-3.5 text-primary" />
                    Histórico de Execuções e Auditoria
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Registro de todas as ações executadas e bloqueadas pelo motor de automações
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2.5">Data/Hora</TableHead>
                    <TableHead className="py-2.5">Pedido</TableHead>
                    <TableHead className="py-2.5">Ação Realizada</TableHead>
                    <TableHead className="py-2.5">Status</TableHead>
                    <TableHead className="py-2.5">Observação / Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {automationLogs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-muted-foreground">
                        Nenhuma execução registrada até o momento.
                      </TableCell>
                    </TableRow>
                  ) : (
                    automationLogs.slice(0, 10).map((log) => (
                      <TableRow key={log.id} className="text-xs">
                        <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                          {format(new Date(log.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell className="py-2 font-semibold">#{log.order_number}</TableCell>
                        <TableCell className="py-2">{log.action_taken}</TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={
                              log.status === "success"
                                ? "default"
                                : log.status === "blocked"
                                ? "secondary"
                                : "destructive"
                            }
                            className="text-[10px] px-1.5 py-0"
                          >
                            {log.status === "success"
                              ? "Executado"
                              : log.status === "blocked"
                              ? "Bloqueado"
                              : "Falhou"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground truncate max-w-[240px]">
                          {log.reason || "—"}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 2. GESTÃO DE ARQUIVADOS ───────────────────────────────── */}
        <TabsContent value="archived" className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-foreground">Gestão de Pedidos Arquivados</h2>
              <p className="text-xs text-muted-foreground">
                Consulte, filtre e restaure pedidos retirados da esteira operacional.
              </p>
            </div>
            <Badge variant="outline" className="w-fit text-xs">
              {archivedOrders.length} pedido(s) arquivado(s)
            </Badge>
          </div>

          {/* Filters Bar */}
          <div className="flex flex-wrap items-center gap-2 p-2.5 rounded-lg border bg-card">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Buscar por #pedido, cliente ou motivo..."
                value={archivedSearch}
                onChange={(e) => setArchivedSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>

            <Select value={archivedTypeFilter} onValueChange={setArchivedTypeFilter}>
              <SelectTrigger className="w-[140px] h-8 text-xs">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os tipos</SelectItem>
                <SelectItem value="manual" className="text-xs">Manual</SelectItem>
                <SelectItem value="auto" className="text-xs">Automático</SelectItem>
              </SelectContent>
            </Select>

            <Select value={archivedReasonFilter} onValueChange={setArchivedReasonFilter}>
              <SelectTrigger className="w-[180px] h-8 text-xs">
                <SelectValue placeholder="Motivo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">Todos os motivos</SelectItem>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {(archivedSearch || archivedTypeFilter !== "all" || archivedReasonFilter !== "all") && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setArchivedSearch("");
                  setArchivedTypeFilter("all");
                  setArchivedReasonFilter("all");
                }}
              >
                Limpar
              </Button>
            )}
          </div>

          {/* Archived Table */}
          <Card className="shadow-2xs border">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="text-xs">
                    <TableHead className="py-2.5">Pedido</TableHead>
                    <TableHead className="py-2.5">Cliente</TableHead>
                    <TableHead className="py-2.5">Canal</TableHead>
                    <TableHead className="py-2.5">Valor</TableHead>
                    <TableHead className="py-2.5">Data do Arquivo</TableHead>
                    <TableHead className="py-2.5">Tipo</TableHead>
                    <TableHead className="py-2.5">Motivo</TableHead>
                    <TableHead className="py-2.5 text-right">Ação</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {archivedOrders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-8 text-xs text-muted-foreground">
                        Nenhum pedido arquivado encontrado com os filtros aplicados.
                      </TableCell>
                    </TableRow>
                  ) : (
                    archivedOrders.map((o) => (
                      <TableRow key={o.id} className="text-xs">
                        <TableCell className="py-2 font-bold">#{o.order_number}</TableCell>
                        <TableCell className="py-2">{o.customer_name}</TableCell>
                        <TableCell className="py-2">
                          <Badge variant="outline" className="text-[10px]">
                            {o.channel_label}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2">
                          {new Intl.NumberFormat("pt-BR", {
                            style: "currency",
                            currency: "BRL",
                          }).format(o.total_amount)}
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                          {o.archived_at
                            ? format(new Date(o.archived_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                            : "—"}
                        </TableCell>
                        <TableCell className="py-2">
                          <Badge
                            variant={o.archived_type === "auto" ? "secondary" : "outline"}
                            className="text-[10px]"
                          >
                            {o.archived_type === "auto" ? "Automático" : "Manual"}
                          </Badge>
                        </TableCell>
                        <TableCell className="py-2 text-muted-foreground max-w-[200px] truncate" title={o.archived_reason || ""}>
                          {o.archived_reason || "Não especificado"}
                        </TableCell>
                        <TableCell className="py-2 text-right">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 text-xs gap-1 border-primary/30 text-primary hover:bg-primary/10"
                            onClick={() => handleRestore(o.id, o.status)}
                            disabled={restoringOrderId === o.id}
                          >
                            <RotateCcw className="w-3 h-3" />
                            Restaurar
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── 3. PIPELINES & ETAPAS ─────────────────────────────────── */}
        <TabsContent value="pipelines">
          <OrderPipelinesSettings />
        </TabsContent>

        {/* ── 4. WEBHOOKS ───────────────────────────────────────────── */}
        <TabsContent value="webhooks" className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-foreground">Webhooks do Pipeline</h2>
              <p className="text-xs text-muted-foreground">
                Envie notificações HTTP automáticas quando pedidos forem arquivados, mudarem de etapa ou forem restaurados.
              </p>
            </div>
            <Button size="sm" onClick={() => setIsNewWebhookOpen(true)} className="gap-1.5 text-xs h-8">
              <Plus className="w-3.5 h-3.5" />
              Novo Webhook
            </Button>
          </div>

          <div className="grid grid-cols-1 gap-3">
            {webhooks.length === 0 ? (
              <Card className="border border-dashed p-6 text-center text-xs text-muted-foreground">
                Nenhum webhook configurado.
              </Card>
            ) : (
              webhooks.map((hook) => (
                <Card key={hook.id} className="shadow-2xs border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-foreground">{hook.name}</span>
                        <Badge variant="outline" className="text-[10px]">
                          {hook.events.join(", ")}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">{hook.url}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => toast.success("Evento de teste enviado com sucesso.")}
                      >
                        <Send className="w-3.5 h-3.5 mr-1" />
                        Testar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDeleteWebhook(hook.id)}
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        {/* ── 5. PREFERÊNCIAS DE ORDENAÇÃO ─────────────────────────── */}
        <TabsContent value="preferences" className="space-y-4">
          <Card className="shadow-2xs border">
            <CardHeader className="px-4 py-3 border-b">
              <CardTitle className="text-sm font-bold">Ordenação e Visualização do Kanban</CardTitle>
              <CardDescription className="text-xs">
                Defina como os cartões devem ser ordenados dentro de cada coluna do pipeline
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4 space-y-4 max-w-xl">
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Critério de Ordenação das Colunas</Label>
                <Select
                  value={preferences.sort_direction}
                  onValueChange={(val: OrderSortDirection) =>
                    updatePreferences({ sort_direction: val })
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oldest_first" className="text-xs font-medium">
                      Mais antigos primeiro (Padrão Operacional Lojafy)
                    </SelectItem>
                    <SelectItem value="newest_first" className="text-xs">
                      Mais recentes primeiro
                    </SelectItem>
                    <SelectItem value="longest_time_in_stage" className="text-xs">
                      Maior tempo na etapa primeiro
                    </SelectItem>
                    <SelectItem value="shortest_time_in_stage" className="text-xs">
                      Menor tempo na etapa primeiro
                    </SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Garante que o operador sempre veja os pedidos pendentes mais antigos no topo da fila.
                </p>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-semibold">Critério de Antiguidade</Label>
                <Select
                  value={preferences.age_criteria}
                  onValueChange={(val: OrderAgeCriteria) =>
                    updatePreferences({ age_criteria: val })
                  }
                >
                  <SelectTrigger className="text-xs h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="created_at" className="text-xs">
                      Data de criação do pedido
                    </SelectItem>
                    <SelectItem value="stage_entered_at" className="text-xs">
                      Momento de entrada na etapa atual
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="pt-2">
                <Button
                  size="sm"
                  onClick={() => toast.success("Preferências de visualização salvas com sucesso.")}
                  className="text-xs"
                >
                  Salvar Preferências
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Simulation Dialog */}
      <AutomationSimulationDialog
        automation={selectedSimAutomation}
        orders={orders}
        isOpen={isSimOpen}
        onClose={() => {
          setIsSimOpen(false);
          setSelectedSimAutomation(null);
        }}
        onExecuted={() => {
          onRefreshOrders?.();
          loadAutomationsData();
        }}
      />

      {/* New Rule Modal */}
      <Dialog open={isNewRuleOpen} onOpenChange={setIsNewRuleOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500" />
              Criar Regra de Automação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Define condições automáticas para tratamento de inatividade em etapas.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome da Regra</Label>
              <Input
                placeholder="Ex: Arquivar pedidos sem pagamento após 24h"
                value={newRuleName}
                onChange={(e) => setNewRuleName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Etapa Alvo</Label>
                <Select value={newRuleStage} onValueChange={setNewRuleStage}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente" className="text-xs">Novo Pedido</SelectItem>
                    <SelectItem value="pago" className="text-xs">Pedido Pago</SelectItem>
                    <SelectItem value="recebido" className="text-xs">Recebido</SelectItem>
                    <SelectItem value="embalado" className="text-xs">Embalado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Tempo Limite (Horas)</Label>
                <Input
                  type="number"
                  value={newRuleHours}
                  onChange={(e) => setNewRuleHours(e.target.value)}
                  className="h-8 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Ação a Executar</Label>
              <Select value={newRuleAction} onValueChange={(v: any) => setNewRuleAction(v)}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="archive" className="text-xs">Arquivar Pedido</SelectItem>
                  <SelectItem value="notify" className="text-xs">Emitir Notificação</SelectItem>
                  <SelectItem value="webhook" className="text-xs">Disparar Webhook</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t">
              <Switch
                id="unpaid-rule"
                checked={newRuleUnpaidOnly}
                onCheckedChange={setNewRuleUnpaidOnly}
              />
              <Label htmlFor="unpaid-rule" className="text-xs cursor-pointer">
                Exigir que pedido não esteja pago
              </Label>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewRuleOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateRule}>
              Criar Regra
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Webhook Modal */}
      <Dialog open={isNewWebhookOpen} onOpenChange={setIsNewWebhookOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-bold flex items-center gap-2">
              <Webhook className="w-4 h-4 text-indigo-500" />
              Configurar Novo Webhook
            </DialogTitle>
            <DialogDescription className="text-xs">
              Informe a URL do endpoint HTTP que receberá o payload JSON dos eventos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Nome Identificador</Label>
              <Input
                placeholder="Ex: ERP Integrado / CRM"
                value={newWebhookName}
                onChange={(e) => setNewWebhookName(e.target.value)}
                className="h-8 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">URL de Destino (HTTPS)</Label>
              <Input
                placeholder="https://seu-sistema.com/webhooks/pedidos"
                value={newWebhookUrl}
                onChange={(e) => setNewWebhookUrl(e.target.value)}
                className="h-8 text-xs font-mono"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" size="sm" onClick={() => setIsNewWebhookOpen(false)}>
              Cancelar
            </Button>
            <Button size="sm" onClick={handleCreateWebhook}>
              Salvar Webhook
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
