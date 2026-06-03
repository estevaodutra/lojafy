import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Zap } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getAvailableTransitions,
  getStatusLabel,
  ORDER_STATUS_CONFIG,
  type OrderStatus,
} from '@/constants/orderStatus';

interface UpdateStatusModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  onSuccess: () => void;
}

export const UpdateStatusModal = ({
  open, onOpenChange, orderId, orderNumber, currentStatus, onSuccess,
}: UpdateStatusModalProps) => {
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const transitions = getAvailableTransitions(currentStatus);

  const canSubmit = () => {
    if (!newStatus) return false;
    if (newStatus === 'enviado' && !trackingNumber.trim()) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      let notes = `Status atualizado para: ${getStatusLabel(newStatus)}`;

      if (newStatus === 'enviado') {
        updateData.tracking_number = trackingNumber.trim();
        notes += ` | Rastreio: ${trackingNumber.trim()}`;
      }

      const { error } = await supabase.from('orders').update(updateData).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes,
      });

      toast.success(`Status atualizado para "${getStatusLabel(newStatus)}"`);
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      console.error('Erro:', error);
      toast.error(error.message || 'Erro ao atualizar status.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Atualizar Status do Pedido
          </DialogTitle>
          <DialogDescription>
            Pedido #{orderNumber} • Status Atual: {getStatusLabel(currentStatus)}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Novo Status *</Label>
            <Select value={newStatus} onValueChange={(v) => { setNewStatus(v); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {transitions.map(s => {
                  const cfg = ORDER_STATUS_CONFIG[s];
                  const Icon = cfg.icon;
                  return (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center gap-2">
                        <Icon className="h-4 w-4" />
                        {cfg.label}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {newStatus === 'enviado' && (
            <div className="space-y-2">
              <Label>Código de Rastreio *</Label>
              <Input value={trackingNumber} onChange={e => setTrackingNumber(e.target.value)} placeholder="Ex: BR123456789BR" />
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!canSubmit() || loading}>
            {loading ? 'Atualizando...' : 'Atualizar Status'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
