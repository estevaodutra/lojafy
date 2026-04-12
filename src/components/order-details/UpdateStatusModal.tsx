import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import {
  getAvailableTransitions,
  getStatusLabel,
  ORDER_STATUS_CONFIG,
  CANCELLATION_REASONS,
  RETURN_REASONS,
  REASONS_REQUIRING_OBSERVATION,
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
  const [motivoAtraso, setMotivoAtraso] = useState('');
  const [previsaoEnvio, setPrevisaoEnvio] = useState<Date>();
  const [cancelamentoMotivo, setCancelamentoMotivo] = useState('');
  const [cancelamentoObs, setCancelamentoObs] = useState('');
  const [devolucaoMotivo, setDevolucaoMotivo] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter out 'cancelado' - must go through solicitation flow
  const transitions = getAvailableTransitions(currentStatus).filter(s => s !== 'cancelado');

  const canSubmit = () => {
    if (!newStatus) return false;
    if (newStatus === 'em_reposicao' && (!motivoAtraso.trim() || !previsaoEnvio)) return false;
    if (newStatus === 'em_falta' && !motivoAtraso.trim()) return false;
    if (newStatus === 'cancelado') {
      if (!cancelamentoMotivo) return false;
      if (REASONS_REQUIRING_OBSERVATION.includes(cancelamentoMotivo) && !cancelamentoObs.trim()) return false;
    }
    if (newStatus === 'devolucao_andamento' && !devolucaoMotivo) return false;
    if (newStatus === 'enviado' && !trackingNumber.trim()) return false;
    return true;
  };

  const handleSubmit = async () => {
    if (!canSubmit()) return;
    setLoading(true);
    try {
      const updateData: any = { status: newStatus };
      let notes = `Status atualizado para: ${getStatusLabel(newStatus)}`;

      if (newStatus === 'em_reposicao') {
        updateData.motivo_atraso = motivoAtraso.trim();
        updateData.previsao_envio = previsaoEnvio?.toISOString();
        notes += ` | Motivo: ${motivoAtraso.trim()} | Previsão: ${format(previsaoEnvio!, 'dd/MM/yyyy')}`;
      }
      if (newStatus === 'em_falta') {
        updateData.cancelamento_motivo = 'estoque_falta';
        updateData.cancelamento_observacao = motivoAtraso.trim();
        notes += ` | ${motivoAtraso.trim()}`;
      }
      if (newStatus === 'cancelado') {
        updateData.cancelamento_motivo = cancelamentoMotivo;
        updateData.cancelamento_observacao = cancelamentoObs.trim() || null;
        updateData.cancelado_em = new Date().toISOString();
        notes += ` | Motivo: ${CANCELLATION_REASONS.find(r => r.code === cancelamentoMotivo)?.label}`;
      }
      if (newStatus === 'devolucao_andamento') {
        updateData.devolucao_motivo = devolucaoMotivo;
        updateData.devolucao_iniciada_em = new Date().toISOString();
        notes += ` | Motivo: ${RETURN_REASONS.find(r => r.code === devolucaoMotivo)?.label}`;
      }
      if (newStatus === 'enviado') {
        updateData.tracking_number = trackingNumber.trim();
        notes += ` | Rastreio: ${trackingNumber.trim()}`;
      }
      if (newStatus === 'finalizado') {
        updateData.finalizado_em = new Date().toISOString();
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

          {/* Dynamic fields based on selected status */}
          {newStatus === 'em_reposicao' && (
            <>
              <div className="space-y-2">
                <Label>Previsão de Envio *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !previsaoEnvio && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {previsaoEnvio ? format(previsaoEnvio, 'dd/MM/yyyy') : 'Selecione a data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={previsaoEnvio} onSelect={setPrevisaoEnvio} disabled={(d) => d < new Date()} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Motivo do Atraso *</Label>
                <Textarea value={motivoAtraso} onChange={e => setMotivoAtraso(e.target.value)} placeholder="Explique o motivo do atraso..." />
              </div>
            </>
          )}

          {newStatus === 'em_falta' && (
            <div className="space-y-2">
              <Label>Motivo *</Label>
              <Textarea value={motivoAtraso} onChange={e => setMotivoAtraso(e.target.value)} placeholder="Explique o motivo da falta..." />
            </div>
          )}

          {newStatus === 'cancelado' && (
            <>
              <div className="space-y-2">
                <Label>Motivo do Cancelamento *</Label>
                <Select value={cancelamentoMotivo} onValueChange={setCancelamentoMotivo}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CANCELLATION_REASONS.map(r => (
                      <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {REASONS_REQUIRING_OBSERVATION.includes(cancelamentoMotivo) && (
                <div className="space-y-2">
                  <Label>Observação *</Label>
                  <Textarea value={cancelamentoObs} onChange={e => setCancelamentoObs(e.target.value)} placeholder="Detalhes..." />
                </div>
              )}
            </>
          )}

          {newStatus === 'devolucao_andamento' && (
            <div className="space-y-2">
              <Label>Motivo da Devolução *</Label>
              <Select value={devolucaoMotivo} onValueChange={setDevolucaoMotivo}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {RETURN_REASONS.map(r => (
                    <SelectItem key={r.code} value={r.code}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

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
