import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Eye, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { supabase } from '@/integrations/supabase/client';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { Link } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
interface OrderItem {
  id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  product_snapshot: any;
}
interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  tracking_number?: string;
  has_shipping_file?: boolean;
  order_items: OrderItem[];
}
const Orders = () => {
  const { effectiveUserId } = useEffectiveUser();
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  useEffect(() => {
    const fetchOrders = async () => {
      if (!effectiveUserId) return;
      try {
        const {
          data,
          error
        } = await supabase.from('orders').select(`
            id,
            order_number,
            status,
            payment_status,
            total_amount,
            created_at,
            tracking_number,
            has_shipping_file,
            order_items (
              id,
              quantity,
              unit_price,
              total_price,
              product_snapshot
            )
          `).eq('user_id', effectiveUserId).order('created_at', {
          ascending: false
        });
        if (error) throw error;
        setOrders(data || []);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
        toast({
          variant: 'destructive',
          title: 'Erro ao carregar pedidos',
          description: (error as any)?.message ?? 'Não foi possível carregar seus pedidos. Tente novamente mais tarde.',
        });
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, [effectiveUserId]);
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'processing':
        return <Package className="h-4 w-4" />;
      case 'shipped':
        return <Truck className="h-4 w-4" />;
      case 'delivered':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <XCircle className="h-4 w-4" />;
      case 'refunded':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };
  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Pendente';
      case 'processing':
        return 'Em preparação';
      case 'shipped':
        return 'Despachado';
      case 'delivered':
        return 'Finalizado';
      case 'cancelled':
        return 'Cancelado';
      case 'refunded':
        return 'Reembolsado';
      default:
        return 'Desconhecido';
    }
  };
  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'default';
      case 'shipped':
        return 'secondary';
      case 'processing':
        return 'outline';
      case 'pending':
        return 'outline';
      case 'cancelled':
        return 'destructive';
      case 'refunded':
        return 'secondary';
      default:
        return 'outline';
    }
  };
  const handleViewDetails = (orderId: string) => {
    setSelectedOrderId(orderId);
    setIsModalOpen(true);
  };
  return <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o status de todos os seus pedidos
        </p>
      </div>

      {loading ? <div className="text-center py-12">
          <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
          <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
        </div> : orders.length > 0 ? <div className="space-y-4">
          {orders.map(order => <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">#{order.order_number}</CardTitle>
                    <CardDescription>
                      Pedido realizado em {new Date(order.created_at).toLocaleDateString('pt-BR')}
                    </CardDescription>
                  </div>
                  <Badge variant={getStatusVariant(order.status)} className="flex items-center gap-1">
                    {getStatusIcon(order.status)}
                    {getStatusLabel(order.status)}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Products */}
                <div className="space-y-2">
                  {order.order_items.map((item, index) => {
              const productName = item.product_snapshot?.name || 'Produto';
              return <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                        <div>
                          <p className="font-medium">{productName}</p>
                          <p className="text-sm text-muted-foreground">
                            Quantidade: {item.quantity}
                          </p>
                        </div>
                        <span className="font-semibold">
                          R$ {Number(item.total_price).toFixed(2)}
                        </span>
                      </div>;
            })}
                </div>

                {/* Order Summary */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    {order.order_items.length} item(s) • Total: 
                  </div>
                  <span className="text-lg font-bold">
                    R$ {Number(order.total_amount).toFixed(2)}
                  </span>
                </div>

                {/* Payment Status */}
                {order.payment_status && <div className={`p-3 rounded-lg ${order.payment_status === 'paid' ? 'bg-success/10 text-success-foreground' : 'bg-warning/10 text-warning-foreground'}`}>
                    <p className="text-sm font-medium text-zinc-950">
                      {order.payment_status === 'paid' ? '✅ Pagamento confirmado' : '⏱️ Aguardando pagamento'}
                    </p>
                  </div>}

                {/* Tracking Info */}
                {order.tracking_number && <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-secondary-foreground">
                      📦 Código de rastreamento: {order.tracking_number}
                    </p>
                  </div>}

                {/* Shipping Label Info */}
                {order.has_shipping_file && <div className="bg-green-50 border border-green-200 p-3 rounded-lg">
                    <p className="text-sm font-medium text-green-800">
                      📄 Etiqueta de envio disponível - Confira os detalhes do pedido
                    </p>
                  </div>}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <Button variant="outline" size="sm" onClick={() => handleViewDetails(order.id)}>
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </Button>
                  {order.tracking_number && <Button variant="outline" size="sm">
                      <Truck className="h-4 w-4 mr-2" />
                      Rastrear pedido
                    </Button>}
                  {order.status === 'delivered' && <Button variant="outline" size="sm">
                      Avaliar produtos
                    </Button>}
                </div>
              </CardContent>
            </Card>)}
        </div> : <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Você ainda não realizou nenhum pedido. Que tal começar a explorar nossa loja?
            </p>
            <Button asChild>
              <Link to="/">Começar a Comprar</Link>
            </Button>
          </CardContent>
        </Card>}

      <OrderDetailsModal orderId={selectedOrderId} isOpen={isModalOpen} onClose={() => {
      setIsModalOpen(false);
      setSelectedOrderId(null);
    }} />
    </div>;
};
export default Orders;