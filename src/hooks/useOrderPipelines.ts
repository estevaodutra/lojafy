import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { orderPipelineService } from "@/services/orderPipelineService";
import { OrderPipeline, OrderPipelineStage } from "@/types/orderPipeline";
import { useToast } from "@/hooks/use-toast";
import { useUserRole } from "@/hooks/useUserRole";

export function useOrderPipelines() {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isSuperAdmin } = useUserRole();

  const query = useQuery({
    queryKey: ["order-pipelines"],
    queryFn: () => orderPipelineService.getPipelines(),
    staleTime: 1000 * 60 * 5, // 5 min
  });

  const reorderMutation = useMutation({
    mutationFn: async ({ pipelineId, stageIds }: { pipelineId: string; stageIds: string[] }) => {
      if (!isSuperAdmin()) {
        throw new Error("Apenas o Super Admin pode alterar a ordem das etapas.");
      }
      return orderPipelineService.reorderStages(pipelineId, stageIds);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
      toast({
        title: "Ordem salva",
        description: "A ordem das etapas da pipeline foi atualizada.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro na permissão",
        description: err.message || "Erro ao reordenar etapas.",
        variant: "destructive",
      });
    },
  });

  const saveStageMutation = useMutation({
    mutationFn: async (stage: Partial<OrderPipelineStage> & { pipeline_id: string; name: string; status_key: string }) => {
      if (!isSuperAdmin()) {
        throw new Error("Apenas o Super Admin pode alterar ou criar etapas.");
      }
      return orderPipelineService.saveStage(stage);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });
      queryClient.invalidateQueries({ queryKey: ["supplier-orders"] });
      toast({
        title: "Etapa salva",
        description: "A etapa da pipeline foi salva no banco de dados com sucesso.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao salvar",
        description: err.message || "Não foi possível salvar a etapa.",
        variant: "destructive",
      });
    },
  });

  const removeStageMutation = useMutation({
    mutationFn: async ({
      stageId,
      pipelineId,
      targetStatusKey,
      action = "delete",
    }: {
      stageId: string;
      pipelineId: string;
      targetStatusKey?: string;
      action?: "delete" | "deactivate";
    }) => {
      if (!isSuperAdmin()) {
        throw new Error("Apenas o Super Admin pode remover ou desativar etapas.");
      }
      return orderPipelineService.removeOrDeactivateStage(stageId, pipelineId, targetStatusKey, action);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["order-pipelines"] });
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["reseller-orders"] });
      toast({
        title: "Etapa atualizada",
        description:
          data.ordersMigrated > 0
            ? `Etapa removida e ${data.ordersMigrated} pedido(s) migrado(s) com sucesso.`
            : "Etapa removida com sucesso.",
      });
    },
    onError: (err: any) => {
      toast({
        title: "Erro ao remover",
        description: err.message || "Não foi possível remover a etapa.",
        variant: "destructive",
      });
    },
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      if (!isSuperAdmin()) {
        throw new Error("Apenas o Super Admin pode restaurar os padrões das pipelines.");
      }
      return orderPipelineService.resetToDefaults();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["order-pipelines"] });
      toast({
        title: "Pipelines Restauradas",
        description: "Estrutura padrão restaurada com sucesso.",
      });
    },
  });

  return {
    pipelines: query.data || [],
    isLoading: query.isLoading,
    reorderStages: reorderMutation.mutateAsync,
    isReordering: reorderMutation.isPending,
    saveStage: saveStageMutation.mutateAsync,
    isSavingStage: saveStageMutation.isPending,
    removeStage: removeStageMutation.mutateAsync,
    isRemovingStage: removeStageMutation.isPending,
    resetToDefaults: resetMutation.mutateAsync,
    refetch: query.refetch,
  };
}
