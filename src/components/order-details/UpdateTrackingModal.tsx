import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Tag } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UpdateTrackingModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  currentTracking?: string;
  onSuccess: () => void;
}

export const UpdateTrackingModal = ({
  open, onOpenChange, orderId, orderNumber, currentTracking, onSuccess,
}: UpdateTrackingModalProps) => {
  const [tracking, setTracking] = useState('');
  const [notifyClient, setNotifyClient] = useState(true);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!tracking.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.from('orders').update({
        tracking_number: tracking.trim(),
      }).eq('id', orderId);
      if (error) throw error;

      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: 'enviado',
        notes: `Código de rastreio atualizado: ${tracking.trim()}`,
      });

      toast.success('Código de rastreio atualizado.');
      onOpenChange(false);
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar rastreio.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            Atualizar Código de Rastreio
          </DialogTitle>
          <DialogDescription>Pedido #{orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {currentTracking && (
            <div className="text-sm">
              <span className="text-muted-foreground">Código Atual:</span>{' '}
              <span className="font-medium">{currentTracking}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>Novo Código de Rastreio</Label>
            <Input value={tracking} onChange={e => setTracking(e.target.value)} placeholder="Ex: BR123456789BR" />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox id="notify" checked={notifyClient} onCheckedChange={(v) => setNotifyClient(!!v)} />
            <Label htmlFor="notify" className="text-sm">Notificar cliente sobre atualização</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!tracking.trim() || loading}>
            {loading ? 'Atualizando...' : 'Atualizar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
