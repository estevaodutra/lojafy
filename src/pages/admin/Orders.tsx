import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { OrderSolicitations } from "@/components/admin/OrderSolicitations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Package, Search, Filter, AlertCircle, LayoutGrid, List } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig, getAvailableTransitions, type OrderStatus } from "@/constants/orderStatus";
import { cn } from "@/lib/utils";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  has_shipping_file: boolean;
  webhook_paid_status?: string | null;
  webhook_paid_dispatched_at?: string | null;
  webhook_paid_error?: string | null;
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
  const [viewMode, setViewMode] = useState<"table" | "pipeline">("table");
  const ordersPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();

    // Inscrever para atualizações em tempo real na tabela de pedidos
    const channel = supabase
      .channel('orders-realtime-admin')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'orders'
        },
        (payload) => {
          console.log('Atualização em tempo real recebida:', payload);
          fetchOrders();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
    // Optimistic update: save previous state and update UI immediately
    const previousOrders = orders;
    setOrders(prev => prev.map(order => 
      order.id === orderId ? { ...order, status: newStatus } : order
    ));

    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      // Insert into status history (non-blocking, log errors)
      const { error: historyError } = await supabase.from('order_status_history').insert({
        order_id: orderId,
        status: newStatus,
        notes: `Status atualizado pelo admin`,
      });

      if (historyError) {
        console.error('Error inserting status history:', historyError);
      }

      toast({
        title: "Sucesso",
        description: "Status do pedido atualizado",
      });
    } catch (error) {
      // Rollback on failure
      console.error('Error updating order status:', error);
      setOrders(previousOrders);
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
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg p-1 bg-muted/30">
            <Button
              variant={viewMode === "table" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("table")}
              className="h-8 gap-1.5 px-3"
            >
              <List className="w-4 h-4" />
              Tabela
            </Button>
            <Button
              variant={viewMode === "pipeline" ? "default" : "ghost"}
              size="sm"
              onClick={() => setViewMode("pipeline")}
              className="h-8 gap-1.5 px-3"
            >
              <LayoutGrid className="w-4 h-4" />
              Pipeline
            </Button>
          </div>
          <Badge variant="outline" className="text-sm py-1.5 px-3">
            <Package className="w-4 h-4 mr-1 inline-block" />
            {orders.length} pedidos
          </Badge>
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-6">
        <TabsList>
          <TabsTrigger value="orders">Todos os Pedidos</TabsTrigger>
          <TabsTrigger value="solicitations" className="flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Solicitações
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-6">
          {filteredOrders.length > 0 && (
            <p className="text-sm text-muted-foreground">
              Mostrando {showingFrom}-{showingTo} de {filteredOrders.length} pedidos
            </p>
          )}

          <Card>
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

          {viewMode === "table" ? (
            <>
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Número do Pedido</TableHead>
                        <TableHead>Cliente</TableHead>
                        <TableHead>Data</TableHead>
                        <TableHead>Pagamento</TableHead>
                        <TableHead>Webhook</TableHead>
                        <TableHead>Etiqueta</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Ações</TableHead>
                        <TableHead>Status de Envio</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                         <TableRow>
                           <TableCell colSpan={9} className="text-center py-8">
                             Carregando pedidos...
                           </TableCell>
                         </TableRow>
                      ) : filteredOrders.length === 0 ? (
                         <TableRow>
                           <TableCell colSpan={9} className="text-center py-8">
                             Nenhum pedido encontrado
                           </TableCell>
                         </TableRow>
                       ) : (
                        currentOrders.map((order) => {
                          return (
                           <TableRow key={order.id}>
                             <TableCell className="font-medium">
                               {order.order_number}
                             </TableCell>
                             <TableCell>
                               {order.profiles.first_name} {order.profiles.last_name}
                             </TableCell>
                             <TableCell>
                               {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                             </TableCell>
                             <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                             <TableCell>
                               {order.payment_status === 'paid' ? (
                                 order.webhook_paid_status === 'sent' ? (
                                   <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">✓ Enviado</Badge>
                                 ) : order.webhook_paid_status === 'failed' ? (
                                   <Badge variant="destructive" className="text-xs" title={order.webhook_paid_error ?? ''}>✗ Falhou</Badge>
                                 ) : (
                                   <Badge variant="outline" className="text-xs text-muted-foreground">Não enviado</Badge>
                                 )
                               ) : (
                                 <span className="text-xs text-muted-foreground">—</span>
                               )}
                             </TableCell>
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
            </>
          ) : (
            <div className="overflow-x-auto w-full pb-4 scrollbar-thin">
              <div className="flex gap-4 items-start min-w-max pb-2">
                {(() => {
                  const PIPELINE_COLUMNS: OrderStatus[] = [
                    "pendente",
                    "pago",
                    "recebido",
                    "embalado",
                    "enviado",
                    "finalizado"
                  ];

                  return PIPELINE_COLUMNS.map((colStatus) => {
                    const config = ORDER_STATUS_CONFIG[colStatus];
                    const StatusIcon = config.icon;
                    // Group "em_reposicao" in the "recebido" stage column
                    const columnOrders = filteredOrders.filter(order => {
                      if (colStatus === "recebido") {
                        return order.status === "recebido" || order.status === "em_reposicao";
                      }
                      return order.status === colStatus;
                    });

                    return (
                      <div key={colStatus} className="flex flex-col gap-4 w-[280px] min-w-[280px] flex-shrink-0 bg-muted/20 p-3 rounded-xl border border-border/40 max-h-[80vh]">
                      {/* Column Header */}
                      <div className="flex items-center justify-between border-b pb-2">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <div className={cn("p-1.5 rounded-lg text-xs", config.color.split(" ")[0])}>
                            <StatusIcon className="w-3.5 h-3.5" />
                          </div>
                          <h4 className="font-bold text-xs truncate max-w-[120px]" title={config.label}>
                            {config.label}
                          </h4>
                        </div>
                        <Badge variant="secondary" className="text-2xs font-semibold px-2 py-0.5 rounded-full">
                          {columnOrders.length}
                        </Badge>
                      </div>

                      {/* Column Cards Container */}
                      <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1 py-1">
                        {columnOrders.length === 0 ? (
                          <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg">
                            Sem pedidos
                          </div>
                        ) : (
                          columnOrders.map((order) => {
                            const isWarning = order.status === "em_reposicao";
                            return (
                              <div 
                                key={order.id} 
                                className={cn(
                                  "p-3 border rounded-lg bg-background/80 hover:bg-background transition-all duration-300 shadow-sm hover:shadow relative group flex flex-col gap-2",
                                  isWarning && "border-amber-400 bg-amber-500/5 hover:bg-amber-500/10"
                                )}
                              >
                                {/* Card Header */}
                                <div className="flex justify-between items-center text-xs">
                                  <span className="font-bold text-primary">#{order.order_number}</span>
                                  <span className="text-muted-foreground text-3xs">
                                    {format(new Date(order.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                  </span>
                                </div>

                                {/* Customer and Amount */}
                                <div className="text-2xs">
                                  <p className="font-semibold text-foreground truncate">
                                    {order.profiles.first_name} {order.profiles.last_name}
                                  </p>
                                  <p className="text-muted-foreground mt-0.5">
                                    Total: <span className="font-bold text-foreground">R$ {order.total_amount.toFixed(2)}</span>
                                  </p>
                                </div>

                                {/* Alert Badges */}
                                {isWarning && (
                                  <Badge variant="outline" className="text-3xs px-1.5 py-0 border-amber-300 text-amber-700 bg-amber-50 rounded w-fit">
                                    ⚠️ Reposição
                                  </Badge>
                                )}

                                {/* Card Footer / Actions */}
                                <div className="flex items-center justify-between gap-2 mt-1 border-t pt-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-2xs flex-1"
                                    onClick={() => setSelectedOrder(order)}
                                  >
                                    <Eye className="w-3.5 h-3.5 mr-1" />
                                    Ver
                                  </Button>

                                  <Select
                                    value={order.status}
                                    onValueChange={(val) => updateOrderStatus(order.id, val)}
                                  >
                                    <SelectTrigger className="h-7 w-[100px] text-3xs px-2 flex-1">
                                      <SelectValue placeholder="Status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                      {ALL_STATUSES.map((s) => (
                                        <SelectItem key={s} value={s} className="text-3xs">
                                          {ORDER_STATUS_CONFIG[s].label}
                                        </SelectItem>
                                      ))}
                                    </SelectContent>
                                  </Select>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="solicitations">
          <OrderSolicitations />
        </TabsContent>
      </Tabs>

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
