import { supabase } from "@/integrations/supabase/client";
import {
  OrderPipelineItem,
  OrderPipelineAutomation,
  OrderPipelineAutomationLog,
  OrderPipelineWebhook,
  AutomationSimulationResult,
} from "@/types/orderPipeline";
import { archiveOrder } from "./orderArchivingService";

const LOCAL_STORAGE_AUTOMATIONS_KEY = "lojafy_pipeline_automations_v1";
const LOCAL_STORAGE_LOGS_KEY = "lojafy_pipeline_automation_logs_v1";
const LOCAL_STORAGE_WEBHOOKS_KEY = "lojafy_pipeline_webhooks_v1";

const DEFAULT_AUTOMATIONS: OrderPipelineAutomation[] = [
  {
    id: "auto-24h-pendente",
    name: "Arquivar pedidos sem pagamento há mais de 24 horas",
    description:
      "Identifica pedidos parados na etapa inicial que não foram pagos nem possuem solicitação aberta.",
    pipeline_key: "primary",
    stage_key: "pendente",
    event_type: "stage_inactivity",
    time_limit_hours: 24,
    action_type: "archive",
    conditions: {
      require_unpaid: true,
      block_with_open_ticket: true,
      block_with_shipping_label: true,
    },
    is_active: false, // Default inactive per specification
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "auto-48h-recebimento",
    name: "Alerta de pedidos aguardando recebimento há mais de 48 horas",
    description: "Notifica pedidos pagos que ainda não foram recebidos pela expedição.",
    pipeline_key: "primary",
    stage_key: "pago",
    event_type: "stage_inactivity",
    time_limit_hours: 48,
    action_type: "notify",
    conditions: {
      require_unpaid: false,
      block_with_open_ticket: true,
      block_with_shipping_label: false,
    },
    is_active: false,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const orderAutomationService = {
  // ── 1. AUTOMATIONS CRUD ───────────────────────────────────────────
  async getAutomations(): Promise<OrderPipelineAutomation[]> {
    try {
      const { data, error } = await supabase
        .from("order_pipeline_automations" as any)
        .select("*")
        .order("created_at", { ascending: true });

      if (error || !data || data.length === 0) {
        return this.getLocalAutomations();
      }

      return (data as unknown) as OrderPipelineAutomation[];
    } catch {
      return this.getLocalAutomations();
    }
  },

  async saveAutomation(
    automation: Partial<OrderPipelineAutomation>
  ): Promise<OrderPipelineAutomation> {
    const id = automation.id || `auto-${Date.now()}`;
    const now = new Date().toISOString();
    const item: OrderPipelineAutomation = {
      id,
      name: automation.name || "Nova Automação",
      description: automation.description || "",
      pipeline_key: automation.pipeline_key || "primary",
      stage_key: automation.stage_key || "pendente",
      event_type: automation.event_type || "stage_inactivity",
      time_limit_hours: Number(automation.time_limit_hours) || 24,
      action_type: automation.action_type || "archive",
      conditions: automation.conditions || {
        require_unpaid: true,
        block_with_open_ticket: true,
        block_with_shipping_label: true,
      },
      is_active: !!automation.is_active,
      created_at: automation.created_at || now,
      updated_at: now,
    };

    try {
      await supabase.from("order_pipeline_automations" as any).upsert(item as any);
    } catch {
      // ignore
    }

    this.saveLocalAutomation(item);
    return item;
  },

  async toggleAutomation(id: string, is_active: boolean): Promise<void> {
    try {
      await supabase
        .from("order_pipeline_automations" as any)
        .update({ is_active, updated_at: new Date().toISOString() } as any)
        .eq("id", id);
    } catch {
      // ignore
    }

    const local = this.getLocalAutomations();
    const updated = local.map((a) => (a.id === id ? { ...a, is_active } : a));
    this.saveAllLocalAutomations(updated);
  },

  async deleteAutomation(id: string): Promise<void> {
    try {
      await supabase
        .from("order_pipeline_automations" as any)
        .delete()
        .eq("id", id);
    } catch {
      // ignore
    }

    const local = this.getLocalAutomations();
    this.saveAllLocalAutomations(local.filter((a) => a.id !== id));
  },

  // ── 2. RULE SIMULATION ENGINE ─────────────────────────────────────
  simulate(
    automation: OrderPipelineAutomation,
    orders: OrderPipelineItem[]
  ): AutomationSimulationResult {
    const activeOrders = orders.filter((o) => !o.is_archived);
    const now = Date.now();
    const limitMs = (automation.time_limit_hours || 24) * 60 * 60 * 1000;

    const eligibleOrders: OrderPipelineItem[] = [];
    const blockedOrders: Array<{ order: OrderPipelineItem; reasons: string[] }> = [];

    // Filter by matching stage
    const targetStageKey = (automation.stage_key || "").toLowerCase();
    const stageOrders = activeOrders.filter((order) => {
      const st = (order.status || "").toLowerCase();
      if (st === targetStageKey) return true;
      if (targetStageKey === "pendente" && (st.includes("pagamento") || st.includes("gerado"))) return true;
      if (targetStageKey === "pago" && (st.includes("recebimento") || st.includes("pago"))) return true;
      return false;
    });

    stageOrders.forEach((order) => {
      const reasons: string[] = [];

      // Check time limit
      const orderDate = new Date(order.stage_entered_at || order.created_at).getTime();
      const diffMs = now - orderDate;

      if (diffMs < limitMs) {
        const hoursPassed = Math.round(diffMs / (1000 * 60 * 60));
        reasons.push(`Permaneceu apenas ${hoursPassed}h na etapa (limite é ${automation.time_limit_hours}h)`);
      }

      // Check unpaid condition
      if (automation.conditions?.require_unpaid) {
        const isPaid =
          order.payment_status === "paid" ||
          ["pago", "recebido", "embalado", "enviado", "finalizado"].includes(
            (order.status || "").toLowerCase()
          );
        if (isPaid) {
          reasons.push("Pedido possui pagamento confirmado");
        }
      }

      // Check open ticket condition
      if (automation.conditions?.block_with_open_ticket) {
        if (order.active_ticket_status || order.has_solicitation) {
          reasons.push("Pedido possui ocorrência ou solicitação em aberto");
        }
      }

      // Check shipping file / label condition
      if (automation.conditions?.block_with_shipping_label) {
        if (order.has_shipping_file || order.tracking_number || (order.status || "").toLowerCase() === "enviado") {
          reasons.push("Pedido já possui etiqueta emitida ou envio realizado");
        }
      }

      if (reasons.length === 0) {
        eligibleOrders.push(order);
      } else {
        blockedOrders.push({ order, reasons });
      }
    });

    return {
      totalEvaluated: stageOrders.length,
      eligibleCount: eligibleOrders.length,
      blockedCount: blockedOrders.length,
      eligibleOrders,
      blockedOrders,
    };
  },

  // ── 3. EXECUTION ENGINE ───────────────────────────────────────────
  async executeNow(
    automation: OrderPipelineAutomation,
    orders: OrderPipelineItem[],
    userId?: string
  ): Promise<{ executed: number; blocked: number }> {
    const sim = this.simulate(automation, orders);
    let executed = 0;

    for (const order of sim.eligibleOrders) {
      if (automation.action_type === "archive") {
        const res = await archiveOrder({
          orderId: order.id,
          reason: `Automação: ${automation.name} (+${automation.time_limit_hours}h)`,
          userId,
          type: "auto",
        });

        if (res.success) {
          executed++;
          this.logExecution({
            automation_id: automation.id,
            order_id: order.id,
            order_number: order.order_number,
            action_taken: `Arquivado automaticamente (+${automation.time_limit_hours}h)`,
            status: "success",
            created_at: new Date().toISOString(),
          });
        }
      }
    }

    // Log blocked instances
    for (const blocked of sim.blockedOrders) {
      this.logExecution({
        automation_id: automation.id,
        order_id: blocked.order.id,
        order_number: blocked.order.order_number,
        action_taken: "Tentativa de arquivamento automático",
        status: "blocked",
        reason: blocked.reasons.join(" • "),
        created_at: new Date().toISOString(),
      });
    }

    return { executed, blocked: sim.blockedCount };
  },

  // ── 4. LOGS ───────────────────────────────────────────────────────
  async getLogs(): Promise<OrderPipelineAutomationLog[]> {
    try {
      const { data, error } = await supabase
        .from("order_pipeline_automation_logs" as any)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(100);

      if (error || !data || data.length === 0) {
        return this.getLocalLogs();
      }

      return (data as unknown) as OrderPipelineAutomationLog[];
    } catch {
      return this.getLocalLogs();
    }
  },

  async logExecution(log: Partial<OrderPipelineAutomationLog>): Promise<void> {
    const item: OrderPipelineAutomationLog = {
      id: log.id || `log-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      automation_id: log.automation_id || null,
      order_id: log.order_id || "",
      order_number: log.order_number || "",
      action_taken: log.action_taken || "Ação de automação",
      status: log.status || "success",
      reason: log.reason || null,
      metadata: log.metadata || {},
      created_at: log.created_at || new Date().toISOString(),
    };

    try {
      await supabase.from("order_pipeline_automation_logs" as any).insert(item as any);
    } catch {
      // ignore
    }

    const logs = this.getLocalLogs();
    logs.unshift(item);
    localStorage.setItem(LOCAL_STORAGE_LOGS_KEY, JSON.stringify(logs.slice(0, 100)));
  },

  // ── 5. WEBHOOKS ───────────────────────────────────────────────────
  async getWebhooks(): Promise<OrderPipelineWebhook[]> {
    try {
      const { data, error } = await supabase
        .from("order_pipeline_webhooks" as any)
        .select("*")
        .order("created_at", { ascending: false });

      if (error || !data || data.length === 0) {
        return this.getLocalWebhooks();
      }

      return (data as unknown) as OrderPipelineWebhook[];
    } catch {
      return this.getLocalWebhooks();
    }
  },

  async saveWebhook(webhook: Partial<OrderPipelineWebhook>): Promise<OrderPipelineWebhook> {
    const id = webhook.id || `hook-${Date.now()}`;
    const item: OrderPipelineWebhook = {
      id,
      name: webhook.name || "Novo Webhook",
      url: webhook.url || "",
      secret_token: webhook.secret_token || null,
      events: webhook.events || ["order.archived", "order.stage_changed", "order.restored"],
      is_active: webhook.is_active !== undefined ? webhook.is_active : true,
      created_at: webhook.created_at || new Date().toISOString(),
    };

    try {
      await supabase.from("order_pipeline_webhooks" as any).upsert(item as any);
    } catch {
      // ignore
    }

    const hooks = this.getLocalWebhooks().filter((h) => h.id !== id);
    hooks.unshift(item);
    localStorage.setItem(LOCAL_STORAGE_WEBHOOKS_KEY, JSON.stringify(hooks));
    return item;
  },

  async deleteWebhook(id: string): Promise<void> {
    try {
      await supabase.from("order_pipeline_webhooks" as any).delete().eq("id", id);
    } catch {
      // ignore
    }

    const hooks = this.getLocalWebhooks().filter((h) => h.id !== id);
    localStorage.setItem(LOCAL_STORAGE_WEBHOOKS_KEY, JSON.stringify(hooks));
  },

  // ── LOCAL STORAGE FALLBACKS ────────────────────────────────────────
  getLocalAutomations(): OrderPipelineAutomation[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_AUTOMATIONS_KEY);
      return raw ? JSON.parse(raw) : DEFAULT_AUTOMATIONS;
    } catch {
      return DEFAULT_AUTOMATIONS;
    }
  },

  saveLocalAutomation(item: OrderPipelineAutomation) {
    const current = this.getLocalAutomations().filter((a) => a.id !== item.id);
    current.push(item);
    this.saveAllLocalAutomations(current);
  },

  saveAllLocalAutomations(items: OrderPipelineAutomation[]) {
    try {
      localStorage.setItem(LOCAL_STORAGE_AUTOMATIONS_KEY, JSON.stringify(items));
    } catch {
      // ignore
    }
  },

  getLocalLogs(): OrderPipelineAutomationLog[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_LOGS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },

  getLocalWebhooks(): OrderPipelineWebhook[] {
    try {
      const raw = localStorage.getItem(LOCAL_STORAGE_WEBHOOKS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  },
};
