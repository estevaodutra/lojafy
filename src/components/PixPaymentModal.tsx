import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Copy, Clock, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PixPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  qrCodeBase64: string;
  qrCodeCopyPaste: string;
  paymentId: string;
  amount: number;
  onPaymentConfirmed?: () => void;
}

export function PixPaymentModal({
  isOpen,
  onClose,
  qrCodeBase64,
  qrCodeCopyPaste,
  paymentId,
  amount,
  onPaymentConfirmed
}: PixPaymentModalProps) {
  const [copied, setCopied] = useState(false);
  const [checking, setChecking] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(900); // 15 minutes in seconds
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && timeRemaining > 0) {
      const timer = setInterval(() => {
        setTimeRemaining(prev => prev - 1);
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [isOpen, timeRemaining]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(qrCodeCopyPaste);
      setCopied(true);
      toast({
        title: "Código copiado!",
        description: "Cole no seu app de pagamento para finalizar a compra.",
      });
      setTimeout(() => setCopied(false), 3000);
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX.",
        variant: "destructive",
      });
    }
  };

  const checkPaymentStatus = async () => {
    setChecking(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select('payment_status')
        .eq('payment_id', paymentId)
        .single();

      if (error) throw error;

      if (data?.payment_status === 'paid') {
        toast({
          title: "Pagamento confirmado!",
          description: "Seu pedido foi processado com sucesso.",
        });
        onPaymentConfirmed?.();
        onClose();
      } else {
        toast({
          title: "Pagamento pendente",
          description: "O pagamento ainda não foi confirmado.",
        });
      }
    } catch (error) {
      console.error('Error checking payment status:', error);
      toast({
        title: "Erro",
        description: "Não foi possível verificar o status do pagamento.",
        variant: "destructive",
      });
    } finally {
      setChecking(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Pagamento PIX</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Valor a pagar:</p>
                  <p className="text-2xl font-bold">R$ {amount.toFixed(2).replace('.', ',')}</p>
                </div>

                <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  <span>Expira em: {formatTime(timeRemaining)}</span>
                </div>

                <div className="bg-white p-4 rounded-lg border">
                  <img
                    src={`data:image/png;base64,${qrCodeBase64}`}
                    alt="QR Code PIX"
                    className="w-full max-w-[200px] mx-auto"
                  />
                </div>

                <div className="text-xs text-muted-foreground">
                  <p>1. Abra o app do seu banco</p>
                  <p>2. Escaneie o QR Code ou copie o código</p>
                  <p>3. Confirme o pagamento</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-3">
            <Button
              onClick={copyPixCode}
              className="w-full h-12 text-base font-semibold shadow-md"
              size="lg"
            >
              <Copy className="h-5 w-5 mr-2" />
              {copied ? "Código copiado!" : "Copiar código PIX"}
            </Button>

            <Button
              onClick={checkPaymentStatus}
              className="w-full"
              variant="secondary"
              disabled={checking}
            >
              {checking ? (
                "Verificando..."
              ) : (
                <>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Verificar pagamento
                </>
              )}
            </Button>

            <Button
              onClick={onClose}
              variant="ghost"
              className="w-full"
            >
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}