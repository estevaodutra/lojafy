import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Package, Eye, Truck, CheckCircle, Clock, XCircle, MapPin, CreditCard, Calendar, User, FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: any;
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

interface OrderDetailsModalProps {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ orderId, isOpen, onClose }) => {
  const [order, setOrder] = useState<Order | null>(null);
  const [customer, setCustomer] = useState<CustomerProfile | null>(null);
  const [statusHistory, setStatusHistory] = useState<OrderStatusHistory[]>([]);
  const [shippingFiles, setShippingFiles] = useState<ShippingFile[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (orderId && isOpen) {
      fetchOrderDetails();
      fetchStatusHistory();
      fetchShippingFiles();
    }
  }, [orderId, isOpen]);

  const fetchOrderDetails = async () => {
    if (!orderId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            product_snapshot
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data);

      // Fetch customer profile
      if (data?.user_id) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('first_name, last_name, cpf, phone')
          .eq('user_id', data.user_id)
          .single();
        
        setCustomer(profileData);
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
      const { data, error } = await supabase
        .from('order_status_history')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setStatusHistory(data || []);
    } catch (error) {
      console.error('Erro ao buscar histórico:', error);
    }
  };

  const fetchShippingFiles = async () => {
    if (!orderId) return;

    try {
      const { data, error } = await supabase
        .from('order_shipping_files')
        .select('*')
        .eq('order_id', orderId)
        .order('uploaded_at', { ascending: false });

      if (error) throw error;
      setShippingFiles(data || []);
    } catch (error) {
      console.error('Erro ao buscar arquivos de envio:', error);
    }
  };

  const downloadShippingFile = async (filePath: string, fileName: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('shipping-files')
        .download(filePath);

      if (error) throw error;

      // Create download link
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erro ao baixar arquivo:', error);
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
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'cancelled': return <XCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Aguardando pagamento';
      case 'processing': return 'Processando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregue';
      case 'cancelled': return 'Cancelado';
      default: return 'Desconhecido';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'outline';
      case 'pending': return 'outline';
      case 'cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('pt-BR');
  };

  if (!order && !loading) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <div>
              <div>Pedido #{order?.order_number}</div>
              {customer && (
                <div className="text-sm font-normal text-muted-foreground mt-1">
                  Cliente: {customer.first_name} {customer.last_name}
                </div>
              )}
            </div>
            {order && (
              <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                {getStatusIcon(order.status)}
                {getStatusLabel(order.status)}
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2">Carregando detalhes...</p>
          </div>
        ) : order ? (
          <div className="space-y-6">
            {/* Customer Info */}
            {customer && (
              <Card>
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
                    {customer.cpf && (
                      <div>
                        <p className="font-medium text-muted-foreground">CPF</p>
                        <p className="font-semibold">{customer.cpf}</p>
                      </div>
                    )}
                    {customer.phone && (
                      <div>
                        <p className="font-medium text-muted-foreground">Telefone</p>
                        <p className="font-semibold">{customer.phone}</p>
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-muted-foreground">Total do Pedido</p>
                      <p className="font-semibold text-lg text-primary">{formatPrice(Number(order.total_amount))}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                      {order.payment_method === 'pix' ? 'PIX' : 
                       order.payment_method === 'credit_card' ? 'Cartão de Crédito' : 
                       order.payment_method || 'Não informado'}
                    </p>
                    <p className={`text-sm ${
                      order.payment_status === 'paid' 
                        ? 'text-green-600' 
                        : 'text-amber-600'
                    }`}>
                      {order.payment_status === 'paid' ? 'Pago' : 'Pendente'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {order.tracking_number && (
                <Card>
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
                </Card>
              )}
            </div>

            {/* Products */}
            <Card>
              <CardHeader>
                <CardTitle>Produtos</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {order.order_items.map((item, index) => {
                    const product = item.product_snapshot;
                    return (
                      <div key={index} className="flex items-center gap-4 pb-4 border-b border-border last:border-0">
                        {product?.image_url && (
                          <img 
                            src={product.image_url} 
                            alt={product.name}
                            className="w-16 h-16 object-cover rounded-lg"
                          />
                        )}
                        <div className="flex-1">
                          <h4 className="font-semibold">{product?.name || 'Produto'}</h4>
                          {product?.brand && (
                            <p className="text-sm text-muted-foreground">{product.brand}</p>
                          )}
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity} • Preço unitário: {formatPrice(Number(item.unit_price))}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{formatPrice(Number(item.total_price))}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Order Summary */}
            <Card>
              <CardHeader>
                <CardTitle>Resumo do Pedido</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatPrice(Number(order.total_amount) - Number(order.shipping_amount || 0) - Number(order.tax_amount || 0))}</span>
                </div>
                {order.shipping_amount && Number(order.shipping_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Frete:</span>
                    <span>{formatPrice(Number(order.shipping_amount))}</span>
                  </div>
                )}
                {order.tax_amount && Number(order.tax_amount) > 0 && (
                  <div className="flex justify-between">
                    <span>Taxas:</span>
                    <span>{formatPrice(Number(order.tax_amount))}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between font-semibold text-lg">
                  <span>Total:</span>
                  <span>{formatPrice(Number(order.total_amount))}</span>
                </div>
              </CardContent>
            </Card>

            {/* Shipping Files */}
            {shippingFiles.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Etiquetas de Envio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {shippingFiles.map((file) => (
                      <div key={file.id} className="flex items-center justify-between p-3 border border-border rounded-lg">
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => downloadShippingFile(file.file_path, file.file_name)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Baixar
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Addresses */}
            {(order.shipping_address || order.billing_address) && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {order.shipping_address && (
                  <Card>
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
                  </Card>
                )}

                {order.billing_address && (
                  <Card>
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
                  </Card>
                )}
              </div>
            )}

            {/* Status History */}
            {statusHistory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Histórico do Pedido</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {statusHistory.map((history, index) => (
                      <div key={history.id} className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
                          {getStatusIcon(history.status)}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <p className="font-semibold">{getStatusLabel(history.status)}</p>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(history.created_at)}
                            </span>
                          </div>
                          {history.notes && (
                            <p className="text-sm text-muted-foreground mt-1">{history.notes}</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Notes */}
            {order.notes && (
              <Card>
                <CardHeader>
                  <CardTitle>Observações</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{order.notes}</p>
                </CardContent>
              </Card>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <p className="text-muted-foreground">Pedido não encontrado</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default OrderDetailsModal;