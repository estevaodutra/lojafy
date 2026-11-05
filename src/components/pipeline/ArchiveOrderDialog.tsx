import React, { useState, useEffect } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Archive, AlertTriangle, ShieldAlert, CheckCircle2, Loader2 } from "lucide-react";
import {
  ARCHIVE_REASONS,
  checkArchivingEligibility,
  archiveOrder,
} from "@/services/orderArchivingService";
import { toast } from "sonner";

interface ArchiveOrderDialogProps {
  order: OrderPipelineItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const ArchiveOrderDialog: React.FC<ArchiveOrderDialogProps> = ({
  order,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [selectedReason, setSelectedReason] = useState<string>(ARCHIVE_REASONS[0]);
  const [customReason, setCustomReason] = useState("");
  const [forceAuthorized, setForceAuthorized] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedReason(ARCHIVE_REASONS[0]);
      setCustomReason("");
      setForceAuthorized(false);
      setIsSubmitting(false);
    }
  }, [isOpen]);

  if (!order) return null;

  const eligibility = checkArchivingEligibility(order);
  const reasonToSave = selectedReason === "Outro motivo" ? customReason || "Outro motivo" : selectedReason;

  const handleConfirmArchive = async () => {
    if (selectedReason === "Outro motivo" && !customReason.trim()) {
      toast.error("Por favor, especifique o motivo do arquivamento.");
      return;
    }

    if (!eligibility.isEligible && eligibility.canForce && !forceAuthorized) {
      toast.error("Você deve confirmar a autorização para arquivar este pedido.");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await archiveOrder({
        orderId: order.id,
        reason: reasonToSave,
        type: "manual",
        force: forceAuthorized,
      });

      if (!res.success) {
        toast.error(res.error || "Não foi possível arquivar o pedido.");
        return;
      }

      toast.success(`Pedido #${order.order_number} arquivado com sucesso.`);
      onSuccess();
      onClose();
    } catch {
      toast.error("Erro inesperado ao arquivar pedido.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Archive className="w-5 h-5 text-amber-600" />
            Arquivar Pedido #{order.order_number}
          </DialogTitle>
          <DialogDescription>
            Arquivar remove o pedido da operação ativa sem cancelar nem apagar o registro histórico.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Safety warnings based on eligibility */}
          {!eligibility.isEligible && !eligibility.canForce && (
            <Alert variant="destructive" className="bg-destructive/10 border-destructive/30">
              <ShieldAlert className="w-4 h-4" />
              <AlertTitle className="text-xs font-semibold">Bloqueio de Segurança</AlertTitle>
              <AlertDescription className="text-xs mt-1">
                {eligibility.reason}
              </AlertDescription>
            </Alert>
          )}

          {!eligibility.isEligible && eligibility.canForce && (
            <div className="space-y-3">
              <Alert className="bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <AlertTitle className="text-xs font-semibold">Atenção Operacional</AlertTitle>
                <AlertDescription className="text-xs mt-1">
                  {eligibility.reason}
                </AlertDescription>
              </Alert>

              <div className="flex items-start gap-2 p-2.5 rounded-lg border bg-muted/40">
                <Checkbox
                  id="auth-force"
                  checked={forceAuthorized}
                  onCheckedChange={(c) => setForceAuthorized(!!c)}
                  className="mt-0.5"
                />
                <Label htmlFor="auth-force" className="text-xs font-normal cursor-pointer leading-tight">
                  Estou ciente da situação do pedido e autorizo o arquivamento manual.
                </Label>
              </div>
            </div>
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
                placeholder="Ex: Cancelado pelo comprador diretamente no marketplace"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                className="text-xs h-9"
              />
            </div>
          )}

          {/* Order quick summary */}
          <div className="rounded-lg bg-muted/30 p-2.5 border text-xs space-y-1">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Cliente:</span>
              <span className="font-medium text-foreground">{order.customer_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Canal:</span>
              <span className="font-medium text-foreground">{order.channel_label}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-semibold text-foreground">
                {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(
                  order.total_amount
                )}
              </span>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancelar
          </Button>

          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmArchive}
            disabled={
              isSubmitting ||
              (!eligibility.isEligible && !eligibility.canForce) ||
              (!eligibility.isEligible && eligibility.canForce && !forceAuthorized)
            }
            className="gap-1.5"
          >
            {isSubmitting ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Archive className="w-4 h-4" />
            )}
            Confirmar Arquivamento
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
