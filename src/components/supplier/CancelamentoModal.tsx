import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle } from "lucide-react";
import { CANCELLATION_REASONS, REASONS_REQUIRING_OBSERVATION } from "@/constants/orderStatus";

interface CancelamentoModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  onConfirm: (motivo: string, observacao: string) => void;
}

export const CancelamentoModal = ({ isOpen, onClose, orderNumber, onConfirm }: CancelamentoModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const requiresObservacao = REASONS_REQUIRING_OBSERVATION.includes(motivo);
  const isValid = motivo && (!requiresObservacao || observacao.trim().length > 0);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm(motivo, observacao);
    setMotivo("");
    setObservacao("");
  };

  const handleClose = () => {
    setMotivo("");
    setObservacao("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Solicitar Cancelamento - Pedido #{orderNumber}</DialogTitle>
          <DialogDescription>
            A solicitação será enviada para aprovação do administrador.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            ⚠️ O valor só será creditado na carteira após aprovação do administrador.
          </div>

          <div>
            <Label>Motivo do Cancelamento *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>
              Observação {requiresObservacao ? "*" : "(opcional)"}
            </Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Descreva o motivo com mais detalhes..."
              rows={3}
            />
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted rounded-md text-sm text-muted-foreground">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>A solicitação será analisada pelo administrador antes da efetivação.</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Voltar</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!isValid}>
              Enviar Solicitação
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
