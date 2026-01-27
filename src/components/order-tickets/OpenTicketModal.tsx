import { useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertCircle, Loader2 } from 'lucide-react';
import { useOrderTickets } from '@/hooks/useOrderTickets';
import { getAvailableTicketTypes, TICKET_TYPE_LABELS, OrderTicketType } from '@/types/orderTickets';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { TicketAttachmentUpload, TicketAttachment } from './TicketAttachmentUpload';

interface OpenTicketModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderStatus: string;
  paymentStatus: string;
  deliveredAt?: string | null;
}

const MIN_REASON_LENGTH = 20;

const typeDescriptions: Record<OrderTicketType, string> = {
  reembolso: 'Solicite a devolução do valor pago pelo pedido.',
  troca: 'Solicite a substituição de um produto por outro. Disponível até 7 dias após a entrega.',
  cancelamento: 'Cancele o pedido antes do envio.',
};

export const OpenTicketModal = ({
  open,
  onOpenChange,
  orderId,
  orderStatus,
  paymentStatus,
  deliveredAt,
}: OpenTicketModalProps) => {
  const [tipo, setTipo] = useState<OrderTicketType | ''>('');
  const [reason, setReason] = useState('');
  const [attachments, setAttachments] = useState<TicketAttachment[]>([]);
  
  const { createTicket, isCreating } = useOrderTickets();

  const availableTypes = useMemo(
    () => getAvailableTicketTypes(orderStatus, paymentStatus, deliveredAt),
    [orderStatus, paymentStatus, deliveredAt]
  );

  const isValidReason = reason.trim().length >= MIN_REASON_LENGTH;
  const requiresAttachment = tipo === 'troca';
  const hasAttachments = attachments.length > 0;
  const canSubmit = tipo && isValidReason && !isCreating && (!requiresAttachment || hasAttachments);

  const handleSubmit = () => {
    if (!canSubmit) return;

    createTicket(
      {
        order_id: orderId,
        tipo: tipo as OrderTicketType,
        reason: reason.trim(),
        attachments: attachments,
      },
      {
        onSuccess: () => {
          onOpenChange(false);
          setTipo('');
          setReason('');
          setAttachments([]);
        },
      }
    );
  };

  const handleClose = () => {
    if (!isCreating) {
      onOpenChange(false);
      setTipo('');
      setReason('');
      setAttachments([]);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Abrir Ticket de Suporte</DialogTitle>
          <DialogDescription>
            Selecione o tipo de solicitação e descreva o motivo detalhadamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Ticket Type */}
          <div className="space-y-2">
            <Label htmlFor="tipo">Tipo de Solicitação *</Label>
            <Select value={tipo} onValueChange={(v) => setTipo(v as OrderTicketType)}>
              <SelectTrigger id="tipo">
                <SelectValue placeholder="Selecione o tipo" />
              </SelectTrigger>
              <SelectContent>
                {availableTypes.map((type) => (
                  <SelectItem key={type} value={type}>
                    {TICKET_TYPE_LABELS[type]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {tipo && (
              <p className="text-sm text-muted-foreground">
                {typeDescriptions[tipo as OrderTicketType]}
              </p>
            )}
          </div>

          {/* Reason */}
          <div className="space-y-2">
            <Label htmlFor="reason">Motivo da Solicitação *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explique detalhadamente o motivo da sua solicitação..."
              rows={5}
              className="resize-none"
            />
            <div className="flex justify-between text-xs">
              <span className={reason.length < MIN_REASON_LENGTH ? 'text-muted-foreground' : 'text-primary'}>
                {reason.length}/{MIN_REASON_LENGTH} caracteres mínimos
              </span>
              {!isValidReason && reason.length > 0 && (
                <span className="text-destructive">
                  Faltam {MIN_REASON_LENGTH - reason.length} caracteres
                </span>
              )}
            </div>
          </div>

          {/* Attachments */}
          <div className="space-y-2">
            <Label>
              Anexos (Fotos ou PDF) {requiresAttachment && '*'}
            </Label>
            <TicketAttachmentUpload
              attachments={attachments}
              onAttachmentsChange={setAttachments}
              required={requiresAttachment}
              disabled={isCreating}
            />
          </div>

          {/* Info Alert */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Após abrir o ticket, você receberá uma resposta em até{' '}
              {tipo === 'cancelamento' ? '4 horas' : '24 horas'}.
            </AlertDescription>
          </Alert>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isCreating}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={!canSubmit}>
            {isCreating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Enviando...
              </>
            ) : (
              'Abrir Ticket'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
