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
      const { error } = await supabase.from('orders').update({
        status: 'cancelado',
        cancelamento_motivo: motivo,
        cancelamento_observacao: observacao.trim() || null,
        cancelado_em: new Date().toISOString(),
      }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'cancelado',
        notes: `Motivo: ${CANCELLATION_REASONS.find(r => r.code === motivo)?.label || motivo}${observacao ? ` - ${observacao}` : ''}`,
      });

      // Credit wallet
      await supabase.rpc('creditar_carteira' as any, {
        p_user_id: userId,
        p_valor: totalAmount,
        p_taxa: 0,
        p_descricao: `Reembolso do pedido #${orderNumber} (cancelamento)`,
        p_referencia_tipo: 'cancelamento_pedido',
        p_referencia_id: orderId,
        p_tipo: 'estorno',
      });

      toast.success('Pedido cancelado com sucesso. Valor creditado na carteira.');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro ao cancelar pedido:', error);
      toast.error(error.message || 'Erro ao cancelar pedido.');
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
            Cancelar Pedido
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} • {formatPrice(totalAmount)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-sm text-destructive">
            ⚠️ Esta ação não pode ser desfeita.
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
              O valor de <strong>{formatPrice(totalAmount)}</strong> será creditado automaticamente na carteira do cliente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button variant="destructive" onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? 'Cancelando...' : 'Confirmar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
