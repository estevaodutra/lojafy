import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { applyInventoryMovement, type MovementType } from '@/services/inventoryService';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

interface StockAdjustDialogProps {
  product: { id: string; name: string; stock: number } | null;
  onClose: () => void;
}

/** Ajuste manual de estoque — sempre via RPC apply_inventory_movement (ledger). */
export const StockAdjustDialog = ({ product, onClose }: StockAdjustDialogProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();

  const [type, setType] = useState<MovementType>('entry');
  const [quantity, setQuantity] = useState('');
  const [reason, setReason] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const qty = parseInt(quantity, 10);
      if (!Number.isFinite(qty) || qty === 0) throw new Error('Quantidade inválida');
      return applyInventoryMovement({
        productId: product!.id,
        movementType: type,
        quantity: type === 'adjustment' ? qty : Math.abs(qty),
        reason: reason.trim() || undefined,
      });
    },
    onSuccess: (newQuantity) => {
      if (orgData) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgData.organization.id) });
      toast({ title: `Estoque atualizado: ${newQuantity} unidades` });
      setQuantity('');
      setReason('');
      onClose();
    },
    onError: (error: Error) =>
      toast({ title: 'Erro na movimentação', description: error.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Movimentar estoque</DialogTitle>
          <DialogDescription>
            {product?.name} — físico atual: {product?.stock}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={type} onValueChange={(v) => setType(v as MovementType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="entry">Entrada</SelectItem>
                <SelectItem value="exit">Saída</SelectItem>
                <SelectItem value="adjustment">Ajuste (+/-)</SelectItem>
                <SelectItem value="return_entry">Entrada por devolução</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-qty">Quantidade{type === 'adjustment' ? ' (use negativo para reduzir)' : ''}</Label>
            <Input
              id="adjust-qty"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="adjust-reason">Motivo</Label>
            <Input
              id="adjust-reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Ex.: reposição do fornecedor"
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={!quantity || mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Aplicar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
