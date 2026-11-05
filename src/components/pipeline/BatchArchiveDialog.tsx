import React, { useState } from "react";
import { OrderPipelineItem } from "@/types/orderPipeline";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Archive, AlertTriangle, CheckCircle2, ShieldAlert, Loader2 } from "lucide-react";
import {
  ARCHIVE_REASONS,
  checkArchivingEligibility,
  batchArchiveOrders,
} from "@/services/orderArchivingService";
import { toast } from "sonner";

interface BatchArchiveDialogProps {
  orders: OrderPipelineItem[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const BatchArchiveDialog: React.FC<BatchArchiveDialogProps> = ({
  orders,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(ARCHIVE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || orders.length === 0) return null;

  // Evaluate eligibility for all selected
  const evaluations = orders.map((o) => ({
    order: o,
    check: checkArchivingEligibility(o),
  }));

  const eligible = evaluations.filter((e) => e.check.isEligible);
  const blocked = evaluations.filter((e) => !e.check.isEligible);

  const reasonToSave = selectedReason === "Outro motivo" ? customReason || "Outro motivo" : selectedReason;

  const handleConfirmBatch = async () => {
    if (selectedReason === "Outro motivo" && !customReason.trim()) {
      toast.error("Por favor, especifique o motivo do arquivamento.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await batchArchiveOrders(
        eligible.map((e) => e.order),
        reasonToSave
      );

      if (res.archivedCount > 0) {
        toast.success(`${res.archivedCount} pedido(s) arquivado(s) com sucesso.`);
      }

      if (res.blockedCount > 0) {
        toast.warning(
          `${res.blockedCount} pedido(s) foram protegidos e não foram arquivados.`
        );
      }

      onSuccess();
      onClose();
    } catch {
      toast.error("Erro ao realizar arquivamento em lote.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Archive className="w-5 h-5 text-amber-600" />
            Arquivamento em Lote ({orders.length} selecionados)
          </DialogTitle>
          <DialogDescription>
            Arquiva múltiplos pedidos que não necessitam mais de acompanhamento operacional ativo.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Summary counters */}
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300">
              <span className="font-semibold block text-sm">{eligible.length}</span>
              <span>Elegíveis para arquivar</span>
            </div>
            <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300">
              <span className="font-semibold block text-sm">{blocked.length}</span>
              <span>Protegidos / Bloqueados</span>
            </div>
          </div>

          {/* Blocked details if any */}
          {blocked.length > 0 && (
            <Alert className="bg-muted/40 border text-xs max-h-32 overflow-y-auto">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <AlertDescription className="text-[11px] space-y-1">
                <strong>Pedidos protegidos de arquivamento em massa:</strong>
                {blocked.slice(0, 5).map(({ order, check }) => (
                  <div key={order.id} className="text-muted-foreground truncate">
                    #{order.order_number}: {check.reason}
                  </div>
                ))}
                {blocked.length > 5 && (
                  <div className="text-muted-foreground font-semibold">
                    + {blocked.length - 5} outros pedidos protegidos
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Reason Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">Motivo do Arquivamento</Label>
            <Select value={selectedReason} onValueChange={setSelectedReason}>
              <SelectTrigger className="text-xs h-9">
                <SelectValue placeholder="Selecione um motivo" />
              </SelectTrigger>
              <SelectContent>
                {ARCHIVE_REASONS.map((r) => (
                  <SelectItem key={r} value={r} className="text-xs">
                    {r}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedReason === "Outro motivo" && (
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Descreva o motivo</Label>
              <Input
                placeholder="Ex: Pedidos duplicados em importação de planilha"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmBatch}
            disabled={isSubmitting || eligible.length === 0}
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            Arquivar {eligible.length} Elegíveis
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
