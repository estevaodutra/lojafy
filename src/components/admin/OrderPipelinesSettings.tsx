import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { useOrderPipelines } from "@/hooks/useOrderPipelines";
import { useUserRole } from "@/hooks/useUserRole";
import { orderPipelineService } from "@/services/orderPipelineService";
import { OrderPipelineStage } from "@/types/orderPipeline";
import {
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  MoveUp,
  MoveDown,
  AlertTriangle,
  Kanban,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const OrderPipelinesSettings: React.FC = () => {
  const { isSuperAdmin } = useUserRole();
  const {
    pipelines,
    saveStage,
    removeStage,
    reorderStages,
    resetToDefaults,
  } = useOrderPipelines();

  const [activeTab, setActiveTab] = useState<string>("primary");

  // Edit / Add modal
  const [editingStage, setEditingStage] = useState<Partial<OrderPipelineStage> | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Migration / Delete modal
  const [stageToDelete, setStageToDelete] = useState<OrderPipelineStage | null>(null);
  const [ordersInStageCount, setOrdersInStageCount] = useState<number>(0);
  const [targetMigrationStatus, setTargetMigrationStatus] = useState<string>("");
  const [isMigrationDialogOpen, setIsMigrationDialogOpen] = useState(false);
  const [isMigrating, setIsMigrating] = useState(false);

  if (!isSuperAdmin()) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-muted-foreground">
          Acesso restrito ao Super Administrador da plataforma.
        </CardContent>
      </Card>
    );
  }

  const currentPipeline = pipelines.find((p) => p.key === activeTab) || pipelines[0];

  const handleMoveStage = async (stageIndex: number, direction: "up" | "down") => {
    if (!currentPipeline) return;
    const stages = [...currentPipeline.stages];
    const targetIndex = direction === "up" ? stageIndex - 1 : stageIndex + 1;

    if (targetIndex < 0 || targetIndex >= stages.length) return;

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
      status_key: "",
      order_index: currentPipeline.stages.length + 1,
      color_class: "bg-slate-100 text-slate-800 border-slate-300",
      icon_name: "Package",
      is_active: true,
    });
    setIsEditModalOpen(true);
  };

  const handleOpenEditStage = (stage: OrderPipelineStage) => {
    setEditingStage({ ...stage });
    setIsEditModalOpen(true);
  };

  const handleSaveStageForm = async () => {
    if (!editingStage || !editingStage.name?.trim()) {
      toast.error("Informe o nome da etapa.");
      return;
    }

    const trimmedName = editingStage.name.trim();

    try {
      await saveStage({
        ...editingStage,
        name: trimmedName,
        // O status do pedido é diretamente o nome da etapa
        status_key: trimmedName,
      } as any);
      setIsEditModalOpen(false);
      setEditingStage(null);
    } catch {
      // Handled by hook
    }
  };

  const handleRequestDeleteStage = async (stage: OrderPipelineStage) => {
    const count = await orderPipelineService.countOrdersWithStatus(stage.status_key || stage.name);
    setOrdersInStageCount(count);
    setStageToDelete(stage);

    const otherStages = currentPipeline.stages.filter((s) => s.id !== stage.id);
    if (otherStages.length > 0) {
      setTargetMigrationStatus(otherStages[0].status_key || otherStages[0].name);
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
    <Card className="border shadow-xs">
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Kanban className="w-5 h-5 text-primary" />
              Gestão das Pipelines de Pedidos
            </CardTitle>
            <CardDescription className="mt-1">
              Configure as etapas operacionais e ordem de exibição. O nome da etapa é o status exibido para o pedido e para o cliente.
            </CardDescription>
          </div>
          <Badge variant="outline" className="w-fit bg-primary/10 text-primary border-primary/30">
            Exclusivo Super Admin
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
            <TabsList>
              {pipelines.map((p) => (
                <TabsTrigger key={p.key} value={p.key} className="text-xs sm:text-sm">
                  {p.name}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                onClick={() => {
                  if (confirm("Deseja realmente restaurar as configurações padrão das pipelines?")) {
                    resetToDefaults();
                  }
                }}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Restaurar Padrão
              </Button>

              <Button size="sm" className="h-8 text-xs gap-1.5" onClick={handleOpenAddStage}>
                <Plus className="w-3.5 h-3.5" />
                Adicionar Etapa
              </Button>
            </div>
          </div>

          <div className="pt-4 space-y-2">
            {currentPipeline?.stages.map((stage, idx) => (
              <div
                key={stage.id}
                className={cn(
                  "flex items-center justify-between gap-3 p-3.5 rounded-lg border bg-card hover:bg-muted/40 transition-colors shadow-2xs",
                  !stage.is_active && "opacity-50"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
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

                  <span className="text-xs font-mono text-muted-foreground w-6 text-center font-bold">
                    {idx + 1}
                  </span>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground truncate">
                        {stage.name}
                      </span>
                      {!stage.is_active && (
                        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                          Inativa
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5"
                    onClick={() => handleOpenEditStage(stage)}
                    title="Editar etapa"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-muted-foreground hover:text-foreground" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 px-2.5 text-destructive hover:bg-destructive/10"
                    onClick={() => handleRequestDeleteStage(stage)}
                    title="Excluir etapa"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Tabs>

        {/* Edit / Add Stage Dialog - O status é o nome da etapa */}
        <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>
                {editingStage?.id ? "Editar Etapa" : "Nova Etapa da Pipeline"}
              </DialogTitle>
              <DialogDescription>
                Informe o nome da etapa. Esse nome será o status do pedido exibido na plataforma e para o cliente.
              </DialogDescription>
            </DialogHeader>

            {editingStage && (
              <div className="space-y-4 py-2">
                <div className="space-y-1.5">
                  <Label htmlFor="stage-name-settings">Nome da Etapa</Label>
                  <Input
                    id="stage-name-settings"
                    placeholder="Ex: Novo Pedido"
                    value={editingStage.name || ""}
                    onChange={(e) =>
                      setEditingStage({ ...editingStage, name: e.target.value })
                    }
                    autoFocus
                  />
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
              <Button variant="outline" onClick={() => setIsEditModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSaveStageForm}>Salvar Etapa</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Migration / Safe Delete Dialog */}
        <AlertDialog open={isMigrationDialogOpen} onOpenChange={setIsMigrationDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400">
                <AlertTriangle className="w-5 h-5" />
                <AlertDialogTitle>Atenção ao Remover Etapa</AlertDialogTitle>
              </div>
              <AlertDialogDescription className="space-y-3 pt-2">
                <p>
                  Você está prestes a remover a etapa{" "}
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
                              <SelectItem key={s.id} value={s.status_key || s.name}>
                                {s.name}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">
                    Não há pedidos vinculados a esta etapa no momento.
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
      </CardContent>
    </Card>
  );
};
