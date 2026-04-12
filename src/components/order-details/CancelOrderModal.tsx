import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CANCELLATION_REASONS, REASONS_REQUIRING_OBSERVATION } from '@/constants/orderStatus';

interface CancelOrderModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  totalAmount: number;
  userId: string;
  onSuccess: () => void;
}

export const CancelOrderModal = ({
  open, onOpenChange, orderId, orderNumber, totalAmount, userId, onSuccess,
}: CancelOrderModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [observacao, setObservacao] = useState('');
  const [loading, setLoading] = useState(false);

  const requiresObservation = REASONS_REQUIRING_OBSERVATION.includes(motivo);
  const canSubmit = motivo && (!requiresObservation || observacao.trim());

  const formatPrice = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      // Get current user id for tracking who requested
      const { data: { user } } = await supabase.auth.getUser();

      const { error } = await supabase.from('orders').update({
        status: 'cancelamento_solicitado',
        cancelamento_motivo: motivo,
        cancelamento_observacao: observacao.trim() || null,
      }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'cancelamento_solicitado',
        notes: `Solicitação de cancelamento - Motivo: ${CANCELLATION_REASONS.find(r => r.code === motivo)?.label || motivo}${observacao ? ` - ${observacao}` : ''}`,
        changed_by: user?.id || null,
      });

      toast.success('Solicitação de cancelamento enviada. Aguardando aprovação.');
      onOpenChange(false);
      setMotivo('');
      setObservacao('');
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao solicitar cancelamento:', error);
      toast.error(error.message || 'Erro ao solicitar cancelamento.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Solicitar Cancelamento
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} • {formatPrice(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 border border-amber-200 text-sm text-amber-800">
            ⚠️ A solicitação será enviada para aprovação do administrador. O valor só será creditado após a aprovação.
          </div>

          <div className="space-y-2">
            <Label>Motivo do Cancelamento *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {CANCELLATION_REASONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observação {requiresObservation ? '*' : '(opcional)'}</Label>
            <Textarea value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Detalhes adicionais..." />
          </div>

          <div className="p-3 rounded-lg bg-muted border text-sm">
            <p className="font-medium">💰 Reembolso</p>
            <p className="text-muted-foreground mt-1">
              O valor de <strong>{formatPrice(totalAmount)}</strong> será creditado na carteira do cliente <strong>após aprovação</strong> do administrador.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? 'Enviando...' : 'Solicitar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
