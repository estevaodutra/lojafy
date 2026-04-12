import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RotateCcw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RETURN_REASONS } from '@/constants/orderStatus';

interface RequestReturnModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  deliveredAt?: string | null;
  onSuccess: () => void;
}

export const RequestReturnModal = ({
  open, onOpenChange, orderId, orderNumber, deliveredAt, onSuccess,
}: RequestReturnModalProps) => {
  const [motivo, setMotivo] = useState('');
  const [descricao, setDescricao] = useState('');
  const [loading, setLoading] = useState(false);

  const canSubmit = motivo && descricao.trim();

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        status: 'devolucao_andamento',
        devolucao_motivo: motivo,
        devolucao_iniciada_em: new Date().toISOString(),
      }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'devolucao_andamento',
        notes: `Devolução solicitada: ${RETURN_REASONS.find(r => r.code === motivo)?.label || motivo} - ${descricao.trim()}`,
      });

      toast.success('Solicitação de devolução enviada.');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao solicitar devolução.');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('pt-BR');

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5" />
            Solicitar Devolução
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber}{deliveredAt ? ` • Entregue em ${formatDate(deliveredAt)}` : ''}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Motivo da Devolução *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {RETURN_REASONS.map(r => (
                  <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Descreva o problema *</Label>
            <Textarea value={descricao} onChange={e => setDescricao(e.target.value)} placeholder="Detalhe o que aconteceu com o produto..." />
          </div>

          <div className="p-3 rounded-lg bg-muted border text-sm space-y-1">
            <p className="font-medium">📋 Próximos Passos</p>
            <ol className="list-decimal pl-5 text-muted-foreground space-y-1">
              <li>Sua solicitação será analisada</li>
              <li>Se aprovada, você receberá instruções de envio</li>
              <li>Após recebimento do produto, o valor será creditado na sua carteira</li>
            </ol>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit || loading}>
            {loading ? 'Enviando...' : 'Enviar Solicitação'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
