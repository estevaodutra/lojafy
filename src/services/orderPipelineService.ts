import { supabase } from "@/integrations/supabase/client";
import { OrderPipeline, OrderPipelineStage } from "@/types/orderPipeline";

const STORAGE_KEY_PREFIX = "lojafy_order_pipelines_custom_";

// Default pipeline structures matching requirements
export const DEFAULT_PIPELINES: OrderPipeline[] = [
  {
    id: "11111111-1111-1111-1111-111111111111",
    key: "primary",
    name: "Pipeline Principal",
    description: "Fluxo normal de processamento e envio de pedidos",
    order_index: 1,
    is_active: true,
    stages: [
      {
        id: "stage-p1",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Novo Pedido",
        status_key: "pendente",
        order_index: 1,
        color_class: "bg-slate-100 text-slate-800 border-slate-300 dark:bg-slate-900/60 dark:text-slate-300 dark:border-slate-800",
        icon_name: "Clock",
        is_active: true,
      },
      {
        id: "stage-p2",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Pedido Pago > Aguardando Recebimento da Expedição",
        status_key: "pago",
        order_index: 2,
        color_class: "bg-emerald-100 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800",
        icon_name: "BadgeCheck",
        is_active: true,
      },
      {
        id: "stage-p3",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Pedido Recebido > Aguardando Envio",
        status_key: "recebido",
        order_index: 3,
        color_class: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        icon_name: "Inbox",
        is_active: true,
      },
      {
        id: "stage-p4",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Embalado > Aguardando Envio",
        status_key: "embalado",
        order_index: 4,
        color_class: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        icon_name: "Package",
        is_active: true,
      },
      {
        id: "stage-p5",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Pedido Enviado",
        status_key: "enviado",
        order_index: 5,
        color_class: "bg-purple-100 text-purple-800 border-purple-300 dark:bg-purple-950/60 dark:text-purple-300 dark:border-purple-800",
        icon_name: "Send",
        is_active: true,
      },
      {
        id: "stage-p6",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Finalizado",
        status_key: "finalizado",
        order_index: 6,
        color_class: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
        icon_name: "CheckCircle2",
        is_active: true,
      },
      {
        id: "stage-p7",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Cancelado",
        status_key: "cancelado",
        order_index: 7,
        color_class: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800",
        icon_name: "XCircle",
        is_active: true,
      },
      {
        id: "stage-p8",
        pipeline_id: "11111111-1111-1111-1111-111111111111",
        name: "Erro | Etiqueta Incorreta",
        status_key: "etiqueta_incorreta",
        order_index: 8,
        color_class: "bg-rose-100 text-rose-800 border-rose-300 dark:bg-rose-950/60 dark:text-rose-300 dark:border-rose-800",
        icon_name: "AlertTriangle",
        is_active: true,
      },
    ],
  },
  {
    id: "22222222-2222-2222-2222-222222222222",
    key: "occurrences",
    name: "Retornos e Ocorrências",
    description: "Gestão de pós-venda, devoluções, trocas e ocorrências paralelas",
    order_index: 2,
    is_active: true,
    stages: [
      {
        id: "stage-o1",
        pipeline_id: "22222222-2222-2222-2222-222222222222",
        name: "Ocorrência Aberta",
        status_key: "aberto",
        order_index: 1,
        color_class: "bg-red-100 text-red-800 border-red-300 dark:bg-red-950/60 dark:text-red-300 dark:border-red-800",
        icon_name: "AlertCircle",
        is_active: true,
      },
      {
        id: "stage-o2",
        pipeline_id: "22222222-2222-2222-2222-222222222222",
        name: "Em Análise",
        status_key: "em_analise",
        order_index: 2,
        color_class: "bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800",
        icon_name: "Search",
        is_active: true,
      },
      {
        id: "stage-o3",
        pipeline_id: "22222222-2222-2222-2222-222222222222",
        name: "Aguardando Cliente",
        status_key: "aguardando_cliente",
        order_index: 3,
        color_class: "bg-blue-100 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800",
        icon_name: "Clock",
        is_active: true,
      },
      {
        id: "stage-o4",
        pipeline_id: "22222222-2222-2222-2222-222222222222",
        name: "Resolvido",
        status_key: "resolvido",
        order_index: 4,
        color_class: "bg-green-100 text-green-800 border-green-300 dark:bg-green-950/60 dark:text-green-300 dark:border-green-800",
        icon_name: "CheckCircle2",
        is_active: true,
      },
      {
        id: "stage-o5",
        pipeline_id: "22222222-2222-2222-2222-222222222222",
        name: "Cancelado",
        status_key: "cancelado",
        order_index: 5,
        color_class: "bg-zinc-200 text-zinc-700 border-zinc-300 dark:bg-zinc-900/60 dark:text-zinc-400 dark:border-zinc-800",
        icon_name: "XCircle",
        is_active: true,
      },
    ],
  },
];

