import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, 
  Copy, 
  Check, 
  Clock, 
  ShieldCheck, 
  Package, 
  QrCode, 
  ExternalLink,
  AlertCircle,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface PublicOrderItem {
  id: string;
  product_id?: string;
  name: string;
  sku?: string | null;
  quantity: number;
  unit_price: number;
  total_price: number;
  image_url?: string | null;
}

interface PublicOrderPaymentData {
  id: string;
  order_number: string;
  status: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'refunded';
  payment_method: string;
  total_amount: number;
  retail_sale_amount?: number;
  is_marketplace?: boolean;
  created_at: string;
  payment_expires_at?: string | null;
  customer: {
    name: string;
    cpf_masked?: string | null;
    city?: string | null;
    state?: string | null;
    neighborhood?: string | null;
  };
  items: PublicOrderItem[];
  pix: {
    copy_paste_code?: string | null;
    qr_code_base64?: string | null;
    qr_code_image_url?: string | null;
    expires_at?: string | null;
  };
}

export const PublicOrderPayment: React.FC = () => {
  const { orderId } = useParams<{ orderId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [order, setOrder] = useState<PublicOrderPaymentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!orderId) return;

    try {
      const { data, error: funcError } = await supabase.functions.invoke('public-order-payment', {
        body: { order_id: orderId },
      });

      if (funcError) {
        throw funcError;
      }

      if (data?.order) {
        setOrder(data.order);
        setError(null);
      } else {
        setError('Pedido não encontrado');
      }
    } catch (err: any) {
      console.error('[PublicOrderPayment] Erro ao carregar pedido:', err);
      setError(err?.message || 'Não foi possível carregar os dados deste pedido');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  // Polling a cada 5 segundos enquanto o pagamento estiver pendente
  useEffect(() => {
    if (!order || order.payment_status === 'paid') return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 5000);

    return () => clearInterval(interval);
  }, [order, fetchOrder]);

  // Contador regressivo de expiração do Pix
  useEffect(() => {
    const expiresAtStr = order?.pix?.expires_at || order?.payment_expires_at;
    if (!expiresAtStr || order?.payment_status === 'paid') {
      setTimeRemaining(null);
      return;
    }

    const updateTimer = () => {
      const diff = new Date(expiresAtStr).getTime() - Date.now();
      if (diff <= 0) {
        setTimeRemaining('Expirado');
        return;
      }

      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      if (hours > 0) {
        setTimeRemaining(`${hours}h ${minutes}m ${seconds}s`);
      } else {
        setTimeRemaining(`${minutes}m ${seconds}s`);
      }
    };

    updateTimer();
    const timer = setInterval(updateTimer, 1000);
    return () => clearInterval(timer);
  }, [order]);

  const handleCopyPix = () => {
    const code = order?.pix?.copy_paste_code;
    if (!code) return;

    navigator.clipboard.writeText(code);
    setCopied(true);
    toast({
      title: 'Código PIX copiado!',
      description: 'Abra o aplicativo do seu banco e escolha a opção "PIX Copia e Cola" para pagar.',
    });
    setTimeout(() => setCopied(false), 3000);
  };

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-[#5B47FB] mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Carregando detalhes do pagamento...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <Card className="max-w-md w-full border-border/80 shadow-lg text-center p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold text-foreground">Pedido não encontrado</h2>
          <p className="text-sm text-muted-foreground">
            {error || 'Não encontramos as informações deste pagamento. Verifique o link e tente novamente.'}
          </p>
        </Card>
      </div>
    );
  }

  const isPaid = order.payment_status === 'paid';
  const qrImageSrc = order.pix.qr_code_base64 
    ? `data:image/png;base64,${order.pix.qr_code_base64}`
    : order.pix.qr_code_image_url;

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-6">

        {/* Top Branding Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#5B47FB] text-white shadow-sm">
              <ShoppingBag className="h-5 w-5" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight text-foreground">Lojafy</span>
              <span className="text-xs text-muted-foreground block -mt-1">Pagamento Seguro</span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/50 px-2.5 py-1 rounded-full border border-emerald-500/20 font-medium">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ambiente Seguro</span>
          </div>
        </div>

        {/* Payment Confirmed State */}
        {isPaid ? (
          <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md overflow-hidden text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">Pagamento Confirmado!</h2>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                O pagamento do pedido <strong>#{order.order_number}</strong> foi aprovado com sucesso.
              </p>
            </div>
            <div className="pt-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300">
                Em preparação para envio
              </Badge>
            </div>
          </Card>
        ) : (
          /* Pending PIX Box */
          <Card className="border-border/80 shadow-md bg-card overflow-hidden">
            <CardHeader className="bg-slate-900 text-white dark:bg-slate-900/90 p-5">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <QrCode className="h-5 w-5 text-emerald-400" />
                    <CardTitle className="text-lg text-white">Pagamento via PIX</CardTitle>
                  </div>
                  <p className="text-xs text-slate-300">
                    Aprovação imediata e sem taxas adicionais
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs text-slate-400 block">
                    {order.is_marketplace ? "Custo do produto" : "Total a pagar"}
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {formatCurrency(order.total_amount)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* Timer indicator if available */}
              {timeRemaining && timeRemaining !== 'Expirado' && (
                <div className="flex items-center justify-between bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-300 px-3 py-2 rounded-lg text-xs font-medium">
                  <div className="flex items-center gap-1.5">
                    <Clock className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>Este código PIX expira em:</span>
                  </div>
                  <span className="font-mono font-bold text-sm">{timeRemaining}</span>
                </div>
              )}

              {/* QR Code Presentation */}
              <div className="flex flex-col items-center justify-center space-y-3">
                {qrImageSrc ? (
                  <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-200 flex flex-col items-center">
                    <img
                      src={qrImageSrc}
                      alt="QR Code Pix"
                      className="w-56 h-56 object-contain"
                    />
                    <span className="text-[11px] text-slate-500 mt-2 font-medium">
                      Aponte a câmera do seu celular no app do banco
                    </span>
                  </div>
                ) : (
                  <div className="p-8 text-center text-muted-foreground text-sm border border-dashed rounded-xl">
                    QR Code visual não disponível. Utilize o código copia e cola abaixo.
                  </div>
                )}

                {/* Direct link to QR code image */}
                {order.pix.qr_code_image_url && (
                  <a
                    href={order.pix.qr_code_image_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-[#5B47FB] hover:underline font-medium pt-1"
                  >
                    <span>Abrir / Compartilhar imagem do QR Code</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>

              {/* Copia e Cola */}
              {order.pix.copy_paste_code && (
                <div className="space-y-2 pt-2 border-t">
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-foreground">Pix Copia e Cola</span>
                    <span className="text-muted-foreground text-[11px]">Código de pagamento</span>
                  </div>

                  <div className="p-3 bg-muted/60 rounded-xl border border-border/60 space-y-2.5">
                    <div className="text-xs font-mono text-muted-foreground break-all line-clamp-3 select-all">
                      {order.pix.copy_paste_code}
                    </div>

                    <Button
                      onClick={handleCopyPix}
                      className={`w-full gap-2 font-semibold transition-all ${
                        copied 
                          ? 'bg-emerald-600 hover:bg-emerald-700 text-white' 
                          : 'bg-[#5B47FB] hover:bg-[#4C39EC] text-white shadow-sm'
                      }`}
                    >
                      {copied ? (
                        <>
                          <Check className="h-4 w-4" />
                          <span>Código PIX Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4" />
                          <span>Copiar Código PIX</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}

              {/* Instructions */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-xl space-y-2 text-xs text-muted-foreground border">
                <span className="font-semibold text-foreground block">Como pagar:</span>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Abra o aplicativo do seu banco no celular;</li>
                  <li>Escolha pagar via <strong>Pix com QR Code</strong> ou <strong>Pix Copia e Cola</strong>;</li>
                  <li>Cole o código copiado ou escaneie a imagem acima;</li>
                  <li>Confirme o valor e finalize o pagamento.</li>
                </ol>
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>A confirmação nesta tela é automática após o pagamento.</span>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

        {/* Order Details Card (NO SUPPLIER INFO) */}
        <Card className="border-border/80 shadow-sm bg-card">
          <CardHeader className="pb-3 border-b">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-muted-foreground" />
                <CardTitle className="text-base">Detalhes do Pedido #{order.order_number}</CardTitle>
              </div>
              <Badge variant={isPaid ? 'default' : 'secondary'} className="text-xs">
                {isPaid ? 'Pago' : 'Aguardando Pagamento'}
              </Badge>
            </div>
          </CardHeader>

          <CardContent className="p-5 space-y-4">
            {/* Customer Details */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-muted/30 p-3 rounded-lg border">
              <div>
                <span className="text-muted-foreground block">Destinatário:</span>
                <span className="font-semibold text-foreground">{order.customer.name}</span>
                {order.customer.cpf_masked && (
                  <span className="text-muted-foreground block text-[11px]">CPF: {order.customer.cpf_masked}</span>
                )}
              </div>
              {(order.customer.city || order.customer.state) && (
                <div>
                  <span className="text-muted-foreground block">Entrega em:</span>
                  <span className="font-semibold text-foreground">
                    {[order.customer.city, order.customer.state].filter(Boolean).join(' - ')}
                  </span>
                  {order.customer.neighborhood && (
                    <span className="text-muted-foreground block text-[11px]">{order.customer.neighborhood}</span>
                  )}
                </div>
              )}
            </div>

            {/* Items List */}
            <div className="space-y-2">
              <span className="text-xs font-semibold text-foreground">Itens inclusos:</span>
              <div className="divide-y divide-border/60 border rounded-lg overflow-hidden bg-card">
                {order.items.map((it, idx) => (
                  <div key={it.id || idx} className="p-3 flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 flex-1 min-w-0">
                      {it.image_url ? (
                        <img 
                          src={it.image_url} 
                          alt={it.name}
                          className="w-10 h-10 rounded-md object-cover border shrink-0 bg-white" 
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-5 w-5 text-muted-foreground" />
                        </div>
                      )}
                      <div className="truncate">
                        <span className="font-medium text-foreground block truncate">{it.name}</span>
                        <span className="text-[11px] text-muted-foreground">
                          Qtd: {it.quantity} &times; {formatCurrency(it.unit_price)}
                        </span>
                      </div>
                    </div>
                    <span className="font-semibold text-foreground shrink-0">
                      {formatCurrency(it.total_price)}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Total Row */}
            <Separator />
            <div className="flex items-center justify-between pt-1">
              <span className="font-bold text-sm text-foreground">
                {order.is_marketplace ? "Custo do Pedido (Lojafy):" : "Total:"}
              </span>
              <span className="font-extrabold text-lg text-emerald-600 dark:text-emerald-400">
                {formatCurrency(order.total_amount)}
              </span>
            </div>
            {order.is_marketplace && !!order.retail_sale_amount && (
              <p className="text-[11px] text-muted-foreground text-right pt-0.5">
                Venda no Marketplace: {formatCurrency(order.retail_sale_amount)} • Cobrança de fulfillment pelo custo do produto
              </p>
            )}

          </CardContent>
        </Card>

      </div>
    </div>
  );
};

export default PublicOrderPayment;
