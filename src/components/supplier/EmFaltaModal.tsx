import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AlertTriangle } from "lucide-react";

interface EmFaltaModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  orderNumber: string;
}

export const EmFaltaModal = ({ isOpen, onClose, onConfirm, orderNumber }: EmFaltaModalProps) => {
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!reason.trim()) return;
    onConfirm(reason);
    setReason("");
  };

  const handleClose = () => {
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Produto em Falta
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-3 space-y-2">
            <p className="text-sm font-medium text-destructive">
              ⚠️ O pedido será marcado para cancelamento e reembolso.
            </p>
            <p className="text-sm font-medium text-destructive">
              ⚠️ Os produtos deste pedido serão indisponibilizados automaticamente.
            </p>
          </div>
          <div>
            <Label htmlFor="falta-reason">Motivo *</Label>
            <Textarea
              id="falta-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Informe o motivo da falta do produto"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Voltar</Button>
          <Button variant="destructive" onClick={handleConfirm} disabled={!reason.trim()}>
            Confirmar Falta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
