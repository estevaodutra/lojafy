import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Package, Eye, Truck, CheckCircle, Clock, XCircle, MapPin, CreditCard, Calendar, User, FileText, Download, Upload, TrendingUp, MessageSquarePlus, Send, Loader2, RefreshCw } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { OpenTicketButton } from '@/components/order-tickets/OpenTicketButton';
import { getAvailableTicketTypes } from '@/types/orderTickets';
import { getStatusConfig, getStatusLabel as gslFn, getStatusVariant as gsvFn } from '@/constants/orderStatus';
interface OrderItem {
  id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot?: any;
}
interface OrderFinancials {
  totalCost: number;
  subtotal: number;
  shippingAmount: number;
  taxAmount: number;
  totalRevenue: number;
  netProfit: number;
  profitMargin: number;
}
interface OrderStatusHistory {
  id: string;
  status: string;
  notes?: string;
  created_at: string;
}
interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  payment_method?: string;
  total_amount: number;
  shipping_amount?: number;
  tax_amount?: number;
  created_at: string;
  tracking_number?: string;
  shipping_address?: any;
  billing_address?: any;
  notes?: string;
  user_id: string;
  order_items: OrderItem[];
}
interface CustomerProfile {
  first_name: string;
  last_name: string;
  cpf?: string;
  phone?: string;
}
interface ShippingFile {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
}
interface RefundDocument {
  id: string;
  file_name: string;
  file_path: string;
  file_size: number;
  uploaded_at: string;
  uploaded_by?: string;
}

