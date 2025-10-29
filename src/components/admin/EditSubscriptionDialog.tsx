import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface EditSubscriptionDialogProps {
  isOpen: boolean;
  onClose: () => void;
  user: {
    user_id: string;
    first_name: string;
    last_name: string;
    subscription_plan?: string;
    subscription_expires_at?: string;
    subscription_payment_url?: string;
  };
  onSuccess: () => void;
}

export const EditSubscriptionDialog = ({ isOpen, onClose, user, onSuccess }: EditSubscriptionDialogProps) => {
  const { toast } = useToast();
  const [plan, setPlan] = useState<'free' | 'premium'>(
    (user.subscription_plan as 'free' | 'premium') || 'free'
  );
  const [expiresAt, setExpiresAt] = useState<Date | undefined>(
    user.subscription_expires_at ? new Date(user.subscription_expires_at) : undefined
  );
  const [paymentUrl, setPaymentUrl] = useState(user.subscription_payment_url || '');
  const [isLoading, setIsLoading] = useState(false);

  const handleSave = async () => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subscription_plan: plan,
          subscription_expires_at: expiresAt ? expiresAt.toISOString() : null,
          subscription_payment_url: paymentUrl || null,
        })
        .eq('user_id', user.user_id);

      if (error) throw error;

      toast({
        title: 'Assinatura atualizada',
        description: 'O plano do usuário foi atualizado com sucesso.',
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error updating subscription:', error);
      toast({
        title: 'Erro ao atualizar',
        description: 'Não foi possível atualizar a assinatura.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>
            Editar Assinatura - {user.first_name} {user.last_name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="plan">Plano</Label>
            <Select value={plan} onValueChange={(value: 'free' | 'premium') => setPlan(value)}>
              <SelectTrigger id="plan">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="free">🆓 Free</SelectItem>
                <SelectItem value="premium">👑 Premium</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {plan === 'premium' && (
            <>
              <div className="space-y-2">
                <Label>Data de Expiração</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        'w-full justify-start text-left font-normal',
                        !expiresAt && 'text-muted-foreground'
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {expiresAt ? format(expiresAt, 'dd/MM/yyyy') : 'Selecione uma data'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={expiresAt}
                      onSelect={setExpiresAt}
                      disabled={(date) => date < new Date()}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="paymentUrl">URL de Pagamento (Opcional)</Label>
                <Input
                  id="paymentUrl"
                  type="url"
                  placeholder="https://..."
                  value={paymentUrl}
                  onChange={(e) => setPaymentUrl(e.target.value)}
                />
              </div>
            </>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? 'Salvando...' : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
