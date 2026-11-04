import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { OrderPipeline, OrderPipelineStage } from "@/types/orderPipeline";
import { useOrderPipelines } from "@/hooks/useOrderPipelines";
import { useUserRole } from "@/hooks/useUserRole";
import { orderPipelineService } from "@/services/orderPipelineService";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, OrderStatus } from "@/constants/orderStatus";
import {
  GripVertical,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Check,
  AlertTriangle,
  MoveDown,
  MoveUp,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface PipelineConfigDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PipelineConfigDialog: React.FC<PipelineConfigDialogProps> = ({
  isOpen,
  onClose,
}) => {
  const { isSuperAdmin } = useUserRole();
  const {
    pipelines,
    saveStage,
    removeStage,
    reorderStages,
    resetToDefaults,
  } = useOrderPipelines();

  const [selectedPipelineKey, setSelectedPipelineKey] = useState<string>("primary");

  // Editing state
  const [editingStage, setEditingStage] = useState<Partial<OrderPipelineStage> | null>(null);
  const [isEditingModalOpen, setIsEditingModalOpen] = useState(false);

  // Deletion / Migration modal state (Requirement 10)
  const [stageToDelete, setStageToDelete] = useState<OrderPipelineStage | null>(null);
  const [ordersInStageCount, setOrdersInStageCount] = useState<number>(0);
  const [targetMigrationStatus, setTargetMigrationStatus] = useState<string>("");
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  const currentPipeline =
    pipelines.find((p) => p.key === selectedPipelineKey) || pipelines[0];

  if (!isSuperAdmin()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Acesso Negado</DialogTitle>
            <DialogDescription>
              Apenas usuários com privilégios de Super Admin podem configurar as pipelines.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={onClose}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  const handleMoveStage = async (stageIndex: number, direction: "up" | "down") => {
    if (!currentPipeline) return;
    const stages = [...currentPipeline.stages];
    const targetIndex = direction === "up" ? stageIndex - 1 : stageIndex + 1;

    if (targetIndex < 0 || targetIndex >= stages.length) return;

    // Swap
    const temp = stages[stageIndex];
    stages[stageIndex] = stages[targetIndex];
    stages[targetIndex] = temp;

    const orderedIds = stages.map((s) => s.id);
    await reorderStages({ pipelineId: currentPipeline.id, stageIds: orderedIds });
  };

  const handleOpenAddStage = () => {
    if (!currentPipeline) return;
    setEditingStage({
      pipeline_id: currentPipeline.id,
      name: "",
      status_key: "pendente",
      order_index: currentPipeline.stages.length + 1,
      color_class: "bg-slate-100 text-slate-800 border-slate-300",
      icon_name: "Package",
      is_active: true,
    });
    setIsEditingModalOpen(true);
  };

  const handleOpenEditStage = (stage: OrderPipelineStage) => {
    setEditingStage({ ...stage });
    setIsEditingModalOpen(true);
  };

  const handleSaveStageForm = async () => {
    if (!editingStage || !editingStage.name || !editingStage.status_key) {
      toast.error("Preencha o nome e o status da etapa.");
      return;
    }

    try {
      await saveStage(editingStage as any);
      setIsEditingModalOpen(false);
      setEditingStage(null);
    } catch {
      // Toast already handled by hook
    }
  };

  const handleRequestDeleteStage = async (stage: OrderPipelineStage) => {
    const count = await orderPipelineService.countOrdersWithStatus(stage.status_key);
    setOrdersInStageCount(count);
    setStageToDelete(stage);

    // Pick first available other stage as target migration default
    const otherStages = currentPipeline.stages.filter((s) => s.id !== stage.id);
    if (otherStages.length > 0) {
      setTargetMigrationStatus(otherStages[0].status_key);
    }

    setIsMigrationDialogOpen(true);
  };

  const handleConfirmDeleteWithMigration = async () => {
    if (!stageToDelete || !currentPipeline) return;

    if (ordersInStageCount > 0 && !targetMigrationStatus) {
      toast.error("Selecione uma etapa de destino para os pedidos existentes.");
      return;
    }

    setIsMigrating(true);
    try {
      await removeStage({
        stageId: stageToDelete.id,
        pipelineId: currentPipeline.id,
        targetStatusKey: targetMigrationStatus,
        action: "delete",
      });
      setIsMigrationDialogOpen(false);
      setStageToDelete(null);
    } catch (err: any) {
      toast.error(err.message || "Erro ao remover etapa.");
    } finally {
      setIsMigrating(false);
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <div className="flex items-center justify-between pr-4">
              <div>
                <DialogTitle className="text-xl font-bold">
                  Configuração de Pipelines
                </DialogTitle>
                <DialogDescription>
                  Gerencie as pipelines operacionais, etapas e relacionamentos de status (Exclusivo Super Admin).
                </DialogDescription>
              </div>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30">
                Super Admin
              </Badge>
            </div>
          </DialogHeader>

          {/* Pipeline Selector */}
          <div className="flex items-center justify-between border-b pb-3 pt-1">
            <Tabs
              value={selectedPipelineKey}
              onValueChange={setSelectedPipelineKey}
              className="w-full"
            >
              <div className="flex items-center justify-between">
                <TabsList>
                  {pipelines.map((pipe) => (
                    <TabsTrigger key={pipe.key} value={pipe.key} className="text-xs sm:text-sm">
                      {pipe.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      if (confirm("Deseja realmente restaurar as etapas para a configuração padrão?")) {
                        resetToDefaults();
                      }
                    }}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Restaurar Padrão
                  </Button>

                  <Button size="sm" className="h-8 text-xs gap-1" onClick={handleOpenAddStage}>
                    <Plus className="w-3.5 h-3.5" />
                    Adicionar Etapa
                  </Button>
                </div>
              </div>
            </Tabs>
          </div>

          {/* Stages List */}
          <div className="flex-1 overflow-y-auto py-2 space-y-2 pr-1">
            {currentPipeline?.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center justify-between gap-3 p-3 rounded-lg border bg-card/60 hover:bg-accent/40 transition-colors",
                  !stage.is_active && "opacity-60"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {/* Order control arrows */}
                  <div className="flex flex-col gap-0.5 shrink-0 text-muted-foreground">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => handleMoveStage(idx, "up")}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                      title="Mover para cima"
                    >
                      <MoveUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === currentPipeline.stages.length - 1}
                      onClick={() => handleMoveStage(idx, "down")}
                      className="p-0.5 rounded hover:bg-muted disabled:opacity-30"
                      title="Mover para baixo"
                    >
                      <MoveDown className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <span className="text-xs font-mono text-muted-foreground w-5 text-center">
                    {idx + 1}
                  </span>

                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {stage.name}
                      </span>
                      {!stage.is_active && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Inativo
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span>Status vinculado:</span>
                      <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px] text-foreground">
                        {stage.status_key}
                      </code>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2"
                    onClick={() => handleOpenEditStage(stage)}
                    title="Editar etapa"
                  >
                    <Edit2 className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRequestDeleteStage(stage)}
                    title="Excluir etapa"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" onClick={onClose}>
              Concluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit/Add Stage Dialog */}
      <Dialog open={isEditingModalOpen} onOpenChange={setIsEditingModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingStage?.id ? "Editar Etapa" : "Nova Etapa da Pipeline"}
            </DialogTitle>
            <DialogDescription>
              Defina o nome visível e o status operacional correspondente.
            </DialogDescription>
          </DialogHeader>

          {editingStage && (
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label htmlFor="stage-name">Nome da Etapa</Label>
                <Input
                  id="stage-name"
                  placeholder="Ex: Embalado > Aguardando Coleta"
                  value={editingStage.name || ""}
                  onChange={(e) =>
                    setEditingStage({ ...editingStage, name: e.target.value })
                  }
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="stage-status">Status Relacionado do Pedido</Label>
                <Select
                  value={editingStage.status_key || "pendente"}
                  onValueChange={(val) =>
                    setEditingStage({ ...editingStage, status_key: val })
                  }
                >
                  <SelectTrigger id="stage-status">
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {ORDER_STATUS_CONFIG[s].label} ({s})
                      </SelectItem>
                    ))}
                    {selectedPipelineKey === "occurrences" && (
                      <>
                        <SelectItem value="aberto">Ticket Aberto (aberto)</SelectItem>
                        <SelectItem value="em_analise">Em Análise (em_analise)</SelectItem>
                        <SelectItem value="aguardando_cliente">Aguardando Cliente</SelectItem>
                        <SelectItem value="resolvido">Resolvido (resolvido)</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-[11px] text-muted-foreground">
                  Quando um pedido entrar nesta etapa, seu status será atualizado para este valor.
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <Label className="text-sm font-medium">Etapa Ativa</Label>
                  <p className="text-xs text-muted-foreground">
                    Exibir esta coluna na visualização operacional Kanban.
                  </p>
                </div>
                <Switch
                  checked={editingStage.is_active ?? true}
                  onCheckedChange={(checked) =>
                    setEditingStage({ ...editingStage, is_active: checked })
                  }
                />
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditingModalOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStageForm}>Salvar Etapa</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Migration / Safe Delete Dialog (Requirement 10) */}
      <AlertDialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
              <AlertTriangle className="w-5 h-5" />
              <AlertDialogTitle>Atenção ao Remover Etapa</AlertDialogTitle>
            </div>
            <AlertDialogDescription className="space-y-3 pt-2">
              <p>
                Você está removendo a etapa{" "}
                <strong className="text-foreground">"{stageToDelete?.name}"</strong>.
              </p>

              {ordersInStageCount > 0 ? (
                <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs text-amber-900 dark:text-amber-200 space-y-2">
                  <p className="font-semibold">
                    Esta etapa possui {ordersInStageCount} pedido(s) vinculado(s)!
                  </p>
                  <p>
                    Para evitar pedidos órfãos, selecione uma etapa de destino para onde esses pedidos serão migrados:
                  </p>
                  <div className="pt-1">
                    <Label className="text-xs text-foreground font-medium mb-1 block">
                      Etapa de Destino Obrigatória:
                    </Label>
                    <Select
                      value={targetMigrationStatus}
                      onValueChange={setTargetMigrationStatus}
                    >
                      <SelectTrigger className="bg-background text-foreground">
                        <SelectValue placeholder="Selecione o destino" />
                      </SelectTrigger>
                      <SelectContent>
                        {currentPipeline?.stages
                          .filter((s) => s.id !== stageToDelete?.id)
                          .map((s) => (
                            <SelectItem key={s.id} value={s.status_key}>
                              {s.name} ({s.status_key})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Não há pedidos vinculados a esta etapa no momento. A remoção é segura.
                </p>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isMigrating}>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={isMigrating || (ordersInStageCount > 0 && !targetMigrationStatus)}
              onClick={handleConfirmDeleteWithMigration}
            >
              {isMigrating ? "Migrando e removendo..." : "Confirmar Remoção"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