interface WebhookLogInfo {
  id: string;
  dispatched_at: string;
  status_code: number | null;
  error_message: string | null;
}

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}
const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({
  orderId,
  isOpen,
  onClose
}) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [shippingFiles, setShippingFiles] = useState<ShippingFile[]>([]);
  const [refundDocuments, setRefundDocuments] = useState<RefundDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [refundUploadFile, setRefundUploadFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isRefundUploading, setIsRefundUploading] = useState(false);
  const [currentProductCosts, setCurrentProductCosts] = useState<Record<string, number>>({});
  const [existingTicketId, setExistingTicketId] = useState<string | null>(null);
  const [deliveredAt, setDeliveredAt] = useState<string | null>(null);
  const [webhookLog, setWebhookLog] = useState<WebhookLogInfo | null>(null);
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [isDispatchingWebhook, setIsDispatchingWebhook] = useState(false);
  const {
    toast
  } = useToast();
  const {
    profile
  } = useAuth();
  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';
  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
      fetchStatusHistory();
      fetchShippingFiles();
      fetchRefundDocuments();
      fetchExistingTicket();
      fetchDeliveredAt();
      if (isAdmin) {
        fetchWebhookLog();
      }
    } else {
      setExistingTicketId(null);
      setDeliveredAt(null);
      setWebhookLog(null);
    }
  }, [orderId, isOpen, isAdmin]);

  const fetchExistingTicket = async () => {
    if (!orderId) return;
    try {
      const { data } = await supabase
        .from('order_tickets')
        .select('id')
        .eq('order_id', orderId)
        .not('status', 'in', '("resolvido","cancelado")')
        .maybeSingle();
      setExistingTicketId(data?.id || null);
    } catch (error) {
      console.error('Erro ao buscar ticket existente:', error);
    }
  };

  const fetchDeliveredAt = async () => {
    if (!orderId) return;
    try {
      const { data } = await supabase
        .from('order_status_history')
        .select('created_at')
        .eq('order_id', orderId)
        .eq('status', 'finalizado')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      setDeliveredAt(data?.created_at || null);
    } catch (error) {
      console.error('Erro ao buscar data de entrega:', error);
    }
  };

  const fetchWebhookLog = async () => {
    if (!orderId) return;
    setWebhookLoading(true);
    try {
      // Buscar logs de webhook para este pedido usando textSearch no payload
      const { data, error } = await supabase
        .from('webhook_dispatch_logs')
        .select('id, dispatched_at, status_code, error_message, payload')
        .eq('event_type', 'order.paid')
        .order('dispatched_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('Erro ao buscar log de webhook:', error);
        setWebhookLog(null);
        return;
      }

      // Filtrar manualmente para encontrar o log do pedido específico
      const matchingLog = data?.find((log: any) => {
        const payload = log.payload;
        return payload?.data?.order_id === orderId;
      });

      if (matchingLog) {
        setWebhookLog({
          id: matchingLog.id,
          dispatched_at: matchingLog.dispatched_at,
          status_code: matchingLog.status_code,
          error_message: matchingLog.error_message,
        });
      } else {
        setWebhookLog(null);
      }
    } catch (error) {
      console.error('Erro ao buscar log de webhook:', error);
      setWebhookLog(null);
    } finally {
      setWebhookLoading(false);
    }
  };

  const handleDispatchWebhook = async () => {
    if (!orderId) return;
    setIsDispatchingWebhook(true);
    try {
      const { data, error } = await supabase.functions.invoke('dispatch-order-webhook', {
        body: { order_id: orderId },
      });

      if (error) {
        throw error;
      }

      toast({
        title: "Sucesso",
        description: `Webhook order.paid disparado para o pedido ${data?.order_number || orderId}`,
      });

      // Recarregar o log de webhook
      await fetchWebhookLog();
    } catch (error: any) {
      console.error('Erro ao disparar webhook:', error);
      toast({
        title: "Erro",
        description: error?.message || "Não foi possível disparar o webhook.",
        variant: "destructive",
      });
    } finally {
      setIsDispatchingWebhook(false);
    }
  };

  const fetchOrderDetails = async () => {
    if (!orderId) return;
    setLoading(true);
    try {
      const {
        data,
        error
      } = await supabase.from('orders').select(`
        *,
        order_items (
          id,
          product_id,
          quantity,
          unit_price,
          total_price,
          product_snapshot
        )
      `).eq('id', orderId).single();
      if (error) throw error;
      setOrder(data);

      // Fetch customer profile
      if (data?.user_id) {
        const {
          data: profileData
        } = await supabase.from('profiles').select('first_name, last_name, cpf, phone').eq('user_id', data.user_id).single();
        setCustomer(profileData);
      }

      // Fetch current cost prices for products that don't have it in snapshot
      const productsNeedingCostPrice = data.order_items.filter((item: any) => !item.product_snapshot?.cost_price);
      if (productsNeedingCostPrice.length > 0) {
        const productIds = productsNeedingCostPrice.map((item: any) => item.product_id);
        const {
          data: productsData
        } = await supabase.from('products').select('id, cost_price').in('id', productIds);
        if (productsData) {
          const costsMap: Record<string, number> = {};
          productsData.forEach(product => {
            costsMap[product.id] = Number(product.cost_price || 0);
          });
          setCurrentProductCosts(costsMap);
        }
      }
    } catch (error) {
      console.error('Erro ao buscar detalhes do pedido:', error);
    } finally {
      setLoading(false);
    }
  };
  const fetchStatusHistory = async () => {
    if (!orderId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('order_status_history').select('*').eq('order_id', orderId).order('created_at', {
        ascending: false
      });
      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };
  const fetchShippingFiles = async () => {
    if (!orderId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('order_shipping_files').select('*').eq('order_id', orderId).order('uploaded_at', {
        ascending: false
      });
      if (error) throw error;
      setShippingFiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar arquivos de envio:', error);
    }
  };
  const downloadShippingFile = async (filePath: string, fileName: string) => {
    try {
      const {
        data,
        error
      } = await supabase.storage.from('shipping-files').download(filePath);
      if (error) {
        console.error('Error downloading file:', error);
        toast({
          title: "Erro",
          description: "Não foi possível baixar o arquivo.",
          variant: "destructive"
        });
        return;
      }

      // Create blob URL and trigger download
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Sucesso",
        description: "Arquivo baixado com sucesso."
      });
    } catch (error) {
      console.error('Error downloading file:', error);
      toast({
        title: "Erro",
        description: "Erro inesperado ao baixar o arquivo.",
        variant: "destructive"
      });
    }
  };
  const fetchRefundDocuments = async () => {
    if (!orderId) return;
    try {
      const {
        data,
        error
      } = await supabase.from('order_refund_documents').select('*').eq('order_id', orderId).order('uploaded_at', {
        ascending: false
      });
      if (error) throw error;
      setRefundDocuments(data || []);
    } catch (error) {
      console.error('Erro ao buscar documentos de reembolso:', error);
    }
  };
  const handleFileUpload = async (file: File) => {
    if (!orderId || !isAdmin) return;
    setIsUploading(true);
    try {
      // Generate unique filename
      const fileExtension = file.name.split('.').pop();
      const fileName = `admin_upload_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      // Upload file to Supabase Storage
      const {
        data,
        error: uploadError
      } = await supabase.storage.from('shipping-files').upload(filePath, file);
      if (uploadError) {
        throw uploadError;
      }

      // Insert file record into database
      const {
        error: dbError
      } = await supabase.from('order_shipping_files').insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size
      });
      if (dbError) {
        throw dbError;
      }
      toast({
        title: "Sucesso",
        description: "Arquivo enviado com sucesso."
      });

      // Refresh shipping files
      fetchShippingFiles();
      setUploadFile(null);
    } catch (error) {
      console.error('Error uploading file:', error);
      toast({
        title: "Erro",
        description: "Não foi possível enviar o arquivo.",
        variant: "destructive"
      });
    } finally {
      setIsUploading(false);
    }
  };
  const handleRefundFileUpload = async (file: File) => {
    if (!orderId || !isAdmin) return;
    setIsRefundUploading(true);
    try {
      const fileExtension = file.name.split('.').pop();
      const fileName = `refund_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      // Upload to storage
      const {
        error: uploadError
      } = await supabase.storage.from('refund-documents').upload(filePath, file);
      if (uploadError) throw uploadError;

      // Insert record
      const {
        error: dbError
      } = await supabase.from('order_refund_documents').insert({
        order_id: orderId,
        file_name: file.name,
        file_path: filePath,
        file_size: file.size,
        uploaded_by: profile?.user_id
      });
      if (dbError) throw dbError;
      toast({
        title: "Sucesso",
        description: "Comprovante enviado com sucesso."
      });
      fetchRefundDocuments();
      setRefundUploadFile(null);
    } catch (error) {
      console.error('Error uploading refund document:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar comprovante.",
        variant: "destructive"
      });
    } finally {
      setIsRefundUploading(false);
    }
  };
  const downloadRefundDocument = async (filePath: string, fileName: string) => {
    try {
      const {
        data,
        error
      } = await supabase.storage.from('refund-documents').download(filePath);
      if (error) throw error;
      const blob = new Blob([data]);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      toast({
        title: "Sucesso",
        description: "Documento baixado com sucesso."
      });
    } catch (error) {
      console.error('Error downloading refund document:', error);
      toast({
        title: "Erro",
        description: "Erro ao baixar documento.",
        variant: "destructive"
      });
    }
  };
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };
  const getStatusIcon = (status: string) => {
    const Icon = getStatusConfig(status).icon;
    return <Icon className="h-4 w-4" />;
  };
  const getStatusLabel = (status: string) => {
    return gslFn(status);
  };
  const getStatusVariant = (status: string) => {
    return gsvFn(status);
  };
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };
  const calculateOrderFinancials = (order: Order): OrderFinancials => {
    // Calcular custo total dos produtos (usando fallback para currentProductCosts)
    const totalCost = order.order_items.reduce((acc: number, item: OrderItem) => {
      let costPrice = Number(item.product_snapshot?.cost_price || 0);

      // Fallback para custo atual se não estiver no snapshot
      if (!costPrice && currentProductCosts[item.product_id]) {
        costPrice = currentProductCosts[item.product_id];
      }
      return acc + costPrice * item.quantity;
    }, 0);

    // Calcular subtotal (preço de venda dos produtos)
    const subtotal = order.order_items.reduce((acc: number, item: OrderItem) => {
      return acc + Number(item.total_price);
    }, 0);
    const shippingAmount = Number(order.shipping_amount || 0);
    const taxAmount = Number(order.tax_amount || 0);
    const totalRevenue = Number(order.total_amount);

    // Lucro = Receita Total - Custo dos Produtos
    const netProfit = totalRevenue - totalCost;

    // Margem de lucro = (Lucro / Receita) * 100
    const profitMargin = totalRevenue > 0 ? netProfit / totalRevenue * 100 : 0;
    return {
      totalCost,
      subtotal,
      shippingAmount,
      taxAmount,
      totalRevenue,
      netProfit,
      profitMargin
    };
  };
  const calculateProductPriceBreakdown = (item: OrderItem) => {
    // Tentar obter cost_price do snapshot primeiro, depois do produto atual
    let costPrice = Number(item.product_snapshot?.cost_price || 0);
    let isEstimated = false;
    if (!costPrice && currentProductCosts[item.product_id]) {
      costPrice = currentProductCosts[item.product_id];
      isEstimated = true;
    }
    const salePrice = Number(item.unit_price);

    // Percentuais fixos
    const transactionPercent = 4.5; // Taxa de Transação
    const contingencyPercent = 1; // Contingenciamento

    // DECOMPOSIÇÃO REVERSA: Partir do preço de venda e descontar taxas até chegar no lucro
    // 1. Preço de Venda
    const startPrice = salePrice;

    // 2. Subtrair Taxa de Transação
    const transactionAmount = salePrice * (transactionPercent / 100);
    const afterTransaction = salePrice - transactionAmount;

    // 3. Subtrair Contingenciamento
    const contingencyAmount = afterTransaction * (contingencyPercent / 100);
    const afterContingency = afterTransaction - contingencyAmount;

    // 4. Subtrair Preço de Custo
    const afterCost = afterContingency - costPrice;

    // 5. O que sobra é o Lucro Real
    const realProfit = afterCost;
    return {
      costPrice,
      isEstimated,
      salePrice: startPrice,
      transactionPercent,
      transactionAmount,
      afterTransaction,
      contingencyPercent,
      contingencyAmount,
      afterContingency,
      afterCost,
      realProfit
    };
  };
  if (!order && !loading) {
    return null;
  }
  return <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div>Pedido #{order?.order_number}</div>
              {customer && <div className="text-sm font-normal text-muted-foreground mt-1">
                  Cliente: {customer.first_name} {customer.last_name}
                </div>}
            </div>
            {order && <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </Badge>}
          </DialogTitle>
        </DialogHeader>

        {loading ? <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando detalhes...</p>
          </div> : order ? <div className="space-y-6">
            {/* Customer Info */}
            {customer && <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Informações do Cliente
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="font-medium text-muted-foreground">Nome</p>
                      <p className="font-semibold">{customer.first_name} {customer.last_name}</p>
                    </div>
                    {customer.cpf && <div>
                        <p className="font-medium text-muted-foreground">CPF</p>
                        <p className="font-semibold">{customer.cpf}</p>
                      </div>}
                    {customer.phone && <div>
                        <p className="font-medium text-muted-foreground">Telefone</p>
                        <p className="font-semibold">{customer.phone}</p>
                      </div>}
                    <div>
                      <p className="font-medium text-muted-foreground">Total do Pedido</p>
                      <p className="font-semibold text-lg text-primary">{formatPrice(Number(order.total_amount))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>}

            {/* Order Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    Data do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="font-semibold">{formatDate(order.created_at)}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CreditCard className="h-4 w-4" />
                    Pagamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-1">
                    <p className="font-semibold">
                      {order.payment_method === 'pix' ? 'PIX' : order.payment_method === 'credit_card' ? 'Cartão de Crédito' : order.payment_method || 'Não informado'}
                    </p>
                    <p className={`text-sm ${order.payment_status === 'paid' ? 'text-green-600' : 'text-amber-600'}`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {order.tracking_number && <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <Truck className="h-4 w-4" />
                      Rastreamento
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold">{order.tracking_number}</p>
                    <Button variant="outline" size="sm" className="mt-2">
                      Rastrear Pedido
                    </Button>
                  </CardContent>
                </Card>}
            </div>

            {/* Webhook Status - Only for Admin */}
            {isAdmin && order.payment_status === 'paid' && (
              <Card className="border-primary/20">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Send className="h-4 w-4 text-primary" />
                      Webhook de Pedido Pago
                    </div>
                    {webhookLoading ? (
                      <Badge variant="outline" className="gap-1">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        Verificando...
                      </Badge>
                    ) : webhookLog ? (
                      <Badge 
                        variant={webhookLog.status_code && webhookLog.status_code >= 200 && webhookLog.status_code < 300 ? "default" : "destructive"}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Enviado
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="gap-1 text-amber-600 border-amber-300">
                        <Clock className="h-3 w-3" />
                        Não enviado
                      </Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {webhookLog ? (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Último disparo:</span>
                        <span className="font-medium">{formatDate(webhookLog.dispatched_at)}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Status:</span>
                        <span className={`font-medium ${webhookLog.status_code && webhookLog.status_code >= 200 && webhookLog.status_code < 300 ? 'text-green-600' : 'text-red-600'}`}>
                          {webhookLog.status_code || 'N/A'}
                        </span>
                      </div>
                      {webhookLog.error_message && (
                        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-950/20 p-2 rounded">
                          {webhookLog.error_message}
                        </div>
                      )}
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full mt-2"
                        onClick={handleDispatchWebhook}
                        disabled={isDispatchingWebhook}
                      >
                        {isDispatchingWebhook ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disparando...
                          </>
                        ) : (
                          <>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Reenviar Webhook
                          </>
                        )}
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        O webhook order.paid ainda não foi disparado para este pedido.
                      </p>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="w-full"
                        onClick={handleDispatchWebhook}
                        disabled={isDispatchingWebhook}
                      >
                        {isDispatchingWebhook ? (
                          <>
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            Disparando...
                          </>
                        ) : (
                          <>
                            <Send className="h-4 w-4 mr-2" />
                            Disparar Webhook
                          </>
                        )}
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                {order.order_items.map((item, index) => {
                const product = item.product_snapshot;
                const breakdown = calculateProductPriceBreakdown(item);
                return <div key={index} className="pb-4 border-b border-border last:border-0">
                      <div className="flex items-center gap-4">
                        {product?.image_url && <img src={product.image_url} alt={product.name} className="w-16 h-16 object-cover rounded-lg" />}
                        <div className="flex-1">
                          <h4 className="font-semibold">{product?.name || 'Produto'}</h4>
                          {product?.brand && <p className="text-sm text-muted-foreground">{product.brand}</p>}
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} • Preço unitário: {formatPrice(Number(item.unit_price))}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="text-right">
                            <p className="font-semibold">{formatPrice(Number(item.total_price))}</p>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => window.open(`/produto/${item.product_id}`, '_blank')} title="Ver página do produto">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {/* Breakdown de Precificação - Apenas para Admin */}
                      {isAdmin && (
                        breakdown.costPrice > 0 ? <div className="mt-3 ml-20 p-3 bg-muted/20 rounded-lg border border-border/50">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-xs font-semibold text-muted-foreground">
                              📊 Composição de Preço (por unidade)
                            </p>
                            {breakdown.isEstimated && <Badge variant="outline" className="text-xs bg-amber-50 dark:bg-amber-950/20 text-amber-700 dark:text-amber-400 border-amber-300 dark:border-amber-700">
                                ⚠️ Custo Estimado
                              </Badge>}
                          </div>
                          <div className="space-y-1 text-sm">
                            {/* Preço de Venda */}
                            <div className="flex justify-between font-semibold">
                              <span>Preço de Venda:</span>
                              <span className="text-primary">{formatPrice(breakdown.salePrice)}</span>
                            </div>
                            
                            {/* (-) Taxa de Transação */}
                            <div className="flex justify-between text-orange-600 pl-4">
                              <span>(-) Taxa de Transação ({breakdown.transactionPercent}%):</span>
                              <span>
                                {formatPrice(breakdown.transactionAmount)} 
                                <span className="text-muted-foreground ml-1">
                                  ({formatPrice(breakdown.afterTransaction)})
                                </span>
                              </span>
                            </div>
                            
                            {/* (-) Contingenciamento */}
                            <div className="flex justify-between text-blue-600 pl-4">
                              <span>(-) Contingenciamento de Conta ({breakdown.contingencyPercent}%):</span>
                              <span>
                                {formatPrice(breakdown.contingencyAmount)} 
                                <span className="text-muted-foreground ml-1">
                                  ({formatPrice(breakdown.afterContingency)})
                                </span>
                              </span>
                            </div>
                            
                            {/* (-) Preço de Custo */}
                            <div className="flex justify-between text-red-600 pl-4">
                              <span>(-) Preço de Custo do Produto:</span>
                              <span>
                                {formatPrice(breakdown.costPrice)} 
                                <span className="text-green-600 font-semibold ml-1">
                                  ({formatPrice(breakdown.afterCost)})
                                </span>
                              </span>
                            </div>
                            
                            {/* Linha divisória */}
                            <div className="border-t border-border my-2"></div>
                            
                            {/* Lucro */}
                            <div className="flex justify-between font-semibold text-base text-green-600">
                              <span className="flex items-center gap-1">
                                <TrendingUp className="h-4 w-4" />
                                Lucro:
                              </span>
                              <span>{formatPrice(breakdown.realProfit)}</span>
                            </div>
                          </div>
                        </div> : <div className="mt-3 ml-20 p-3 bg-amber-50 dark:bg-amber-950/20 rounded-lg border border-amber-300 dark:border-amber-700">
                          <p className="text-xs text-amber-700 dark:text-amber-400">
                            ⚠️ Preço de custo não disponível para este produto
                          </p>
                        </div>
                      )}
                    </div>;
              })}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary with Financial Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>{isAdmin ? 'Resumo Financeiro do Pedido' : 'Resumo do Pedido'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {isAdmin ? (
                  (() => {
                    const financials = calculateOrderFinancials(order);

                    // Calcular totais agregados com decomposição reversa
                    const totalSalePrice = financials.subtotal; // Soma dos preços de venda

                    // Taxa de transação sobre o total
                    const transactionPercent = 4.5;
                    const transactionAmount = totalSalePrice * (transactionPercent / 100);
                    const afterTransaction = totalSalePrice - transactionAmount;

                    // Contingenciamento sobre o que sobrou
                    const contingencyPercent = 1;
                    const contingencyAmount = afterTransaction * (contingencyPercent / 100);
                    const afterContingency = afterTransaction - contingencyAmount;

                    // Subtrair custo total
                    const afterCost = afterContingency - financials.totalCost;

                    // Lucro real dos produtos
                    const productProfit = afterCost;
                    return <>
                      {/* Preço de Venda Total */}
                      <div className="flex justify-between font-semibold text-base pb-2 border-b">
                        <span>Preço de Venda:</span>
                        <span className="text-primary">{formatPrice(totalSalePrice)}</span>
                      </div>

                      {/* Deduções */}
                      <div className="space-y-2 pl-4">
                        <div className="flex justify-between text-sm text-orange-600">
                          <span>(-) Taxa de Transação ({transactionPercent}%):</span>
                          <span>
                            {formatPrice(transactionAmount)}
                            <span className="text-muted-foreground ml-2">
                              ({formatPrice(afterTransaction)})
                            </span>
                          </span>
                        </div>

                        <div className="flex justify-between text-sm text-blue-600">
                          <span>(-) Contingenciamento de Conta ({contingencyPercent}%):</span>
                          <span>
                            {formatPrice(contingencyAmount)}
                            <span className="text-muted-foreground ml-2">
                              ({formatPrice(afterContingency)})
                            </span>
                          </span>
                        </div>

                        <div className="flex justify-between text-sm text-red-600">
                          <span>(-) Preço de Custo dos Produtos:</span>
                          <span>
                            {formatPrice(financials.totalCost)}
                            <span className="text-green-600 font-semibold ml-2">
                              ({formatPrice(afterCost)})
                            </span>
                          </span>
                        </div>
                      </div>

                      {/* Linha divisória */}
                      <Separator className="my-3" />

                      {/* Informações Adicionais (Frete, Taxas, Receita Total) */}
                      {Number(order.shipping_amount || 0) > 0 && <>
                          <Separator className="my-3" />
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between text-muted-foreground">
                              <span>+ Frete cobrado:</span>
                              <span className="font-medium">{formatPrice(Number(order.shipping_amount))}</span>
                            </div>
                            {Number(order.tax_amount || 0) > 0 && <div className="flex justify-between text-muted-foreground">
                                <span>+ Taxas adicionais:</span>
                                <span className="font-medium">{formatPrice(Number(order.tax_amount))}</span>
                              </div>}
                            <div className="flex justify-between font-semibold pt-2 border-t">
                              <span>Receita Total:</span>
                              <span className="text-primary">{formatPrice(Number(order.total_amount))}</span>
                            </div>
                          </div>
                        </>}

                      {/* Lucro Líquido Final */}
                      <Separator className="my-3" />
                      
                      <div className="space-y-2 bg-green-50 dark:bg-green-950/20 p-3 rounded-lg border border-green-200 dark:border-green-800">
                        <div className="flex justify-between font-semibold text-base">
                          <span className="flex items-center gap-2">
                            <TrendingUp className="h-4 w-4 text-green-600" />
                            Lucro Líquido Real:
                          </span>
                          <span className={(() => {
                            // Soma dos lucros reais de todos os produtos
                            const totalRealProfit = order.order_items.reduce((acc, item) => {
                              const breakdown = calculateProductPriceBreakdown(item);
                              return acc + (breakdown.realProfit * item.quantity);
                            }, 0);
                            return totalRealProfit >= 0 ? "text-green-600" : "text-red-600";
                          })()}>
                            {(() => {
                              // Soma dos lucros reais de todos os produtos
                              const totalRealProfit = order.order_items.reduce((acc, item) => {
                                const breakdown = calculateProductPriceBreakdown(item);
                                return acc + (breakdown.realProfit * item.quantity);
                              }, 0);
                              return formatPrice(totalRealProfit);
                            })()}
                          </span>
                        </div>
                        
                        <div className="flex justify-between text-sm text-muted-foreground">
                          <span>Margem de Lucro Real:</span>
                          <span className={(() => {
                            const totalRealProfit = order.order_items.reduce((acc, item) => {
                              const breakdown = calculateProductPriceBreakdown(item);
                              return acc + (breakdown.realProfit * item.quantity);
                            }, 0);
                            const margin = financials.totalRevenue > 0 ? (totalRealProfit / financials.totalRevenue * 100) : 0;
                            return `font-medium ${margin >= 0 ? "text-green-600" : "text-red-600"}`;
                          })()}>
                            {(() => {
                              const totalRealProfit = order.order_items.reduce((acc, item) => {
                                const breakdown = calculateProductPriceBreakdown(item);
                                return acc + (breakdown.realProfit * item.quantity);
                              }, 0);
                              const margin = financials.totalRevenue > 0 ? (totalRealProfit / financials.totalRevenue * 100) : 0;
                              return margin.toFixed(2);
                            })()}%
                          </span>
                        </div>
                      </div>
                    </>;
                  })()
                ) : (
                  /* Visualização simplificada para clientes */
                  <div className="flex justify-between items-center text-lg font-semibold">
                    <span>Valor:</span>
                    <span className="text-primary">
                      {formatPrice(Number(order.total_amount))}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Suporte ao Pedido - Apenas para Clientes com tickets elegíveis */}
            {(() => {
              const availableTicketTypes = getAvailableTicketTypes(order.status, order.payment_status, deliveredAt);
              const showTicketCard = !isAdmin && (existingTicketId || availableTicketTypes.length > 0);
              
              return showTicketCard ? (
                <Card className="border-primary/20 bg-primary/5">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm flex items-center gap-2">
                      <MessageSquarePlus className="h-4 w-4 text-primary" />
                      Precisa de Ajuda com Este Pedido?
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-4">
                      Se você teve algum problema com seu pedido, pode abrir um ticket para solicitar reembolso, troca ou cancelamento.
                    </p>
                    <OpenTicketButton
                      orderId={order.id}
                      orderStatus={order.status}
                      paymentStatus={order.payment_status}
                      deliveredAt={deliveredAt}
                      existingTicketId={existingTicketId}
                      variant="default"
                      size="default"
                      className="w-full"
                    />
                  </CardContent>
                </Card>
              ) : null;
            })()}

            {/* Shipping Files */}
            {(shippingFiles.length > 0 || isAdmin) && <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Etiquetas de Envio
                    </div>
                    {isAdmin && <div className="flex items-center gap-2">
                        <Input type="file" accept=".pdf,.jpg,.jpeg,.png" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setUploadFile(file);
                }} className="hidden" id="file-upload" />
                        <Label htmlFor="file-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2">
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar Arquivo
                        </Label>
                      </div>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {uploadFile && isAdmin && <div className="mb-4 p-3 border border-border rounded-lg bg-muted/50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm font-medium">{uploadFile.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleFileUpload(uploadFile)} disabled={isUploading}>
                            {isUploading ? "Enviando..." : "Confirmar"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setUploadFile(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>}
                  
                  <div className="space-y-3">
                    {shippingFiles.length > 0 ? shippingFiles.map(file => <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-primary/10 rounded-lg">
                              <FileText className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <p className="font-medium">{file.file_name}</p>
                              <p className="text-sm text-muted-foreground">
                                {formatFileSize(file.file_size)} • Enviado em {formatDate(file.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => downloadShippingFile(file.file_path, file.file_name)}>
                            <Download className="h-4 w-4 mr-2" />
                            Baixar
                          </Button>
                        </div>) : !isAdmin ? <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma etiqueta disponível para este pedido.
                      </p> : <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhuma etiqueta enviada ainda. Use o botão acima para fazer upload.
                      </p>}
                  </div>
                </CardContent>
              </Card>}

            {/* Refund Documents - Only show if order is refunded or if admin */}
            {(order.status === 'reembolsado' || isAdmin) && <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-600" />
                      Comprovantes de Reembolso (PDF)
                    </div>
                    {isAdmin && <div className="flex items-center gap-2">
                        <Input type="file" accept=".pdf" onChange={e => {
                  const file = e.target.files?.[0];
                  if (file && file.type === 'application/pdf') {
                    setRefundUploadFile(file);
                  } else {
                    toast({
                      title: "Erro",
                      description: "Por favor, selecione apenas arquivos PDF.",
                      variant: "destructive"
                    });
                  }
                }} className="hidden" id="refund-file-upload" />
                        <Label htmlFor="refund-file-upload" className="cursor-pointer inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3 py-2">
                          <Upload className="h-4 w-4 mr-2" />
                          Enviar PDF
                        </Label>
                      </div>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {refundUploadFile && isAdmin && <div className="mb-4 p-3 border border-amber-200 rounded-lg bg-amber-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-amber-600" />
                          <span className="text-sm font-medium text-amber-900">{refundUploadFile.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button size="sm" onClick={() => handleRefundFileUpload(refundUploadFile)} disabled={isRefundUploading}>
                            {isRefundUploading ? "Enviando..." : "Confirmar"}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setRefundUploadFile(null)}>
                            Cancelar
                          </Button>
                        </div>
                      </div>
                    </div>}
                  
                  <div className="space-y-3">
                    {refundDocuments.length > 0 ? refundDocuments.map(doc => <div key={doc.id} className="flex items-center justify-between p-3 border border-amber-200 rounded-lg bg-amber-50">
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-10 h-10 bg-amber-100 rounded-lg">
                              <FileText className="h-5 w-5 text-amber-600" />
                            </div>
                            <div>
                              <p className="font-medium text-amber-900">{doc.file_name}</p>
                              <p className="text-sm text-amber-700">
                                {formatFileSize(doc.file_size)} • Enviado em {formatDate(doc.uploaded_at)}
                              </p>
                            </div>
                          </div>
                          <Button variant="outline" size="sm" onClick={() => downloadRefundDocument(doc.file_path, doc.file_name)} className="border-amber-300 hover:bg-amber-100">
                            <Download className="h-4 w-4 mr-2" />
                            Baixar PDF
                          </Button>
                        </div>) : !isAdmin ? <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comprovante disponível.
                      </p> : <p className="text-sm text-muted-foreground text-center py-4">
                        Nenhum comprovante enviado. Use o botão acima para fazer upload de PDFs.
                      </p>}
                  </div>
                </CardContent>
              </Card>}

            {/* Addresses */}
            {(order.shipping_address || order.billing_address) && <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.shipping_address && <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <MapPin className="h-4 w-4" />
                        Endereço de Entrega
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>{order.shipping_address.street}, {order.shipping_address.number}</p>
                      {order.shipping_address.complement && <p>{order.shipping_address.complement}</p>}
                      <p>{order.shipping_address.neighborhood}</p>
                      <p>{order.shipping_address.city} - {order.shipping_address.state}</p>
                      <p>CEP: {order.shipping_address.zip_code}</p>
                    </CardContent>
                  </Card>}

                {order.billing_address && <Card>
                    <CardHeader>
                      <CardTitle className="text-sm flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        Endereço de Cobrança
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p>{order.billing_address.street}, {order.billing_address.number}</p>
                      {order.billing_address.complement && <p>{order.billing_address.complement}</p>}
                      <p>{order.billing_address.neighborhood}</p>
                      <p>{order.billing_address.city} - {order.billing_address.state}</p>
                      <p>CEP: {order.billing_address.zip_code}</p>
                    </CardContent>
                  </Card>}
              </div>}

            {/* Status History */}
            {statusHistory.length > 0 && <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    Histórico do Pedido
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statusHistory.map(item => <div key={item.id} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 bg-primary/10 rounded-full mt-0.5">
                          {getStatusIcon(item.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-medium">{getStatusLabel(item.status)}</p>
                            <p className="text-sm text-muted-foreground">{formatDate(item.created_at)}</p>
                          </div>
                          {item.notes && <p className="text-sm text-muted-foreground mt-1">{item.notes}</p>}
                        </div>
                      </div>)}
                  </div>
                </CardContent>
              </Card>}

            {/* Order Notes */}
            {order.notes && <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm">{order.notes}</p>
                </CardContent>
              </Card>}
          </div> : <div className="text-center py-12">
            <p className="text-muted-foreground">Pedido não encontrado.</p>
          </div>}
      </DialogContent>
    </Dialog>;
};
export default OrderDetailsModal;