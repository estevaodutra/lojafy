import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, Copy, QrCode } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import type { PixPaymentData } from "@/types";

interface PixPaymentProps {
  paymentData: PixPaymentData;
  onPaymentConfirmed?: () => void;
}

export default function PixPayment({ paymentData, onPaymentConfirmed }: PixPaymentProps) {
  const [timeRemaining, setTimeRemaining] = useState<string>("");
  const [isExpired, setIsExpired] = useState(false);
  const { toast } = useToast();

  // Calculate time remaining for PIX expiration
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const now = new Date().getTime();
      const expiresAt = new Date(paymentData.expires_at).getTime();
      const difference = expiresAt - now;

      if (difference > 0) {
        const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((difference % (1000 * 60)) / 1000);

        setTimeRemaining(`${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`);
        setIsExpired(false);
      } else {
        setTimeRemaining("00:00:00");
        setIsExpired(true);
      }
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [paymentData.expires_at]);

  // Copy PIX code to clipboard
  const copyPixCode = async () => {
    try {
      await navigator.clipboard.writeText(paymentData.qr_code);
      toast({
        title: "Código PIX copiado!",
        description: "Cole o código no seu app do banco para efetuar o pagamento.",
      });
    } catch (error) {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código PIX. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = () => {
    switch (paymentData.status) {
      case 'approved':
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case 'pending':
      case 'in_process':
        return <Clock className="h-6 w-6 text-yellow-600" />;
      default:
        return <Clock className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusText = () => {
    switch (paymentData.status) {
      case 'approved':
        return "Pagamento aprovado!";
      case 'pending':
        return "Aguardando pagamento...";
      case 'in_process':
        return "Processando pagamento...";
      case 'rejected':
        return "Pagamento rejeitado";
      case 'cancelled':
        return "Pagamento cancelado";
      default:
        return "Status desconhecido";
    }
  };

  if (paymentData.status === 'approved') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2 text-green-600">
            <CheckCircle className="h-8 w-8" />
            Pagamento Confirmado!
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-gray-600">
            Seu pagamento PIX foi processado com sucesso.
          </p>
          <p className="text-sm text-gray-500">
            ID do Pagamento: {paymentData.payment_id}
          </p>
          {onPaymentConfirmed && (
            <Button onClick={onPaymentConfirmed} className="w-full">
              Continuar
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          {getStatusIcon()}
          Pague com PIX
        </CardTitle>
        <p className="text-sm text-gray-600 mt-2">
          {getStatusText()}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* QR Code */}
        <div className="text-center">
          <div className="inline-block p-4 bg-white rounded-lg border">
            <img 
              src={`data:image/png;base64,${paymentData.qr_code_base64}`} 
              alt="QR Code PIX"
              className="w-48 h-48 mx-auto"
            />
          </div>
          <p className="text-sm text-gray-600 mt-2">
            Escaneie o QR Code com o app do seu banco
          </p>
        </div>

        {/* PIX Code */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">
            Ou copie e cole o código PIX:
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={paymentData.qr_code}
              readOnly
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-xs font-mono bg-gray-50"
            />
            <Button onClick={copyPixCode} size="sm" variant="outline">
              <Copy className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Timer */}
        <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
          <div className="flex items-center justify-center gap-2 text-yellow-700">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">
              {isExpired ? "Código PIX expirado" : `Expira em: ${timeRemaining}`}
            </span>
          </div>
          {isExpired && (
            <p className="text-xs text-yellow-600 mt-1">
              Gere um novo código PIX para continuar
            </p>
          )}
        </div>

        {/* Instructions */}
        <div className="text-xs text-gray-500 space-y-1">
          <p>📱 Abra o app do seu banco</p>
          <p>📷 Escaneie o QR Code ou cole o código</p>
          <p>✅ Confirme o pagamento</p>
          <p>⏱️ O pagamento será processado em instantes</p>
        </div>

        {/* Payment ID */}
        <div className="text-center text-xs text-gray-400 border-t pt-2">
          ID: {paymentData.payment_id}
        </div>
      </CardContent>
    </Card>
  );
}