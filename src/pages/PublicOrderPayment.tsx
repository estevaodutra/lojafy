import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
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
  ShoppingBag,
  Link2,
  Truck,
  Info,
  FileText
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

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
  sale_amount?: number;
  marketplace_fee?: number;
  seller_cost?: number;
  seller_profit?: number;
  seller_margin_pct?: number;
  is_marketplace?: boolean;
  ml_order_id?: string | null;
  external_reference?: string | null;
  channel?: string | null;
  channel_label?: string | null;
  origin_type?: string | null;
  tracking_number?: string | null;
  has_shipping_label?: boolean;
  shipping_label_status?: string | null;
  seller_name?: string | null;
  time_in_stage_display?: string | null;
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

  // Polling a cada 4 segundos enquanto o pagamento estiver pendente
  useEffect(() => {
    if (!order || order.payment_status === 'paid') return;

    const interval = setInterval(() => {
      fetchOrder();
    }, 4000);

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

  const formatBRL = (val: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);

  const formatAmountOnly = (val: number) =>
    Math.abs(val || 0).toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });

  const formatPercent = (val: number) =>
    `${(val || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4">
          <RefreshCw className="h-8 w-8 animate-spin text-[#5B47FB] mx-auto" />
          <p className="text-sm font-medium text-muted-foreground">Carregando detalhes do pedido e pagamento...</p>
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

  const isPaid = order.payment_status === 'paid' || ['pago', 'recebido', 'embalado', 'enviado', 'finalizado'].includes(order.status);
  const qrImageSrc = order.pix.qr_code_base64 
    ? `data:image/png;base64,${order.pix.qr_code_base64}`
    : order.pix.qr_code_image_url;

  const saleVal = order.sale_amount || order.retail_sale_amount || 0;
  const costVal = order.total_amount || order.seller_cost || 0;
  const feeVal = order.marketplace_fee || 0;
  const profitVal = order.seller_profit !== undefined ? order.seller_profit : Math.max(0, saleVal - feeVal - costVal);
  const marginPct = order.seller_margin_pct !== undefined ? order.seller_margin_pct : (saleVal > 0 ? (profitVal / saleVal) * 100 : 0);

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-slate-100/70 to-slate-200/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 py-8 px-4 sm:px-6">
      <div className="max-w-xl mx-auto space-y-5">

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

        {/* 1. CABEÇALHO COM DETALHES COMPLETOS DO PEDIDO (Idêntico ao Card do Kanban) */}
        <Card className="border border-border/80 shadow-md bg-card overflow-hidden">
          {/* Top Bar com Identificadores e Badges */}
          <div className="p-4 sm:p-5 border-b border-border/60 bg-muted/20">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xl font-bold tracking-tight text-foreground">
                    #{order.order_number}
                  </span>
                  {order.ml_order_id && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800">
                      ML: #{order.ml_order_id}
                    </span>
                  )}
                </div>

                {order.external_reference && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Link2 className="w-3.5 h-3.5 shrink-0 text-muted-foreground" />
                    <span className="truncate">{order.external_reference}</span>
                  </div>
                )}

                {order.tracking_number && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground font-mono">
                    <Truck className="w-3.5 h-3.5 shrink-0 text-blue-500" />
                    <span className="truncate">Rastreio: {order.tracking_number}</span>
                  </div>
                )}

                {order.time_in_stage_display && (
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 text-muted-foreground/80" />
                    <span>{order.time_in_stage_display}</span>
                  </div>
                )}
              </div>

              {/* Badges de Canal, Modalidade e Etiqueta */}
              <div className="flex flex-col items-end gap-1.5 shrink-0">
                <div className="flex items-center gap-1">
                  <Badge
                    variant="outline"
                    className="text-[10px] px-2 py-0.5 font-semibold uppercase tracking-wider bg-yellow-50 text-yellow-800 border-yellow-300 dark:bg-yellow-950/40 dark:text-yellow-300 dark:border-yellow-800"
                  >
                    {order.channel_label || (order.ml_order_id ? 'ML' : 'LOJAFY')}
                  </Badge>

                  <Badge
                    variant="secondary"
                    className="text-[10px] px-2 py-0.5 font-semibold tracking-wider bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300"
                  >
                    {order.origin_type || 'AUTO'}
                  </Badge>
                </div>

                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] px-2 py-0.5 font-medium flex items-center gap-1",
                    order.has_shipping_label || order.shipping_label_status === 'ready'
                      ? "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900"
                      : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700"
                  )}
                >
                  <FileText className="w-3 h-3" />
                  <span>
                    {order.has_shipping_label || order.shipping_label_status === 'ready'
                      ? 'Etiqueta Liberada'
                      : 'Aguardando Etiqueta'}
                  </span>
                </Badge>
              </div>
            </div>
          </div>

          <CardContent className="p-4 sm:p-5 space-y-4">
            {/* Produto */}
            <div className="space-y-2">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40 border border-border/50">
                  <div className="w-14 h-14 shrink-0 rounded-md bg-background border overflow-hidden flex items-center justify-center">
                    {it.image_url ? (
                      <img src={it.image_url} alt={it.name} className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-6 h-6 text-muted-foreground" />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground leading-snug line-clamp-2">
                      {it.name}
                    </p>
                    <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                      <span>{it.quantity} un.</span>
                      {it.sku && <span className="font-mono text-[11px]">• SKU: {it.sku}</span>}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Partes Operacionais: Seller e Cliente (SEM dados Lojafy e SEM Fornecedor) */}
            <div className="grid grid-cols-1 gap-1.5 text-xs py-2.5 border-y border-border/40">
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Seller:</span>
                <span className="font-semibold text-foreground">{order.seller_name || 'LAVINIA VALIM'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted-foreground font-medium">Cliente:</span>
                <span className="font-semibold text-foreground">{order.customer.name}</span>
              </div>
              {(order.customer.city || order.customer.state) && (
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground font-medium">Destino:</span>
                  <span className="text-muted-foreground">
                    {[order.customer.city, order.customer.state].filter(Boolean).join(' / ')}
                  </span>
                </div>
              )}
            </div>

            {/* Detalhamento Financeiro dos Valores (Idêntico ao Card Contábil) */}
            <div className="pt-1 space-y-1.5">
              <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-2 gap-y-1.5 text-sm">
                {/* Venda */}
                <span className="text-muted-foreground font-medium">Venda</span>
                <span className="font-mono text-muted-foreground text-right text-xs">R$</span>
                <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                  {formatAmountOnly(saleVal)}
                </span>

                {/* Taxas Marketplace com Tooltip Informativo */}
                <span className="inline-flex items-center gap-1.5 text-muted-foreground font-medium">
                  <span>Taxas</span>
                  <TooltipProvider delayDuration={200}>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="cursor-help inline-flex items-center">
                          <Info className="w-3.5 h-3.5 text-muted-foreground/70 hover:text-foreground" />
                        </span>
                      </TooltipTrigger>
                      <TooltipContent side="top" className="max-w-[260px] p-2.5 space-y-1.5 text-xs bg-popover text-popover-foreground shadow-md border">
                        <p className="font-semibold text-foreground text-xs">Composição das Taxas (Mercado Livre):</p>
                        <div className="space-y-1 text-xs">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Tarifa fixa unitária (&lt; R$ 79):</span>
                            <span className="font-mono text-rose-500 font-medium">R$ 6,00</span>
                          </div>
                          <div className="flex justify-between text-muted-foreground">
                            <span>Comissão anúncio:</span>
                            <span className="font-mono text-rose-500 font-medium">
                              R$ {Math.max(0, feeVal - 6).toFixed(2).replace('.', ',')}
                            </span>
                          </div>
                          <div className="border-t pt-1 flex justify-between font-semibold">
                            <span>Total retido pelo ML:</span>
                            <span className="font-mono text-rose-600">-R$ {feeVal.toFixed(2).replace('.', ',')}</span>
                          </div>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </span>
                <span className="font-mono text-rose-600 dark:text-rose-400 text-right text-xs font-medium">-R$</span>
                <span className="font-mono font-medium text-rose-600 dark:text-rose-400 text-right tabular-nums">
                  {formatAmountOnly(feeVal)}
                </span>

                {/* Custo do Produto */}
                <span className="text-muted-foreground font-medium">Custo do produto</span>
                <span className="font-mono text-muted-foreground text-right text-xs">R$</span>
                <span className="font-mono font-semibold text-foreground text-right tabular-nums">
                  {formatAmountOnly(costVal)}
                </span>

                {/* Lucro Líquido com Percentual */}
                <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                  <span>Lucro Líquido:</span>
                  <span className="font-mono text-xs font-bold">{formatPercent(marginPct)}</span>
                </span>
                <span className="font-mono text-emerald-600 dark:text-emerald-400 text-right text-xs font-semibold">R$</span>
                <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400 text-right tabular-nums text-base">
                  {formatAmountOnly(profitVal)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 2. PARTE DO PAGAMENTO (EMBAIXO DOS DETALHES) */}
        {isPaid ? (
          <Card className="border-emerald-500/30 bg-emerald-50/50 dark:bg-emerald-950/20 shadow-md overflow-hidden text-center p-8 space-y-4">
            <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/30 animate-in zoom-in-50 duration-300">
              <CheckCircle2 className="h-9 w-9 stroke-[2.5]" />
            </div>
            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-emerald-950 dark:text-emerald-100">Pagamento Confirmado!</h2>
              <p className="text-sm text-emerald-800/80 dark:text-emerald-300/80">
                O custo de fulfillment do pedido <strong>#{order.order_number}</strong> ({formatBRL(costVal)}) foi pago com sucesso.
              </p>
            </div>
            <div className="pt-2">
              <Badge variant="outline" className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 border-emerald-300 text-xs px-3 py-1 font-semibold">
                ✓ Pedido Liberado para Envio
              </Badge>
            </div>
          </Card>
        ) : (
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
                    Custo do produto a pagar
                  </span>
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {formatBRL(costVal)}
                  </span>
                </div>
              </div>
            </CardHeader>

            <CardContent className="p-6 space-y-6">

              {/* Timer indicator se disponível */}
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
                  <li>Confirme o valor de <strong>{formatBRL(costVal)}</strong> e finalize o pagamento.</li>
                </ol>
                <div className="pt-2 flex items-center gap-1.5 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  <span>A confirmação nesta tela é automática após o pagamento.</span>
                </div>
              </div>

            </CardContent>
          </Card>
        )}

      </div>
    </div>
  );
};

export default PublicOrderPayment;