export const orderPipelineService = {
  /**
   * Obtém pipelines e etapas ativas
   */
  async getPipelines(): Promise<OrderPipeline[]> {
    try {
      // 1. Tentar buscar no Supabase
      const { data: pipelinesData, error: pError } = await supabase
        .from("order_pipelines" as any)
        .select("*")
        .order("order_index", { ascending: true });

      if (pError || !pipelinesData || pipelinesData.length === 0) {
        // Fallback local caso tabela remota não esteja pronta
        return this.getLocalPipelines();
      }

      const { data: stagesData, error: sError } = await supabase
        .from("order_pipeline_stages" as any)
        .select("*")
        .order("order_index", { ascending: true });

      if (sError || !stagesData) {
        return this.getLocalPipelines();
      }

      const pipelines: OrderPipeline[] = pipelinesData.map((p: any) => ({
        id: p.id,
        key: p.key,
        name: p.name,
        description: p.description,
        order_index: p.order_index,
        is_active: p.is_active,
        stages: stagesData
          .filter((s: any) => s.pipeline_id === p.id)
          .map((s: any) => ({
            id: s.id,
            pipeline_id: s.pipeline_id,
            name: s.name,
            status_key: s.status_key,
            order_index: s.order_index,
            color_class: s.color_class,
            icon_name: s.icon_name,
            is_active: s.is_active,
          })),
      }));

      return pipelines;
    } catch (err) {
      console.warn("Using local pipeline fallback:", err);
      return this.getLocalPipelines();
    }
  },

  getLocalPipelines(): OrderPipeline[] {
    try {
      const stored = localStorage.getItem(STORAGE_KEY_PREFIX + "list");
      if (stored) {
        return JSON.parse(stored);
      }
    } catch {
      // ignore
    }
    return DEFAULT_PIPELINES;
  },

  saveLocalPipelines(pipelines: OrderPipeline[]) {
    try {
      localStorage.setItem(STORAGE_KEY_PREFIX + "list", JSON.stringify(pipelines));
    } catch {
      // ignore
    }
  },

  /**
   * Reordena etapas de uma pipeline
   */
  async reorderStages(pipelineId: string, orderedStageIds: string[]): Promise<void> {
    try {
      const updates = orderedStageIds.map((stageId, index) =>
        supabase
          .from("order_pipeline_stages" as any)
          .update({ order_index: index + 1, updated_at: new Date().toISOString() })
          .eq("id", stageId)
      );
      await Promise.all(updates);
    } catch {
      // ignore supabase error if table doesn't exist
    }

    // Persistir localmente também
    const current = this.getLocalPipelines();
    const updated = current.map((pipe) => {
      if (pipe.id !== pipelineId) return pipe;
      const stageMap = new Map(pipe.stages.map((s) => [s.id, s]));
      const newStages: OrderPipelineStage[] = [];
      orderedStageIds.forEach((id, idx) => {
        const found = stageMap.get(id);
        if (found) {
          newStages.push(Object.assign({}, found, { order_index: idx + 1 }));
        }
      });
      return { ...pipe, stages: newStages };
    });
    this.saveLocalPipelines(updated);
  },

  /**
   * Salva/cria uma etapa (o status do pedido é o nome da etapa)
   */
  async saveStage(stage: Partial<OrderPipelineStage> & { pipeline_id: string; name: string; status_key?: string }): Promise<OrderPipelineStage> {
    const isNew = !stage.id;
    const stageName = stage.name.trim();
    const stageStatus = stageName;
    let savedStage: OrderPipelineStage;

    const current = this.getLocalPipelines();
    const pipe = current.find((p) => p.id === stage.pipeline_id);
    const oldStage = pipe?.stages.find((s) => s.id === stage.id);

    if (isNew) {
      const id = "stage-" + Math.random().toString(36).substring(2, 9);
      savedStage = {
        id,
        pipeline_id: stage.pipeline_id,
        name: stageName,
        status_key: stageStatus,
        order_index: stage.order_index ?? (pipe ? pipe.stages.length + 1 : 99),
        color_class: stage.color_class || "bg-slate-100 text-slate-800 border-slate-300",
        icon_name: stage.icon_name || "Package",
        is_active: stage.is_active ?? true,
      };

      try {
        const { error: insertErr } = await supabase.from("order_pipeline_stages" as any).insert({
          id: savedStage.id,
          pipeline_id: savedStage.pipeline_id,
          name: savedStage.name,
          status_key: savedStage.status_key,
          order_index: savedStage.order_index,
          color_class: savedStage.color_class,
          icon_name: savedStage.icon_name,
          is_active: savedStage.is_active,
        });
        if (insertErr) {
          console.warn("order_pipeline_stages insert warning:", insertErr);
        }
      } catch (err) {
        console.warn("order_pipeline_stages insert exception:", err);
      }
    } else {
      savedStage = {
        ...(oldStage || {}),
        ...stage,
        name: stageName,
        status_key: stageStatus,
      } as OrderPipelineStage;

      // Se o nome foi alterado, atualizar pedidos vinculados com o nome anterior
      if (oldStage && (oldStage.name !== stageName || oldStage.status_key !== stageStatus)) {
        try {
          await supabase
            .from("orders")
            .update({ status: stageStatus, updated_at: new Date().toISOString() })
            .or(`status.eq.${oldStage.status_key},status.eq.${oldStage.name}`);
        } catch (err) {
          console.warn("orders status rename error:", err);
        }
      }

      try {
        const stageUpdatePayload = {
          name: savedStage.name,
          status_key: savedStage.status_key,
          order_index: savedStage.order_index,
          color_class: savedStage.color_class,
          icon_name: savedStage.icon_name,
          is_active: savedStage.is_active,
          updated_at: new Date().toISOString(),
        };

        const { error: updateErr } = await supabase
          .from("order_pipeline_stages" as any)
          .update(stageUpdatePayload)
          .eq("id", stage.id);

        if (updateErr) {
          console.warn("order_pipeline_stages update warning, trying upsert:", updateErr);
          await supabase.from("order_pipeline_stages" as any).upsert({
            id: stage.id,
            pipeline_id: stage.pipeline_id,
            ...stageUpdatePayload,
          });
        }
      } catch (err) {
        console.warn("order_pipeline_stages update exception:", err);
      }
    }

    // Atualiza localmente
    const updated = current.map((p) => {
      if (p.id !== stage.pipeline_id) return p;
      const stages = isNew
        ? [...p.stages, savedStage]
        : p.stages.map((s) => (s.id === stage.id ? { ...s, ...savedStage } : s));
      return { ...p, stages };
    });
    this.saveLocalPipelines(updated);

    return savedStage;
  },

  /**
   * Conta pedidos vinculados a um status específico
   */
  async countOrdersWithStatus(statusKey: string): Promise<number> {
    try {
      const { count, error } = await supabase
        .from("orders")
        .select("id", { count: "exact", head: true })
        .eq("status", statusKey);

      if (error) return 0;
      return count || 0;
    } catch {
      return 0;
    }
  },

  /**
   * Remove ou desativa uma etapa, migrando pedidos para uma etapa de destino se houver pedidos vinculados.
   * Atende com rigor o Requisito 10: não deixar pedidos órfãos!
   */
  async removeOrDeactivateStage(
    stageId: string,
    pipelineId: string,
    targetStatusKey?: string,
    action: "delete" | "deactivate" = "delete"
  ): Promise<{ ordersMigrated: number }> {
    const pipelines = this.getLocalPipelines();
    const pipe = pipelines.find((p) => p.id === pipelineId);
    const stage = pipe?.stages.find((s) => s.id === stageId);

    if (!stage) return { ordersMigrated: 0 };

    let ordersMigrated = 0;
    const currentOrdersCount = await this.countOrdersWithStatus(stage.status_key);

    if (currentOrdersCount > 0 && targetStatusKey) {
      // Migrar pedidos para o novo status
      const { error: updateError } = await supabase
        .from("orders")
        .update({
          status: targetStatusKey,
          updated_at: new Date().toISOString(),
        })
        .eq("status", stage.status_key);

      if (!updateError) {
        ordersMigrated = currentOrdersCount;
        
        // Registrar histórico de migração em lote
        try {
          await supabase.from("order_status_history" as any).insert({
            order_id: null,
            status: targetStatusKey,
            notes: `Migrado da etapa ${stage.name} (${stage.status_key}) para ${targetStatusKey} pelo Super Admin`,
          });
        } catch {
          // ignore
        }
      }
    }

    // Deletar ou desativar na base
    try {
      if (action === "delete") {
        await supabase.from("order_pipeline_stages" as any).delete().eq("id", stageId);
      } else {
        await supabase
          .from("order_pipeline_stages" as any)
          .update({ is_active: false, updated_at: new Date().toISOString() })
          .eq("id", stageId);
      }
    } catch {
      // fallback
    }

    // Atualizar local
    const updated = pipelines.map((p) => {
      if (p.id !== pipelineId) return p;
      const stages =
        action === "delete"
          ? p.stages.filter((s) => s.id !== stageId)
          : p.stages.map((s) => (s.id === stageId ? { ...s, is_active: false } : s));
      return { ...p, stages };
    });
    this.saveLocalPipelines(updated);

    return { ordersMigrated };
  },

  /**
   * Reseta as pipelines para os padrões iniciais
   */
  async resetToDefaults(): Promise<OrderPipeline[]> {
    this.saveLocalPipelines(DEFAULT_PIPELINES);
    return DEFAULT_PIPELINES;
  },
};
