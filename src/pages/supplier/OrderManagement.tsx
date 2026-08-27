import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
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
import { Eye, Package, Search, Filter, AlertCircle } from "lucide-react";
import { format, isPast, isToday } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { useSupplierOrganization } from "@/hooks/supplier/useSupplierOrganization";
import { FULFILLMENT_STATUS_CONFIG, type FulfillmentStatus } from "@/constants/fulfillmentStatus";

interface SupplierOrderRow {
  id: string;
  fulfillment_id: string;
  order_id: string;
  order_number: string;
  status: string;
  order_status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  has_shipping_file: boolean;
  webhook_paid_status?: string | null;
  webhook_paid_dispatched_at?: string | null;
  webhook_paid_error?: string | null;
  sla_shipping_deadline?: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const ALL_STATUS_OPTIONS = [
  { value: "all", label: "Todos os status" },
  { value: "awaiting_picking", label: "Aguardando Separação" },
  { value: "picking", label: "Em Separação" },
  { value: "picked", label: "Separado" },
  { value: "packing", label: "Em Embalagem" },
  { value: "packed", label: "Embalado" },
  { value: "label_ready", label: "Etiqueta Pronta" },
  { value: "shipped", label: "Enviado" },
  { value: "in_transit", label: "Em Trânsito" },
  { value: "delivered", label: "Entregue" },
  { value: "occurrence", label: "Com Ocorrência" },
  { value: "cancelled", label: "Cancelado" },
  { value: "returned", label: "Devolvido" },
];

/**
 * Visão geral de pedidos do fornecedor com o mesmo layout, informações e colunas do Superadmin.
 */
const SupplierOrderManagement = () => {
  const [searchParams] = useSearchParams();
  const slaParam = searchParams.get('sla');

  const { data: orgData, isLoading: orgLoading } = useSupplierOrganization();
  const orgId = orgData?.organization?.id;

  const [orders, setOrders] = useState<SupplierOrderRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState<SupplierOrderRow | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const ordersPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    if (orgId) {
      fetchOrders();
    } else if (!orgLoading) {
      setLoading(false);
    }
  }, [orgId, orgLoading]);

  const fetchOrders = async () => {
    if (!orgId) return;
    try {
      setLoading(true);

      const { data: fulfillmentsData, error: fError } = await supabase
        .from('supplier_fulfillments')
        .select(`
          id,
          order_id,
          status,
          label_status,
          carrier,
          tracking_code,
          sla_picking_deadline,
          sla_shipping_deadline,
          created_at,
          orders!inner (
            id,
            order_number,
            status,
            payment_status,
            total_amount,
            user_id,
            created_at,
            webhook_paid_status,
            webhook_paid_error,
            webhook_paid_dispatched_at
          )
        `)
        .eq('supplier_organization_id', orgId)
        .order('created_at', { ascending: false });

      if (fError) throw fError;

      if (!fulfillmentsData || fulfillmentsData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = fulfillmentsData.map(f => f.order_id).filter(Boolean);

      let shippingFilesData: Array<{ order_id: string }> = [];
      if (orderIds.length > 0) {
        try {
          const { data } = await supabase
            .from('order_shipping_files')
            .select('order_id')
            .in('order_id', orderIds);
          shippingFilesData = data || [];
        } catch (err) {
          console.error('Error fetching shipping files:', err);
        }
      }
      const ordersWithShippingFiles = new Set(shippingFilesData.map(f => f.order_id));

      const userIds = [...new Set(fulfillmentsData.map(f => f.orders?.user_id).filter(Boolean))];
      let profilesData: Array<{ user_id: string; first_name: string | null; last_name: string | null }> = [];
      if (userIds.length > 0) {
        try {
          const { data } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);
          profilesData = data || [];
        } catch (err) {
          console.error('Error fetching profiles:', err);
        }
      }
      const profilesMap = new Map(profilesData.map(p => [p.user_id, p]));

      const mappedRows: SupplierOrderRow[] = fulfillmentsData.map(item => {
        const orderObj = item.orders;
        const profile = orderObj ? profilesMap.get(orderObj.user_id) : null;
        return {
          id: orderObj?.id || item.id,
          fulfillment_id: item.id,
          order_id: item.order_id,
          order_number: orderObj?.order_number || '',
          status: item.status || orderObj?.status || 'awaiting_picking',
          order_status: orderObj?.status || '',
          payment_status: orderObj?.payment_status || 'pending',
          total_amount: Number(orderObj?.total_amount || 0),
          created_at: orderObj?.created_at || item.created_at,
          user_id: orderObj?.user_id || '',
          has_shipping_file: ordersWithShippingFiles.has(item.order_id),
          webhook_paid_status: orderObj?.webhook_paid_status,
          webhook_paid_dispatched_at: orderObj?.webhook_paid_dispatched_at,
          webhook_paid_error: orderObj?.webhook_paid_error,
          sla_shipping_deadline: item.sla_shipping_deadline,
          profiles: {
            first_name: profile?.first_name || '',
            last_name: profile?.last_name || '',
          },
        };
      });

      setOrders(mappedRows);
    } catch (error) {
      console.error('Error fetching supplier orders:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar pedidos",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (row: SupplierOrderRow, newStatus: string) => {
    const previousOrders = orders;
    setOrders(prev => prev.map(o => o.fulfillment_id === row.fulfillment_id ? { ...o, status: newStatus } : o));

    try {
      const { error: fErr } = await supabase
        .from('supplier_fulfillments')
        .update({ status: newStatus as FulfillmentStatus })
        .eq('id', row.fulfillment_id);

      if (fErr) {
        const { error: oErr } = await supabase
          .from('orders')
          .update({ status: newStatus })
          .eq('id', row.order_id);
        if (oErr) throw oErr;
      }

      await supabase.from('order_status_history').insert({
        order_id: row.order_id,
        status: newStatus,
        notes: `Status atualizado pelo fornecedor`,
      });

      toast({
        title: "Sucesso",
        description: "Status do pedido atualizado",
      });
    } catch (error) {
      console.error('Error updating order status:', error);
      setOrders(previousOrders);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido",
        variant: "destructive",
      });
    }
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
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.profiles.first_name} ${order.profiles.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = statusFilter === "all" || order.status === statusFilter || order.order_status === statusFilter;

    let matchesSla = true;
    if (slaParam === "late" && order.sla_shipping_deadline) {
      matchesSla = isPast(new Date(order.sla_shipping_deadline));
    } else if (slaParam === "due_today" && order.sla_shipping_deadline) {
      matchesSla = isToday(new Date(order.sla_shipping_deadline));
    }

    return matchesSearch && matchesStatus && matchesSla;
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
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold">Gerenciar Pedidos</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Todos os fulfillments da sua operação
            {slaParam === 'late' && ' — mostrando atrasados'}
            {slaParam === 'due_today' && ' — vencendo hoje'}
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Package className="w-4 h-4 mr-1" />
          {orders.length} pedidos
        </Badge>
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
                  <SelectTrigger className="w-52">
                    <SelectValue placeholder="Status do pedido" />
                  </SelectTrigger>
                  <SelectContent>
                    {ALL_STATUS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
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
                      const clientName =
                        order.profiles.first_name || order.profiles.last_name
                          ? `${order.profiles.first_name} ${order.profiles.last_name}`.trim()
                          : "Cliente";

                      return (
                        <TableRow key={order.fulfillment_id}>
                          <TableCell className="font-medium">
                            #{order.order_number}
                          </TableCell>
                          <TableCell>{clientName}</TableCell>
                          <TableCell>
                            {order.created_at
                              ? format(new Date(order.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })
                              : "—"}
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
                              onValueChange={(value) => updateOrderStatus(order, value)}
                            >
                              <SelectTrigger className="w-[170px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {ALL_STATUS_OPTIONS.filter(o => o.value !== 'all').map((opt) => (
                                  <SelectItem key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </SelectItem>
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
        </TabsContent>

        <TabsContent value="solicitations">
          <OrderSolicitations />
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder.order_id}
          isOpen={!!selectedOrder}
          onClose={() => setSelectedOrder(null)}
        />
      )}
    </div>
  );
};

export default SupplierOrderManagement;
