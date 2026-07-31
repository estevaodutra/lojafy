import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { transitionFulfillment } from '@/services/supplierFulfillmentService';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export const OCCURRENCE_TYPE_LABELS: Record<string, string> = {
  out_of_stock: 'Produto em falta',
  damaged: 'Produto avariado',
  wrong_item: 'Item incorreto',
  shipping_issue: 'Problema de envio',
  cancellation_request: 'Solicitação de cancelamento',
  carrier_delay: 'Atraso da transportadora',
  other: 'Outro',
};

interface OccurrenceFormProps {
  isOpen: boolean;
  onClose: () => void;
  /** Quando informado, a ocorrência é vinculada e o fulfillment vai para status 'occurrence'. */
  fulfillmentId?: string;
  orderId?: string;
  productId?: string;
}

export const OccurrenceForm = ({ isOpen, onClose, fulfillmentId, orderId, productId }: OccurrenceFormProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getEffectiveUserId } = useAuth();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const [type, setType] = useState('other');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      if (!orgId) throw new Error('Organização não carregada');
      const { error } = await supabase.from('supplier_occurrences').insert({
        organization_id: orgId,
        fulfillment_id: fulfillmentId ?? null,
        order_id: orderId ?? null,
        product_id: productId ?? null,
        occurrence_type: type,
        title: title.trim(),
        description: description.trim() || null,
        created_by: getEffectiveUserId(),
      });
      if (error) throw error;

      if (fulfillmentId) {
        await transitionFulfillment(fulfillmentId, 'occurrence');
      }
    },
    onSuccess: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
      toast({ title: 'Ocorrência registrada' });
      setTitle('');
      setDescription('');
      setType('other');
      onClose();
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar ocorrência', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova ocorrência</DialogTitle>
          <DialogDescription>
            {fulfillmentId
              ? 'O fulfillment será marcado como "Com Ocorrência" até a resolução.'
              : 'Registre um problema operacional para acompanhamento.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(OCCURRENCE_TYPE_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurrence-title">Título</Label>
            <Input
              id="occurrence-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Resumo do problema"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="occurrence-description">Descrição</Label>
            <Textarea
              id="occurrence-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!title.trim() || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Registrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
