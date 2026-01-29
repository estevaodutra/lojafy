import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Phone } from 'lucide-react';
import { formatPhone, cleanPhone, validatePhone } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface WhatsAppRequiredModalProps {
  userId: string;
  onComplete: () => void;
}

export const WhatsAppRequiredModal = ({ userId, onComplete }: WhatsAppRequiredModalProps) => {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!validatePhone(phone)) {
      toast.error('Número inválido. Informe um telefone com DDD.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: cleanPhone(phone) })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erro ao salvar o número.');
      setSaving(false);
      return;
    }

    toast.success('WhatsApp cadastrado com sucesso!');
    onComplete();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md [&>button]:hidden"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-emerald-500" />
            Cadastre seu WhatsApp
          </DialogTitle>
          <DialogDescription>
            Para continuar usando a plataforma, é necessário cadastrar seu número de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+55 (11) 99999-9999"
                className="pl-10"
                maxLength={19}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Informe seu número com DDD para receber notificações importantes.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !validatePhone(phone)}
            className="w-full"
          >
            {saving ? 'Salvando...' : 'Salvar e Continuar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
