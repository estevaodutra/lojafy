import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ShoppingCart, Eye, Edit, Truck, Package, CheckCircle, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AdminOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  payment_status: string;
  created_at: string;
  tracking_number?: string;
  user_id: string;
  profiles?: {
    first_name: string;
    last_name: string;
  };
}

export const OrdersManagementSection = () => {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [newStatus, setNewStatus] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      let query = supabase
        .from('orders')
        .select(`
          id,
          order_number,
          total_amount,
          status,
          payment_status,
          created_at,
          tracking_number,
          user_id
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data: ordersData, error: ordersError } = await query;

      if (ordersError) throw ordersError;

      // Fetch user profiles for orders
      let ordersWithProfiles: AdminOrder[] = [];
      if (ordersData) {
        const userIds = [...new Set(ordersData.map(order => order.user_id))];
        const { data: profilesData } = await supabase
          .from('profiles')
          .select('user_id, first_name, last_name')
          .in('user_id', userIds);

        ordersWithProfiles = ordersData.map(order => ({
          ...order,
          profiles: profilesData?.find(p => p.user_id === order.user_id) || {
            first_name: 'Cliente',
            last_name: ''
          }
        }));
      }

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Erro ao buscar pedidos:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os pedidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!selectedOrder || !newStatus) return;

    try {
      const updateData: any = { status: newStatus };
      if (trackingNumber.trim()) {
        updateData.tracking_number = trackingNumber.trim();
      }

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', selectedOrder.id);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Pedido atualizado com sucesso",
      });

      setIsUpdateDialogOpen(false);
      setSelectedOrder(null);
      setNewStatus('');
      setTrackingNumber('');
      fetchOrders();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o pedido",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'processing': return <Package className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      case 'refunded': return <CheckCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'processing': return 'outline';
      case 'pending': return 'outline';
      case 'refunded': return 'secondary';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'processing': return 'Em preparação';
      case 'shipped': return 'Despachado';
      case 'delivered': return 'Finalizado';
      case 'cancelled': return 'Cancelado';
      case 'refunded': return 'Reembolsado';
      default: return 'Desconhecido';
    }
  };

  const getPaymentStatusVariant = (status: string) => {
    switch (status) {
      case 'paid': return 'default';
      case 'pending': return 'outline';
      case 'failed': return 'destructive';
      default: return 'outline';
    }
  };

  const getPaymentStatusLabel = (status: string) => {
    switch (status) {
      case 'paid': return 'Pago';
      case 'pending': return 'Pendente';
      case 'failed': return 'Falhou';
      default: return 'Desconhecido';
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" />
              Pedidos
            </CardTitle>
            <CardDescription>
              Gerencie todos os pedidos da loja
            </CardDescription>
          </div>
          
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filtrar por status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos os Status</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="processing">Em preparação</SelectItem>
              <SelectItem value="shipped">Despachado</SelectItem>
              <SelectItem value="delivered">Finalizado</SelectItem>
              <SelectItem value="cancelled">Cancelado</SelectItem>
              <SelectItem value="refunded">Reembolsado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8">
            <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-3">
                    <h3 className="font-medium">
                      {order.profiles?.first_name} {order.profiles?.last_name}
                    </h3>
                    <Badge variant={getPaymentStatusVariant(order.payment_status)} className="text-xs">
                      {getPaymentStatusLabel(order.payment_status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>#{order.order_number}</span>
                    <span>{new Date(order.created_at).toLocaleDateString('pt-BR')}</span>
                    <span className="font-semibold text-foreground">R$ {Number(order.total_amount).toFixed(2)}</span>
                    {order.tracking_number && (
                      <span className="flex items-center gap-1">
                        <Truck className="h-3 w-3" />
                        {order.tracking_number}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Badge variant={getStatusVariant(order.status)} className="text-xs">
                    {getStatusIcon(order.status)}
                    <span className="ml-1">{getStatusLabel(order.status)}</span>
                  </Badge>
                  
                  <Dialog 
                    open={isUpdateDialogOpen && selectedOrder?.id === order.id} 
                    onOpenChange={(open) => {
                      setIsUpdateDialogOpen(open);
                      if (!open) {
                        setSelectedOrder(null);
                        setNewStatus('');
                        setTrackingNumber('');
                      }
                    }}
                  >
                    <DialogTrigger asChild>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          setSelectedOrder(order);
                          setNewStatus(order.status);
                          setTrackingNumber(order.tracking_number || '');
                        }}
                      >
                        <Edit className="h-3 w-3 mr-1" />
                        Editar
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Atualizar Pedido #{order.order_number}</DialogTitle>
                        <DialogDescription>
                          Atualize o status do pedido e adicione informações de rastreamento.
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="status">Status do Pedido</Label>
                          <Select value={newStatus} onValueChange={setNewStatus}>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecione o status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="pending">Pendente</SelectItem>
                              <SelectItem value="processing">Em preparação</SelectItem>
                              <SelectItem value="shipped">Despachado</SelectItem>
                              <SelectItem value="delivered">Finalizado</SelectItem>
                              <SelectItem value="cancelled">Cancelado</SelectItem>
                              <SelectItem value="refunded">Reembolsado</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div>
                          <Label htmlFor="tracking">Código de Rastreamento</Label>
                          <Input
                            id="tracking"
                            value={trackingNumber}
                            onChange={(e) => setTrackingNumber(e.target.value)}
                            placeholder="Ex: BR123456789BR"
                          />
                        </div>
                        
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => setIsUpdateDialogOpen(false)}
                          >
                            Cancelar
                          </Button>
                          <Button onClick={handleUpdateOrder}>
                            Atualizar Pedido
                          </Button>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </div>
            ))}
            
            {orders.length === 0 && (
              <div className="text-center py-8">
                <ShoppingCart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  {statusFilter === 'all' ? 'Nenhum pedido encontrado' : `Nenhum pedido com status "${getStatusLabel(statusFilter)}" encontrado`}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};