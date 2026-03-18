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
          <DialogTitle>Cancelar Pedido #{orderNumber}</DialogTitle>
          <DialogDescription>
            Informe o motivo do cancelamento deste pedido.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
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

          <div className="flex items-center gap-2 p-3 bg-destructive/10 rounded-md text-sm text-destructive">
            <AlertTriangle className="h-4 w-4 shrink-0" />
            <span>Esta ação não pode ser desfeita.</span>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Voltar</Button>
            <Button variant="destructive" onClick={handleConfirm} disabled={!isValid}>
              Confirmar Cancelamento
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
