import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { Eye, Package, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useSupplierOrders } from "@/hooks/useSupplierOrders";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, SUPPLIER_QUICK_ACTIONS, type OrderStatus } from "@/constants/orderStatus";
import { ReposicaoModal } from "@/components/supplier/ReposicaoModal";
import { EmFaltaModal } from "@/components/supplier/EmFaltaModal";
import { toast as sonnerToast } from "sonner";

const SupplierOrderManagement = () => {
  const { data: orders = [], isLoading, refetch } = useSupplierOrders();
  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;
  const { toast } = useToast();

  // Modal states
  const [reposicaoOrder, setReposicaoOrder] = useState<any>(null);
  const [emFaltaOrder, setEmFaltaOrder] = useState<any>(null);

  const getStatusBadge = (status: string) => {
    const config = getStatusConfig(status);
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      failed: { label: "Falhou", variant: "destructive" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const updateOrderStatus = async (orderId: string, newStatus: string, extra?: { estimated_shipping_date?: string; status_reason?: string }) => {
    try {
      const updateData: Record<string, any> = { status: newStatus };
      if (extra?.estimated_shipping_date) updateData.estimated_shipping_date = extra.estimated_shipping_date;
      if (extra?.status_reason) updateData.status_reason = extra.status_reason;

      const { error } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (error) throw error;

      // Insert into status history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes: extra?.status_reason || `Status atualizado pelo fornecedor`,
      });

      // If em_falta, deactivate products
      if (newStatus === 'em_falta') {
        await deactivateOrderProducts(orderId);
      }

      // Create notification for customer
      await createStatusNotification(orderId, newStatus, extra);

      toast({ title: "Sucesso", description: "Status do pedido atualizado" });
      refetch();
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({ title: "Erro", description: "Erro ao atualizar status", variant: "destructive" });
    }
  };

  const deactivateOrderProducts = async (orderId: string) => {
    try {
      const { data: items } = await supabase
        .from('order_items')
        .select('product_id')
        .eq('order_id', orderId);

      if (!items || items.length === 0) return;

      const productIds = items.map(i => i.product_id);
      await supabase
        .from('products')
        .update({ active: false })
        .in('id', productIds);

      sonnerToast.warning(`${productIds.length} produto(s) indisponibilizado(s) por falta.`);

      // Notify super admins
      const { data: admins } = await supabase
        .from('profiles')
        .select('user_id')
        .eq('role', 'super_admin');

      if (admins) {
        const notifications = admins.map(admin => ({
          user_id: admin.user_id,
          title: '⚠️ Produtos Indisponibilizados',
          message: `${productIds.length} produto(s) foram indisponibilizados por falta no pedido.`,
          type: 'product_unavailable',
        }));
        await supabase.from('notifications').insert(notifications);
      }
    } catch (error) {
      console.error('Error deactivating products:', error);
    }
  };

  const createStatusNotification = async (orderId: string, newStatus: string, extra?: { estimated_shipping_date?: string }) => {
    try {
      const { data: order } = await supabase
        .from('orders')
        .select('user_id, order_number, tracking_number, reseller_id')
        .eq('id', orderId)
        .single();

      if (!order) return;

      const { STATUS_NOTIFICATION_MESSAGES, RESELLER_NOTIFY_STATUSES } = await import('@/constants/orderStatus');
      
      let message = STATUS_NOTIFICATION_MESSAGES[newStatus as OrderStatus] || '';
      message = message.replace('{numero}', order.order_number);
      message = message.replace('{codigo}', order.tracking_number || 'Em breve');
      if (extra?.estimated_shipping_date) {
        message = message.replace('{data}', new Date(extra.estimated_shipping_date).toLocaleDateString('pt-BR'));
      }

      // Notify customer
      if (order.user_id) {
        await supabase.from('notifications').insert({
          user_id: order.user_id,
          title: `📦 Atualização do Pedido #${order.order_number}`,
          message,
          type: 'order_status',
          action_url: '/minha-conta/pedidos',
        });
      }

      // Notify reseller if applicable
      if (order.reseller_id && RESELLER_NOTIFY_STATUSES.includes(newStatus as OrderStatus)) {
        await supabase.from('notifications').insert({
          user_id: order.reseller_id,
          title: `📦 Pedido #${order.order_number} - ${getStatusConfig(newStatus).label}`,
          message,
          type: 'order_status',
          action_url: '/reseller/pedidos',
        });
      }
    } catch (error) {
      console.error('Error creating notification:', error);
    }
  };

  const handleQuickAction = (order: any, targetStatus: OrderStatus, requiresModal?: string) => {
    if (requiresModal === 'reposicao') {
      setReposicaoOrder(order);
    } else if (requiresModal === 'em_falta') {
      setEmFaltaOrder(order);
    } else {
      updateOrderStatus(order.id, targetStatus);
    }
  };

  const filteredOrders = orders.filter(order => {
    const matchesSearch = order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.profiles.first_name} ${order.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);
  const showingFrom = filteredOrders.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredOrders.length);

  const calculateSupplierTotal = (order: any) => {
    return order.order_items?.reduce((sum: number, item: any) => 
      sum + parseFloat(item.total_price || 0), 0
    ) || 0;
  };

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Pedidos com Meus Produtos</h1>
          {filteredOrders.length > 0 && (
            <p className="text-sm text-muted-foreground mt-1">
              Mostrando {showingFrom}-{showingTo} de {filteredOrders.length} pedidos
            </p>
          )}
        </div>
        <Badge variant="outline" className="text-sm">
          <Package className="w-4 h-4 mr-1" />
          {orders.length} pedidos
        </Badge>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por número do pedido ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Status do pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{ORDER_STATUS_CONFIG[s].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número do Pedido</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Pagamento</TableHead>
                <TableHead>Meus Itens</TableHead>
                <TableHead>Valor (Meus Produtos)</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Carregando pedidos...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-8">
                    Nenhum pedido encontrado com seus produtos
                  </TableCell>
                </TableRow>
              ) : (
                currentOrders.map((order) => {
                  const quickActions = SUPPLIER_QUICK_ACTIONS.filter(a => 
                    a.showWhen.includes(order.status as OrderStatus)
                  );
                  
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        {order.profiles.first_name} {order.profiles.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {order.order_items?.length || 0} produto(s)
                        </Badge>
                      </TableCell>
                      <TableCell>R$ {calculateSupplierTotal(order).toFixed(2)}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1 flex-wrap">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setSelectedOrder(order)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          {quickActions.map((action) => (
                            <Button
                              key={action.targetStatus}
                              variant={action.variant || "default"}
                              size="sm"
                              onClick={() => handleQuickAction(order, action.targetStatus, action.requiresModal)}
                            >
                              {action.label}
                            </Button>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {totalPages > 1 && (
        <div className="mt-6">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                if (
                  page === 1 ||
                  page === totalPages ||
                  (page >= currentPage - 1 && page <= currentPage + 1)
                ) {
                  return (
                    <PaginationItem key={page}>
                      <PaginationLink
                        onClick={() => setCurrentPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <span className="px-4">...</span>
                    </PaginationItem>
                  );
                }
                return null;
              })}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className={currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder.id}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}

      {/* Modals */}
      <ReposicaoModal
        isOpen={!!reposicaoOrder}
        onClose={() => setReposicaoOrder(null)}
        orderNumber={reposicaoOrder?.order_number || ''}
        onConfirm={(date, reason) => {
          updateOrderStatus(reposicaoOrder.id, 'em_reposicao', {
            estimated_shipping_date: date,
            status_reason: reason,
          });
          setReposicaoOrder(null);
        }}
      />
      <EmFaltaModal
        isOpen={!!emFaltaOrder}
        onClose={() => setEmFaltaOrder(null)}
        orderNumber={emFaltaOrder?.order_number || ''}
        onConfirm={(reason) => {
          updateOrderStatus(emFaltaOrder.id, 'em_falta', { status_reason: reason });
          setEmFaltaOrder(null);
        }}
      />
    </div>
  );
};

export default SupplierOrderManagement;
