import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useLocation } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { OrderPipelineView } from "@/components/pipeline/OrderPipelineView";
import { OrdersOverviewSubpage } from "@/components/pipeline/subpages/OrdersOverviewSubpage";
import { OrdersOccurrencesSubpage } from "@/components/pipeline/subpages/OrdersOccurrencesSubpage";
import { OrdersSettingsSubpage } from "@/components/pipeline/subpages/OrdersSettingsSubpage";
import { BatchArchiveDialog } from "@/components/pipeline/BatchArchiveDialog";
import { ArchiveOrderDialog } from "@/components/pipeline/ArchiveOrderDialog";
import { normalizeOrderToPipelineItem } from "@/utils/orderPipelineAdapter";
import { OrderPipelineItem } from "@/types/orderPipeline";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  Eye,
  Package,
  Search,
  Filter,
  AlertCircle,
  RotateCw,
  Archive,
  BarChart3,
  Settings2,
  Layers,
} from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ALL_STATUSES, ORDER_STATUS_CONFIG, getStatusConfig } from "@/constants/orderStatus";

interface Order {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total_amount: number;
  created_at: string;
  updated_at?: string;
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
  is_archived?: boolean;
  archived_at?: string | null;
  archived_reason?: string | null;
  archived_by?: string | null;
  archived_type?: "manual" | "auto" | null;
  stage_entered_at?: string | null;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

const AdminOrders = () => {
  const location = useLocation();
  const [searchParams] = useSearchParams();

  const activeSubpage = useMemo(() => {
    const path = location.pathname;
    if (path.endsWith("/visao-geral") || searchParams.get("tab") === "visao-geral") return "visao-geral";
    if (path.endsWith("/ocorrencias") || searchParams.get("tab") === "ocorrencias") return "ocorrencias";
    if (path.endsWith("/configuracoes") || searchParams.get("tab") === "configuracoes") return "configuracoes";
    return "pedidos";
  }, [location.pathname, searchParams]);

  const pageTitle = useMemo(() => {
    switch (activeSubpage) {
      case "visao-geral":
        return "Visão Geral dos Pedidos";
      case "ocorrencias":
        return "Ocorrências & Pós-Venda";
      case "configuracoes":
        return "Configurações de Pedidos";
      default:
        return "Gestão de Pedidos";
    }
  }, [activeSubpage]);

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

  // Bulk selection in list view
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [isBatchArchiveOpen, setIsBatchArchiveOpen] = useState(false);
  const [singleArchiveOrder, setSingleArchiveOrder] = useState<OrderPipelineItem | null>(null);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);

