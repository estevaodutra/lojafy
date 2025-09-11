import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, Eye, Truck, CheckCircle, Clock, XCircle } from 'lucide-react';

const Orders = () => {
  // Mock orders data
  const orders = [
    {
      id: '1',
      orderNumber: 'ORD-20241201-000001',
      status: 'shipped',
      total: 299.99,
      items: 2,
      date: '2024-12-01',
      estimatedDelivery: '2024-12-05',
      trackingNumber: 'BR123456789',
      products: [
        { name: 'iPhone 15 Pro Max', quantity: 1, price: 199.99 },
        { name: 'Fone Sony WH-1000XM4', quantity: 1, price: 99.99 }
      ]
    },
    {
      id: '2',
      orderNumber: 'ORD-20241128-000002',
      status: 'delivered',
      total: 159.99,
      items: 1,
      date: '2024-11-28',
      deliveredAt: '2024-11-30',
      products: [
        { name: 'Apple Watch Series 9', quantity: 1, price: 159.99 }
      ]
    },
    {
      id: '3',
      orderNumber: 'ORD-20241125-000003',
      status: 'pending',
      total: 89.99,
      items: 1,
      date: '2024-11-25',
      products: [
        { name: 'Carregador sem fio', quantity: 1, price: 89.99 }
      ]
    }
  ];

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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Meus Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe o status de todos os seus pedidos
        </p>
      </div>

      {orders.length > 0 ? (
        <div className="space-y-4">
          {orders.map((order) => (
            <Card key={order.id}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">#{order.orderNumber}</CardTitle>
                    <CardDescription>
                      Pedido realizado em {new Date(order.date).toLocaleDateString('pt-BR')}
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
                  {order.products.map((product, index) => (
                    <div key={index} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                      <div>
                        <p className="font-medium">{product.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Quantidade: {product.quantity}
                        </p>
                      </div>
                      <span className="font-semibold">
                        R$ {product.price.toFixed(2)}
                      </span>
                    </div>
                  ))}
                </div>

                {/* Order Summary */}
                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <div className="text-sm text-muted-foreground">
                    {order.items} item(s) • Total: 
                  </div>
                  <span className="text-lg font-bold">
                    R$ {order.total.toFixed(2)}
                  </span>
                </div>

                {/* Delivery Info */}
                {order.status === 'shipped' && order.estimatedDelivery && (
                  <div className="bg-secondary/50 p-3 rounded-lg">
                    <p className="text-sm font-medium text-secondary-foreground">
                      📦 Previsão de entrega: {new Date(order.estimatedDelivery).toLocaleDateString('pt-BR')}
                    </p>
                    {order.trackingNumber && (
                      <p className="text-sm text-muted-foreground">
                        Código de rastreamento: {order.trackingNumber}
                      </p>
                    )}
                  </div>
                )}

                {order.status === 'delivered' && order.deliveredAt && (
                  <div className="bg-success/10 p-3 rounded-lg">
                    <p className="text-sm font-medium text-success-foreground">
                      ✅ Entregue em {new Date(order.deliveredAt).toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex items-center space-x-2 pt-2">
                  <Button variant="outline" size="sm">
                    <Eye className="h-4 w-4 mr-2" />
                    Ver detalhes
                  </Button>
                  {order.status === 'shipped' && order.trackingNumber && (
                    <Button variant="outline" size="sm">
                      <Truck className="h-4 w-4 mr-2" />
                      Rastrear pedido
                    </Button>
                  )}
                  {order.status === 'delivered' && (
                    <Button variant="outline" size="sm">
                      Avaliar produtos
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Nenhum pedido encontrado</h3>
            <p className="text-muted-foreground mb-6">
              Você ainda não realizou nenhum pedido. Que tal começar a explorar nossa loja?
            </p>
            <Button asChild>
              <a href="/">Começar a Comprar</a>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Orders;