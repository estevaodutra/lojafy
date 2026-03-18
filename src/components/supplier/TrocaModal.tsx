import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EXCHANGE_REASONS } from "@/constants/orderStatus";

interface TrocaModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  customerName?: string;
  onConfirm: (motivo: string, observacao: string) => void;
}

export const TrocaModal = ({ isOpen, onClose, orderNumber, customerName, onConfirm }: TrocaModalProps) => {
  const [motivo, setMotivo] = useState("");
  const [observacao, setObservacao] = useState("");

  const handleConfirm = () => {
    if (!motivo) return;
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
          <DialogTitle>Registrar Solicitação de Troca</DialogTitle>
          <DialogDescription>
            Pedido: #{orderNumber}{customerName ? ` — ${customerName}` : ""}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Motivo da Troca *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {EXCHANGE_REASONS.map((r) => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Observação (opcional)</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              placeholder="Informações adicionais sobre a troca..."
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={handleClose}>Cancelar</Button>
            <Button onClick={handleConfirm} disabled={!motivo}>
              Registrar Troca
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