      // 1. Fetch orders with order_items
      // Default: Newest first (ORDER BY created_at DESC)
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
            supplier_unit_cost,
            supplier_total_cost,
            product_snapshot,
            supplier_id,
            supplier_organization_id,
            product:products (
              id,
              name,
              image_url,
              images,
              original_images,
              cost_price,
              price
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
            .select("id, name, image_url, images, original_images, cost_price, price")
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
        .update({
          status: newStatus,
          stage_entered_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any)
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

  const activeOrdersCount = useMemo(() => {
    return pipelineItems.filter((o) => !o.is_archived).length;
  }, [pipelineItems]);

  const getPaymentStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { label: "Pendente", variant: "secondary" as const },
      paid: { label: "Pago", variant: "default" as const },
      failed: { label: "Falhou", variant: "destructive" as const },
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      // By default in list view: show non-archived unless specified
      if (order.is_archived) return false;

      const matchesSearch =
        order.order_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
        `${order.profiles.first_name} ${order.profiles.last_name}`
          .toLowerCase()
          .includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === "all" || order.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  useEffect(() => {
    setCurrentPage(1);
    setSelectedRowIds([]);
  }, [searchTerm, statusFilter]);

  const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);
  const startIndex = (currentPage - 1) * ordersPerPage;
  const endIndex = startIndex + ordersPerPage;
  const currentOrders = filteredOrders.slice(startIndex, endIndex);
  const showingFrom = filteredOrders.length > 0 ? startIndex + 1 : 0;
  const showingTo = Math.min(endIndex, filteredOrders.length);

  // Checkbox helpers for batch actions
  const isAllPageSelected =
    currentOrders.length > 0 &&
    currentOrders.every((o) => selectedRowIds.includes(o.id));

  const toggleSelectAllPage = () => {
    if (isAllPageSelected) {
      setSelectedRowIds((prev) =>
        prev.filter((id) => !currentOrders.some((o) => o.id === id))
      );
    } else {
      const pageIds = currentOrders.map((o) => o.id);
      setSelectedRowIds((prev) => Array.from(new Set([...prev, ...pageIds])));
    }
  };

  const toggleSelectRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectedPipelineItems = useMemo(() => {
    return pipelineItems.filter((p) => selectedRowIds.includes(p.id));
  }, [pipelineItems, selectedRowIds]);

  // Existing table view with batch actions integrated
  const listViewContent = (
    <div className="space-y-3">
      {/* Batch action bar if items selected */}
      {selectedRowIds.length > 0 && (
        <div className="flex items-center justify-between p-2 px-3 rounded-lg border bg-primary/5 text-primary text-xs">
          <span className="font-semibold">
            {selectedRowIds.length} pedido(s) selecionado(s)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs gap-1 border-primary/30"
              onClick={() => setIsBatchArchiveOpen(true)}
            >
              <Archive className="w-3.5 h-3.5" />
              Arquivar Selecionados
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
              onClick={() => setSelectedRowIds([])}
            >
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {filteredOrders.length > 0 && (
        <p className="text-xs text-muted-foreground">
          Mostrando {showingFrom}-{showingTo} de {filteredOrders.length} pedidos
        </p>
      )}

      <Card className="shadow-2xs border">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead className="w-8 py-2.5 px-3">
                  <Checkbox
                    checked={isAllPageSelected}
                    onCheckedChange={toggleSelectAllPage}
                  />
                </TableHead>
                <TableHead className="py-2.5">Número do Pedido</TableHead>
                <TableHead className="py-2.5">Cliente</TableHead>
                <TableHead className="py-2.5">Data</TableHead>
                <TableHead className="py-2.5">Pagamento</TableHead>
                <TableHead className="py-2.5">Webhook</TableHead>
                <TableHead className="py-2.5">Etiqueta</TableHead>
                <TableHead className="py-2.5">Total</TableHead>
                <TableHead className="py-2.5">Ações</TableHead>
                <TableHead className="py-2.5">Status de Envio</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                    Carregando pedidos...
                  </TableCell>
                </TableRow>
              ) : filteredOrders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={10} className="text-center py-8 text-xs text-muted-foreground">
                    Nenhum pedido encontrado
                  </TableCell>
                </TableRow>
              ) : (
                currentOrders.map((order) => {
                  const isChecked = selectedRowIds.includes(order.id);
                  const pipeItem = pipelineItems.find((p) => p.id === order.id);

                  return (
                    <TableRow key={order.id} className={isChecked ? "bg-muted/40 text-xs" : "text-xs"}>
                      <TableCell className="py-2 px-3">
                        <Checkbox
                          checked={isChecked}
                          onCheckedChange={() => toggleSelectRow(order.id)}
                        />
                      </TableCell>
                      <TableCell className="font-semibold py-2">
                        #{order.order_number}
                      </TableCell>
                      <TableCell className="py-2">
                        {order.profiles.first_name} {order.profiles.last_name}
                      </TableCell>
                      <TableCell className="py-2 text-muted-foreground whitespace-nowrap">
                        {format(new Date(order.created_at), "dd/MM/yyyy HH:mm", {
                          locale: ptBR,
                        })}
                      </TableCell>
                      <TableCell className="py-2">{getPaymentStatusBadge(order.payment_status)}</TableCell>
                      <TableCell className="py-2">
                        {order.payment_status === "paid" ? (
                          order.webhook_paid_status === "sent" ? (
                            <Badge className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]">
                              ✓ Enviado
                            </Badge>
                          ) : order.webhook_paid_status === "failed" ? (
                            <Badge
                              variant="destructive"
                              className="text-[10px]"
                              title={order.webhook_paid_error ?? ""}
                            >
                              ✗ Falhou
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="text-[10px] text-muted-foreground">
                              Não enviado
                            </Badge>
                          )
                        ) : (
                          <span className="text-[11px] text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {order.has_shipping_file ? (
                          <Badge
                            variant="default"
                            className="bg-green-100 text-green-800 hover:bg-green-100 text-[10px]"
                          >
                            📄 Enviada
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[10px]">📄 Pendente</Badge>
                        )}
                      </TableCell>
                      <TableCell className="py-2 font-medium">
                        {new Intl.NumberFormat("pt-BR", {
                          style: "currency",
                          currency: "BRL",
                        }).format(order.total_amount)}
                      </TableCell>
                      <TableCell className="py-2">
                        <div className="flex items-center gap-1">
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => setSelectedOrder(order)}
                            title="Ver detalhes"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Button>

                          {pipeItem && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
                              onClick={() => setSingleArchiveOrder(pipeItem)}
                              title="Arquivar pedido"
                            >
                              <Archive className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="py-2">
                        <Select
                          value={order.status}
                          onValueChange={(value) => updateOrderStatus(order.id, value)}
                        >
                          <SelectTrigger className="w-[160px] h-7 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {ALL_STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="text-xs">
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
        <div className="mt-2">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className={currentPage === 1 ? "pointer-events-none opacity-50 text-xs" : "cursor-pointer text-xs"}
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
                        className="cursor-pointer text-xs h-7 w-7"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return (
                    <PaginationItem key={page}>
                      <span className="px-2 text-xs">...</span>
                    </PaginationItem>
                  );
                }
                return null;
              })}

              <PaginationItem>
                <PaginationNext
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className={
                    currentPage === totalPages ? "pointer-events-none opacity-50 text-xs" : "cursor-pointer text-xs"
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
      {/* Header Line (Sem abas horizontais; navegação via collapse na sidebar) */}
      <div className="flex items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold tracking-tight text-foreground">{pageTitle}</h1>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-xs py-0.5 px-2 font-normal hidden sm:inline-flex">
            <Package className="w-3 h-3 mr-1 text-primary" />
            {activeOrdersCount} pedidos ativos
          </Badge>

          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-muted-foreground hover:text-foreground"
            onClick={fetchOrders}
            title="Atualizar lista de pedidos"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Renderização direta da subpágina ativa selecionada na sidebar */}
      <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
        {activeSubpage === "pedidos" && (
          <OrderPipelineView
            orders={pipelineItems}
            isLoading={loading}
            onUpdateOrderStatus={updateOrderStatus}
            listViewContent={listViewContent}
            userScopeLabel="Administração Geral"
            onRefreshOrders={fetchOrders}
          />
        )}

        {activeSubpage === "visao-geral" && (
          <OrdersOverviewSubpage orders={pipelineItems} />
        )}

        {activeSubpage === "ocorrencias" && (
          <OrdersOccurrencesSubpage orders={pipelineItems} />
        )}

        {activeSubpage === "configuracoes" && (
          <OrdersSettingsSubpage orders={pipelineItems} onRefreshOrders={fetchOrders} />
        )}
      </div>

      {/* Order Details Modal (Shared) */}
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

      {/* Batch Archive Dialog */}
      <BatchArchiveDialog
        orders={selectedPipelineItems}
        isOpen={isBatchArchiveOpen}
        onClose={() => setIsBatchArchiveOpen(false)}
        onSuccess={() => {
          setSelectedRowIds([]);
          fetchOrders();
        }}
      />

      {/* Single Archive Dialog from Table List Action */}
      <ArchiveOrderDialog
        order={singleArchiveOrder}
        isOpen={!!singleArchiveOrder}
        onClose={() => setSingleArchiveOrder(null)}
        onSuccess={() => {
          setSingleArchiveOrder(null);
          fetchOrders();
        }}
      />
    </div>
  );
};

export default AdminOrders;
