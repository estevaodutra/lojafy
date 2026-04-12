import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddNoteModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderId: string;
  orderNumber: string;
  currentStatus: string;
  onSuccess: () => void;
}

export const AddNoteModal = ({
  open, onOpenChange, orderId, orderNumber, currentStatus, onSuccess,
}: AddNoteModalProps) => {
  const [tipo, setTipo] = useState<'interna' | 'cliente'>('interna');
  const [nota, setNota] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!nota.trim()) return;
    setLoading(true);
    try {
      const prefix = tipo === 'interna' ? '[Obs. Interna]' : '[Obs. para Cliente]';
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: currentStatus,
        notes: `${prefix} ${nota.trim()}`,
      });

      toast.success('Observação adicionada.');
      onOpenChange(false);
      setNota('');
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao adicionar observação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Adicionar Observação
          </DialogTitle>
          <DialogDescription>Pedido #{orderNumber}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <RadioGroup value={tipo} onValueChange={(v) => setTipo(v as any)} className="flex gap-4">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="interna" id="interna" />
                <Label htmlFor="interna" className="text-sm">Observação Interna (só equipe vê)</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="cliente" id="cliente" />
                <Label htmlFor="cliente" className="text-sm">Observação para Cliente</Label>
              </div>
            </RadioGroup>
          </div>

          <div className="space-y-2">
            <Label>Observação *</Label>
            <Textarea value={nota} onChange={e => setNota(e.target.value)} placeholder="Digite a observação..." rows={4} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!nota.trim() || loading}>
            {loading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
