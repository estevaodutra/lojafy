import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CalendarIcon } from "lucide-react";

interface ReposicaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (estimatedDate: string, reason?: string) => void;
  orderNumber: string;
}

export const ReposicaoModal = ({ isOpen, onClose, onConfirm, orderNumber }: ReposicaoModalProps) => {
  const [estimatedDate, setEstimatedDate] = useState("");
  const [reason, setReason] = useState("");

  const handleConfirm = () => {
    if (!estimatedDate) return;
    onConfirm(estimatedDate, reason || undefined);
    setEstimatedDate("");
    setReason("");
  };

  const handleClose = () => {
    setEstimatedDate("");
    setReason("");
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Pedido em Reposição</DialogTitle>
          <DialogDescription>
            Informe a previsão de envio para o pedido #{orderNumber}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="estimated-date">Previsão de envio *</Label>
            <div className="relative mt-1">
              <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                id="estimated-date"
                type="date"
                value={estimatedDate}
                onChange={(e) => setEstimatedDate(e.target.value)}
                className="pl-10"
                min={new Date().toISOString().split("T")[0]}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="reason">Motivo (opcional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex: Produto em reposição pelo fabricante"
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>Cancelar</Button>
          <Button onClick={handleConfirm} disabled={!estimatedDate}>Confirmar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
