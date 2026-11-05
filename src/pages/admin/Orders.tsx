import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { OrderSolicitations } from "@/components/admin/OrderSolicitations";
import { OrderPipelineView } from "@/components/pipeline/OrderPipelineView";
import { normalizeOrderToPipelineItem } from "@/utils/orderPipelineAdapter";
import { OrderPipelineItem } from "@/types/orderPipeline";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Package, Search, Filter, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from "@/components/ui/pagination";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig } from "@/constants/orderStatus";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  user_id: string;
  reseller_id?: string | null;
  has_shipping_file: boolean;
  tracking_number?: string | null;
  tracking_code?: string | null;
  external_reference?: string | null;
  marketplace?: string | null;
  ml_order_id?: string | null;
  ml_label_url?: string | null;
  pix_qr_code?: string | null;
  pix_qr_code_base64?: string | null;
  payment_expires_at?: string | null;
  webhook_paid_status?: string | null;
  webhook_paid_dispatched_at?: string | null;
  webhook_paid_error?: string | null;
  shipping_address?: any;
  order_items?: any[];
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
  const [profilesMap, setProfilesMap] = useState<Map<string, any>>(new Map());
  const [supplierOrgsMap, setSupplierOrgsMap] = useState<Map<string, any>>(new Map());
  const [ticketsMap, setTicketsMap] = useState<Map<string, any>>(new Map());
  const [productsMap, setProductsMap] = useState<Map<string, any>>(new Map());
  const ordersPerPage = 20;
  const { toast } = useToast();

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // 1. Fetch orders with order_items
      const { data: ordersData, error: ordersError } = await supabase
        .from("orders")
        .select(`
          *,
          order_items (
            id,
            product_id,
            quantity,
            unit_price,
            total_price,
            product_snapshot,
            supplier_id,
            supplier_organization_id,
            product:products (
              id,
              name,
              image_url,
              images,
              original_images
            )
          )
        `)
        .order("created_at", { ascending: false });

      if (ordersError) throw ordersError;

      if (!ordersData || ordersData.length === 0) {
        setOrders([]);
        setLoading(false);
        return;
      }

      const orderIds = ordersData.map((order) => order.id);

      // 2. Fetch shipping files status
      let shippingFilesData: Array<{ order_id: string }> = [];
      if (orderIds.length > 0) {
        try {
          const { data } = await supabase
            .from("order_shipping_files")
            .select("order_id")
            .in("order_id", orderIds);
          shippingFilesData = data || [];
        } catch (error) {
          console.error("Error fetching shipping files:", error);
        }
      }

      const ordersWithShippingFiles = new Set(
        shippingFilesData.map((file) => file.order_id)
      );

      // 3. Fetch profiles (users, resellers, suppliers)
      const allUserIds = new Set<string>();
      ordersData.forEach((order) => {
        if (order.user_id) allUserIds.add(order.user_id);
        if (order.reseller_id) allUserIds.add(order.reseller_id);
        if (Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            if (item.supplier_id) allUserIds.add(item.supplier_id);
          });
        }
      });

      const pMap = new Map<string, any>();
      if (allUserIds.size > 0) {
        try {
          const { data: profs } = await supabase
            .from("profiles")
            .select("user_id, first_name, last_name, business_name, role")
            .in("user_id", Array.from(allUserIds));
          if (profs) {
            profs.forEach((p) => pMap.set(p.user_id, p));
          }
        } catch (error) {
          console.error("Error fetching profiles:", error);
        }
      }
      setProfilesMap(pMap);

      // 4. Fetch supplier organizations
      const orgIds = new Set<string>();
      ordersData.forEach((order) => {
        if (Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            if (item.supplier_organization_id) {
              orgIds.add(item.supplier_organization_id);
            }
          });
        }
      });

      const sMap = new Map<string, any>();
      if (orgIds.size > 0) {
        try {
          const { data: orgs } = await supabase
            .from("supplier_organizations" as any)
            .select("id, name, trade_name")
            .in("id", Array.from(orgIds));
          if (orgs) {
            orgs.forEach((o: any) => sMap.set(o.id, o));
          }
        } catch {
          // ignore
        }
      }
      setSupplierOrgsMap(sMap);

      // 5. Fetch active tickets
      const tMap = new Map<string, any>();
      if (orderIds.length > 0) {
        try {
          const { data: tickets } = await supabase
            .from("order_tickets")
            .select("id, order_id, status, tipo")
            .in("order_id", orderIds)
            .neq("status", "resolvido");
          if (tickets) {
            tickets.forEach((t) => tMap.set(t.order_id, t));
          }
        } catch {
          // ignore
        }
      }
      setTicketsMap(tMap);

      // 5.5 Fetch products map
      const allProductIds = new Set<string>();
      ordersData.forEach((order) => {
        if (Array.isArray(order.order_items)) {
          order.order_items.forEach((item: any) => {
            if (item.product_id) allProductIds.add(item.product_id);
          });
        }
      });

      const prodMap = new Map<string, any>();
      if (allProductIds.size > 0) {
        try {
          const { data: prods } = await supabase
            .from("products")
            .select("id, name, image_url, images, original_images")
            .in("id", Array.from(allProductIds));
          if (prods) {
            prods.forEach((p) => prodMap.set(p.id, p));
          }
        } catch (error) {
          console.error("Error fetching products:", error);
        }
      }
      setProductsMap(prodMap);

      // 6. Assemble orders with profiles
      const ordersWithProfiles = ordersData.map((order) => {
        const profile = pMap.get(order.user_id);
        return {
          ...order,
          has_shipping_file: ordersWithShippingFiles.has(order.id) || !!order.has_shipping_file,
          profiles: profile
            ? {
                first_name: profile.first_name || "",
                last_name: profile.last_name || "",
              }
            : { first_name: "", last_name: "" },
        };
      }) as Order[];

      setOrders(ordersWithProfiles);
    } catch (error) {
      console.error("Error fetching orders:", error);
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
    // Optimistic update
    const previousOrders = orders;
    setOrders((prev) =>
      prev.map((order) => (order.id === orderId ? { ...order, status: newStatus } : order))
    );

    try {
      const { error } = await supabase
        .from("orders")
        .update({ status: newStatus, updated_at: new Date().toISOString() })
        .eq("id", orderId);

      if (error) throw error;

      // Status history
      await supabase.from("order_status_history").insert({
        order_id: orderId,
        status: newStatus,
        notes: `Status atualizado para ${newStatus}`,
      });

      toast({
        title: "Sucesso",
        description: "Status do pedido atualizado com sucesso.",
      });
    } catch (error) {
      console.error("Error updating order status:", error);
      setOrders(previousOrders);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do pedido",
        variant: "destructive",
      });
    }
  };

  // Convert raw orders to normalized pipeline items
  const pipelineItems: OrderPipelineItem[] = useMemo(() => {
    return orders.map((order) =>
      normalizeOrderToPipelineItem(order, {
        profilesMap,
        supplierOrgsMap,
        ticketsMap,
        productsMap,
      })
    );
  }, [orders, profilesMap, supplierOrgsMap, ticketsMap, productsMap]);

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      failed: { label: "Falhou", variant: "destructive" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      `${order.profiles.first_name} ${order.profiles.last_name}`
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
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

  // The existing table view
  const listViewContent = (
    <div className="space-y-4">
      {filteredOrders.length > 0 && (
        <p className="text-sm text-muted-foreground">
          Mostrando {showingFrom}-{showingTo} de {filteredOrders.length} pedidos
        </p>
      )}

      <Card>
        <CardHeader className="py-4">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filtros da Lista
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por número do pedido ou cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 h-9 text-xs"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-56 h-9 text-xs">
                <SelectValue placeholder="Status do pedido" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                {ALL_STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {ORDER_STATUS_CONFIG[s].label}
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
                  return (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">
                        #{order.order_number}
                      </TableCell>
                      <TableCell>
                        {order.profiles.first_name} {order.profiles.last_name}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell>{getPaymentStatusBadge(order.payment_status)}</TableCell>
                      <TableCell>
                        {order.payment_status === "paid" ? (
                          order.webhook_paid_status === "sent" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-xs">
                              ✓ Enviado
                            </Badge>
                          ) : order.webhook_paid_status === "failed" ? (
                            <Badge
                              variant="destructive"
                              className="text-xs"
                              title={order.webhook_paid_error ?? ""}
                            >
                              ✗ Falhou
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-xs text-muted-foreground">
                              Não enviado
                            </Badge>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {order.has_shipping_file ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-100"
                          >
                            📄 Enviada
                          </Badge>
                        ) : (
                          <Badge variant="outline">📄 Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total_amount)}
                      </TableCell>
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
                          <SelectTrigger className="w-[180px] h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>
                                {ORDER_STATUS_CONFIG[s].label}
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
        <div className="mt-4">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    currentPage === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"
                  }
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex-1 min-h-0 h-full max-h-full flex flex-col overflow-hidden w-full space-y-1.5">
      <Tabs defaultValue="pipeline_flow" className="flex-1 min-h-0 flex flex-col overflow-hidden space-y-1.5">
        {/* Compact Header Line */}
        <div className="flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-foreground">Gestão de Pedidos</h1>
            <TabsList className="h-7 bg-muted/60 p-0.5">
              <TabsTrigger value="pipeline_flow" className="text-xs h-6 px-2.5">
                Operação
              </TabsTrigger>
              <TabsTrigger value="solicitations" className="text-xs h-6 px-2.5 flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                Solicitações
              </TabsTrigger>
            </TabsList>
          </div>

          <Badge variant="outline" className="text-xs py-0.5 px-2 font-normal hidden sm:inline-flex">
            <Package className="w-3 h-3 mr-1 text-primary" />
            {orders.length} pedidos totais
          </Badge>
        </div>

        <TabsContent
          value="pipeline_flow"
          className="flex-1 min-h-0 flex flex-col overflow-hidden data-[state=active]:flex mt-0"
        >
          <OrderPipelineView
            orders={pipelineItems}
            isLoading={loading}
            onUpdateOrderStatus={updateOrderStatus}
            listViewContent={listViewContent}
            userScopeLabel="Administração Geral"
            onRefreshOrders={fetchOrders}
          />
        </TabsContent>

        <TabsContent
          value="solicitations"
          className="flex-1 min-h-0 overflow-y-auto data-[state=active]:block mt-0"
        >
          <OrderSolicitations />
        </TabsContent>
      </Tabs>

      {selectedOrder && (
        <OrderDetailsModal
          orderId={selectedOrder.id}
          isOpen={!!selectedOrder}
          onClose={() => {
            setSelectedOrder(null);
            fetchOrders();
          }}
        />
      )}
    </div>
  );
};

export default AdminOrders;
