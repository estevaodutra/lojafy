import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Copy, Check, Link, Clock, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

interface GenerateAccessLinkModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
}

export const GenerateAccessLinkModal = ({
  open,
  onOpenChange,
  userId,
  userName,
}: GenerateAccessLinkModalProps) => {
  const [loading, setLoading] = useState(false);
  const [link, setLink] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    setLink('');
    setExpiresAt('');

    try {
      const { data, error } = await supabase.functions.invoke('generate-onetime-link', {
        body: { user_id: userId },
      });

      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Erro ao gerar link');
      }

      setLink(data.link);
      setExpiresAt(new Date(data.expires_at).toLocaleString('pt-BR'));
      toast.success('Link gerado com sucesso!');
    } catch (err: any) {
      console.error('Error generating link:', err);
      toast.error(err.message || 'Erro ao gerar link de acesso');
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success('Link copiado!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Erro ao copiar link');
    }
  };

  const handleClose = () => {
    setLink('');
    setExpiresAt('');
    setCopied(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link className="h-5 w-5" />
            Gerar Link de Acesso Único
          </DialogTitle>
          <DialogDescription>
            Gere um link de acesso único para <strong>{userName}</strong>. 
            O link permite login automático e direciona para o onboarding.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {!link ? (
            <div className="space-y-4">
              <div className="p-4 bg-muted rounded-lg space-y-2">
                <div className="flex items-start gap-2 text-sm">
                  <AlertCircle className="h-4 w-4 mt-0.5 text-amber-500" />
                  <div>
                    <p className="font-medium">Atenção</p>
                    <p className="text-muted-foreground">
                      O link será válido por 24 horas e só pode ser usado uma vez.
                    </p>
                  </div>
                </div>
              </div>

              <Button 
                onClick={handleGenerate} 
                disabled={loading}
                className="w-full"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Gerando...
                  </>
                ) : (
                  <>
                    <Link className="h-4 w-4 mr-2" />
                    Gerar Link
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Link de Acesso</Label>
                <div className="flex gap-2">
                  <Input 
                    value={link} 
                    readOnly 
                    className="font-mono text-xs"
                  />
                  <Button 
                    variant="outline" 
                    size="icon"
                    onClick={handleCopy}
                  >
                    {copied ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>

              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Expira em: {expiresAt}</span>
              </div>

              <div className="p-3 bg-muted border rounded-lg text-sm">
                <p className="font-medium">✓ Link gerado com sucesso!</p>
                <p className="mt-1">
                  Envie este link para o revendedor. Ao clicar, ele será autenticado 
                  automaticamente e direcionado para a página de onboarding.
                </p>
              </div>

              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleGenerate}
                  disabled={loading}
                  className="flex-1"
                >
                  Gerar Novo Link
                </Button>
                <Button 
                  onClick={handleClose}
                  className="flex-1"
                >
                  Fechar
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
