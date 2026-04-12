import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { HandMetal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface RequestCancelModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  onSuccess: () => void;
}

export const RequestCancelModal = ({
  open, onOpenChange, orderId, orderNumber, onSuccess,
}: RequestCancelModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [ciente, setCiente] = useState(false);
  const [loading, setLoading] = useState(false);

  const canSubmit = motivo.trim() && ciente;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: 'cancelamento_solicitado',
        cancelamento_motivo: 'solicitacao_revendedor',
        cancelamento_observacao: motivo.trim(),
      }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'cancelamento_solicitado',
        notes: `Solicitação de cancelamento: ${motivo.trim()}`,
      });

      toast.success('Solicitação de cancelamento enviada.');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro:', error);
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
            <HandMetal className="h-5 w-5" />
            Solicitar Cancelamento
          </DialogTitle>
          <DialogDescription>Pedido #{orderNumber} • Status: Enviado</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 text-sm space-y-2">
            <p className="font-medium text-amber-800 dark:text-amber-300">⚠️ ATENÇÃO</p>
            <p className="text-amber-700 dark:text-amber-400">
              Este pedido já foi enviado. A solicitação de cancelamento será analisada, mas o pedido ainda pode ser entregue.
            </p>
            <ul className="list-disc pl-5 text-amber-700 dark:text-amber-400 space-y-1">
              <li>O pedido pode chegar mesmo após a solicitação</li>
              <li>Se entregue, será necessário devolver o produto</li>
              <li>O reembolso só ocorre após confirmação</li>
            </ul>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="ciente" checked={ciente} onCheckedChange={(v) => setCiente(!!v)} />
            <Label htmlFor="ciente" className="text-sm">Estou ciente e desejo continuar</Label>
          </div>

          <div className="space-y-2">
            <Label>Motivo *</Label>
            <Textarea value={motivo} onChange={e => setMotivo(e.target.value)} placeholder="Descreva o motivo..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Voltar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? 'Enviando...' : 'Solicitar Cancelamento'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
