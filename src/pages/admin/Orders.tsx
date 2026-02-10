import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Package, Search, Filter } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, getAvailableTransitions, type OrderStatus } from "@/constants/orderStatus";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  has_shipping_file: boolean;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      
      const { data: ordersData, error: ordersError } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = ordersData.map(order => order.id);
      
      let shippingFilesData: Array<{ order_id: string }> = [];
      if (orderIds.length > 0) {
        try {
          const { data } = await supabase
            .from('order_shipping_files')
            .select('order_id')
            .in('order_id', orderIds);
          shippingFilesData = data || [];
        } catch (error) {
          console.error('Error fetching shipping files:', error);
          toast({
            title: "Aviso",
            description: "Não foi possível carregar status dos arquivos de envio.",
            variant: "default",
          });
        }
      }

      const ordersWithShippingFiles = new Set(
        shippingFilesData.map(file => file.order_id)
      );

      const userIds = [...new Set(ordersData.map(order => order.user_id).filter(Boolean))];
      let profilesData: Array<{ user_id: string; first_name: string | null; last_name: string | null }> = [];
      if (userIds.length > 0) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);
          profilesData = data || [];
        } catch (error) {
          console.error('Error fetching profiles:', error);
          toast({
            title: "Aviso",
            description: "Não foi possível carregar informações de clientes.",
            variant: "default",
          });
        }
      }

      const profilesMap = new Map(
        profilesData.map(profile => [profile.user_id, profile])
      );

      const ordersWithProfiles = ordersData.map(order => {
        const profile = profilesMap.get(order.user_id);
        return {
          ...order,
          has_shipping_file: ordersWithShippingFiles.has(order.id),
          profiles: profile ? {
            first_name: profile.first_name,
            last_name: profile.last_name
          } : { first_name: '', last_name: '' }
        };
      }) as Order[];
      
      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Insert into status history
      await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes: `Status atualizado pelo admin`,
      });

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Sucesso",
        description: "Status do pedido atualizado",
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido",
        variant: "destructive",
      });
    }
  };

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

  return (
    <div className="container mx-auto p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Pedidos</h1>
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
                <TableHead>Pagamento</TableHead>
                <TableHead>Etiqueta</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Ações</TableHead>
                <TableHead>Status de Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                   <TableCell colSpan={8} className="text-center py-8">
                     Carregando pedidos...
                   </TableCell>
                 </TableRow>
              ) : filteredOrders.length === 0 ? (
                 <TableRow>
                   <TableCell colSpan={8} className="text-center py-8">
                     Nenhum pedido encontrado
                   </TableCell>
                 </TableRow>
               ) : (
                currentOrders.map((order) => (
                   <TableRow key={order.id}>
                     <TableCell className="font-medium">{order.order_number}</TableCell>
                     <TableCell>
                       {order.profiles.first_name} {order.profiles.last_name}
                     </TableCell>
                     <TableCell>
                       {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                     </TableCell>
                     <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                     <TableCell>
                       {order.has_shipping_file ? (
                         <Badge variant="default" className="bg-green-100 text-green-800 hover:bg-green-100">
                           📄 Enviada
                         </Badge>
                       ) : (
                         <Badge variant="outline">
                           📄 Pendente
                         </Badge>
                       )}
                     </TableCell>
                     <TableCell>R$ {order.total_amount.toFixed(2)}</TableCell>
                     <TableCell>
                       <Button
                         variant="outline"
                         size="sm"
                         onClick={() => setSelectedOrder(order)}
                       >
                         <Eye className="w-4 h-4" />
                       </Button>
                     </TableCell>
                     <TableCell>
                       <Select
                         value={order.status}
                         onValueChange={(value) => updateOrderStatus(order.id, value)}
                       >
                         <SelectTrigger className="w-[160px]">
                           <SelectValue />
                         </SelectTrigger>
                         <SelectContent>
                           {ALL_STATUSES.map((s) => (
                             <SelectItem key={s} value={s}>{ORDER_STATUS_CONFIG[s].label}</SelectItem>
                           ))}
                         </SelectContent>
                       </Select>
                     </TableCell>
                  </TableRow>
                ))
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
    </div>
  );
};

export default AdminOrders;
