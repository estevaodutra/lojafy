import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, QrCode, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface ModernPixPaymentProps {
  qrCode: string;
  qrCodeBase64: string;
  amount: number;
  paymentId?: string;
  onPaymentConfirmed?: () => void;
}

export const ModernPixPayment: React.FC<ModernPixPaymentProps> = ({
  qrCode,
  qrCodeBase64,
  amount,
  paymentId,
  onPaymentConfirmed
}) => {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCode);
      setCopied(true);
      toast({
        title: "Código PIX copiado!",
        description: "Cole no app do seu banco para efetuar o pagamento",
      });
      
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
      toast({
        title: "Erro ao copiar",
        description: "Tente novamente ou copie manualmente",
        variant: "destructive",
      });
    }
  };

  const checkPaymentStatus = async () => {
    if (!paymentId) {
      toast({
        title: "Erro",
        description: "ID do pagamento não encontrado",
        variant: "destructive",
      });
      return;
    }

    setChecking(true);
    try {
      const { data: order, error } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('payment_id', paymentId)
        .single();

      if (error) {
        throw error;
      }

      if (order?.payment_status === 'paid') {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pagamento foi processado com sucesso",
        });
        onPaymentConfirmed?.();
      } else {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi processado",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Erro ao verificar status",
        description: "Tente novamente em alguns instantes",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto space-y-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-primary">
          <QrCode className="h-6 w-6" />
          <span className="text-lg font-semibold">Pagamento PIX</span>
        </div>
        <p className="text-muted-foreground text-sm">
          Escaneie o QR Code ou copie o código PIX
        </p>
      </div>

      {/* Amount Display */}
      <Card className="border-primary/20 bg-gradient-to-br from-background to-muted/20">
        <CardContent className="pt-6">
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-1">Valor a pagar</p>
            <p className="text-3xl font-bold text-primary">
              R$ {amount.toFixed(2).replace('.', ',')}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* QR Code */}
      <Card className="overflow-hidden">
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-sm font-medium">
            Escaneie com seu app bancário
          </CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center pb-6">
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl blur-xl"></div>
            <div className="relative bg-white p-4 rounded-xl shadow-lg">
              {qrCodeBase64 ? (
                <img 
                  src={`data:image/png;base64,${qrCodeBase64}`}
                  alt="QR Code PIX"
                  className="w-48 h-48 object-contain"
                />
              ) : (
                <div className="w-48 h-48 bg-muted rounded-lg flex items-center justify-center">
                  <QrCode className="h-12 w-12 text-muted-foreground" />
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* PIX Code */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-center text-sm font-medium">
            Ou copie o código PIX
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="bg-muted rounded-lg p-4">
            <p className="text-xs font-mono break-all text-center text-muted-foreground">
              {qrCode}
            </p>
          </div>
          
          <div className="space-y-3">
            <Button 
              onClick={copyPixCode}
              className="w-full h-12 text-base font-medium relative overflow-hidden group"
              disabled={!qrCode}
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-foreground opacity-0 group-hover:opacity-10 transition-opacity"></div>
              {copied ? (
                <>
                  <Check className="mr-2 h-5 w-5" />
                  Copiado!
                </>
              ) : (
                <>
                  <Copy className="mr-2 h-5 w-5" />
                  Copiar código PIX
                </>
              )}
            </Button>

            <Button 
              onClick={checkPaymentStatus}
              variant="outline"
              className="w-full h-12 text-base font-medium"
              disabled={checking || !paymentId}
            >
              {checking ? (
                <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="mr-2 h-5 w-5" />
                  Verificar status
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card className="bg-accent/10 border-accent/30">
        <CardContent className="pt-6">
          <div className="space-y-3 text-sm">
            <h4 className="font-medium text-accent-foreground">Como pagar:</h4>
            <ol className="space-y-2 text-muted-foreground">
              <li className="flex gap-2">
                <span className="text-accent font-bold">1.</span>
                Abra o app do seu banco
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">2.</span>
                Escolha a opção PIX
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">3.</span>
                Escaneie o QR Code ou cole o código
              </li>
              <li className="flex gap-2">
                <span className="text-accent font-bold">4.</span>
                Confirme o pagamento
              </li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};