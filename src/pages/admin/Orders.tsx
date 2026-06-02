import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import OrderDetailsModal from "@/components/OrderDetailsModal";
import { OrderSolicitations } from "@/components/admin/OrderSolicitations";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Eye, Package, Search, Filter, AlertCircle, LayoutGrid, List } from "lucide-react";
import * as Lucide from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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

  // Active pipeline tab
  const [activePipelineTab, setActivePipelineTab] = useState<"primary" | "secondary" | "tertiary">("primary");
  
  // Pipeline columns state
  const [pipelineColumns, setPipelineColumns] = useState<any[]>([]);
  
  // Tickets state (for the secondary pipeline)
  const [tickets, setTickets] = useState<any[]>([]);
  
  // Columns Dialog states
  const [isColumnsDialogOpen, setIsColumnsDialogOpen] = useState(false);
  const [editingLabels, setEditingLabels] = useState<Record<string, string>>({});
  const [editingIcons, setEditingIcons] = useState<Record<string, string>>({});
  const [editingColors, setEditingColors] = useState<Record<string, string>>({});
  
  // Add new column states
  const [newColLabel, setNewColLabel] = useState("");
  const [newColKey, setNewColKey] = useState("");
  const [keyManuallyEdited, setKeyManuallyEdited] = useState(false);
  const [newColIcon, setNewColIcon] = useState("HelpCircle");
  const [newColColor, setNewColColor] = useState("bg-gray-100 text-gray-800");

  const AVAILABLE_ICONS = [
    { name: "Clock", label: "Relógio" },
    { name: "Package", label: "Pacote" },
    { name: "Send", label: "Enviar" },
    { name: "CheckCircle", label: "Sucesso" },
    { name: "Ticket", label: "Ticket" },
    { name: "AlertTriangle", label: "Aviso/Atraso" },
    { name: "Search", label: "Lupa" },
    { name: "Inbox", label: "Caixa de Entrada" },
    { name: "BadgeCheck", label: "Selo Confirmado" },
    { name: "XCircle", label: "Erro/Falta" },
    { name: "RotateCcw", label: "Devolução" },
    { name: "RefreshCw", label: "Reembolso" },
    { name: "HandMetal", label: "Mão / Cancelamento" },
    { name: "HelpCircle", label: "Interrogação" }
  ];

  const AVAILABLE_COLORS = [
    { class: "bg-gray-100 text-gray-800", label: "Cinza" },
    { class: "bg-emerald-100 text-emerald-800", label: "Verde Esmeralda" },
    { class: "bg-blue-100 text-blue-800", label: "Azul" },
    { class: "bg-orange-100 text-orange-800", label: "Laranja" },
    { class: "bg-purple-100 text-purple-800", label: "Roxo" },
    { class: "bg-green-100 text-green-800", label: "Verde" },
    { class: "bg-amber-100 text-amber-800", label: "Amarelo/Âmbar" },
    { class: "bg-red-100 text-red-800", label: "Vermelho" },
    { class: "bg-rose-100 text-rose-800", label: "Rosa" },
    { class: "bg-indigo-100 text-indigo-800", label: "Índigo" }
  ];

  const slugify = (text: string) => {
    return text
      .toString()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim()
      .replace(/\s+/g, '_')
      .replace(/[^\w-]+/g, '')
      .replace(/--+/g, '_');
  };

  const fetchPipelineColumns = async () => {
    try {
      const { data, error } = await supabase
        .from('order_pipeline_columns')
        .select('*')
        .order('display_order', { ascending: true });

      if (error) throw error;
      setPipelineColumns(data || []);
    } catch (error) {
      console.error('Error fetching pipeline columns:', error);
    }
  };

  const fetchTickets = async () => {
    try {
      const { data, error } = await supabase
        .from('order_tickets')
        .select(`
          id,
          ticket_number,
          status,
          tipo,
          reason,
          created_at,
          order_id,
          orders (
            id,
            order_number,
            total_amount,
            profiles (
              first_name,
              last_name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setTickets(data || []);
    } catch (error) {
      console.error('Error fetching tickets:', error);
    }
  };

  const updateTicketStatus = async (ticketId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('order_tickets')
        .update({ status: newStatus })
        .eq('id', ticketId);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Status do ticket atualizado",
      });
      fetchTickets();
    } catch (error) {
      console.error('Error updating ticket status:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar status do ticket",
        variant: "destructive",
      });
    }
  };

  const handleViewTicketOrder = (orderId: string) => {
    const foundOrder = orders.find(o => o.id === orderId);
    if (foundOrder) {
      setSelectedOrder(foundOrder);
    } else {
      const ticket = tickets.find(t => t.order_id === orderId);
      setSelectedOrder({
        id: orderId,
        order_number: ticket?.orders?.order_number || '',
        status: ticket?.orders?.status || '',
        payment_status: '',
        total_amount: ticket?.orders?.total_amount || 0,
        created_at: ticket?.created_at || new Date().toISOString(),
        user_id: '',
        has_shipping_file: false,
        profiles: ticket?.orders?.profiles || { first_name: '', last_name: '' }
      } as any);
    }
  };

  const handleUpdateColumn = async (col: any) => {
    const updatedLabel = editingLabels[col.status_key] ?? col.label;
    const updatedIcon = editingIcons[col.status_key] ?? col.icon_name;
    const updatedColor = editingColors[col.status_key] ?? col.color_class;

    try {
      const { error } = await supabase
        .from('order_pipeline_columns')
        .update({
          label: updatedLabel,
          icon_name: updatedIcon,
          color_class: updatedColor
        })
        .eq('status_key', col.status_key);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Coluna atualizada",
      });
      fetchPipelineColumns();
    } catch (error) {
      console.error('Error updating column:', error);
      toast({
        title: "Erro",
        description: "Erro ao atualizar coluna",
        variant: "destructive"
      });
    }
  };

  const handleDeleteColumn = async (statusKey: string) => {
    if (!confirm("Tem certeza que deseja excluir esta coluna?")) return;

    try {
      const { error } = await supabase
        .from('order_pipeline_columns')
        .delete()
        .eq('status_key', statusKey);

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Coluna excluída com sucesso",
      });
      fetchPipelineColumns();
    } catch (error) {
      console.error('Error deleting column:', error);
      toast({
        title: "Erro",
        description: "Erro ao excluir coluna (pode haver registros utilizando este status)",
        variant: "destructive"
      });
    }
  };

  const handleAddColumn = async () => {
    if (!newColLabel) return;
    const statusKey = newColKey || slugify(newColLabel);

    const activeCols = pipelineColumns.filter(c => c.pipeline_type === activePipelineTab);
    const nextOrder = activeCols.length > 0 ? Math.max(...activeCols.map(c => c.display_order)) + 1 : 1;

    try {
      const { error } = await supabase
        .from('order_pipeline_columns')
        .insert({
          status_key: statusKey,
          label: newColLabel,
          pipeline_type: activePipelineTab,
          display_order: nextOrder,
          icon_name: newColIcon,
          color_class: newColColor
        });

      if (error) throw error;

      toast({
        title: "Sucesso",
        description: "Coluna adicionada com sucesso",
      });
      
      setNewColLabel("");
      setNewColKey("");
      setKeyManuallyEdited(false);
      setNewColIcon("HelpCircle");
      setNewColColor("bg-gray-100 text-gray-800");
      
      fetchPipelineColumns();
    } catch (error) {
      console.error('Error adding column:', error);
      toast({
        title: "Erro",
        description: "Erro ao adicionar coluna (verifique se a chave já existe)",
        variant: "destructive"
      });
    }
  };

  const handleMoveColumn = async (col: any, direction: 'up' | 'down') => {
    const activeCols = pipelineColumns.filter(c => c.pipeline_type === activePipelineTab);
    const currentIndex = activeCols.findIndex(c => c.status_key === col.status_key);
    if (direction === 'up' && currentIndex === 0) return;
    if (direction === 'down' && currentIndex === activeCols.length - 1) return;

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    const targetCol = activeCols[targetIndex];

    try {
      const { error: err1 } = await supabase
        .from('order_pipeline_columns')
        .update({ display_order: targetCol.display_order })
        .eq('status_key', col.status_key);

      const { error: err2 } = await supabase
        .from('order_pipeline_columns')
        .update({ display_order: col.display_order })
        .eq('status_key', targetCol.status_key);

      if (err1 || err2) throw new Error("Database update failed");

      fetchPipelineColumns();
    } catch (error) {
      console.error('Error reordering columns:', error);
      toast({
        title: "Erro",
        description: "Erro ao reordenar colunas",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchOrders();
    fetchPipelineColumns();
    fetchTickets();

    const channels = [
      supabase
        .channel('orders-realtime-admin')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'orders'
          },
          () => {
            fetchOrders();
          }
        )
        .subscribe(),

      supabase
        .channel('tickets-realtime-admin')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_tickets'
          },
          () => {
            fetchTickets();
          }
        )
        .subscribe(),

      supabase
        .channel('pipeline-realtime-admin')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'order_pipeline_columns'
          },
          () => {
            fetchPipelineColumns();
          }
        )
        .subscribe()
    ];

    return () => {
      channels.forEach(ch => supabase.removeChannel(ch));
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
            <div className="space-y-4">
              {/* Process Selectors and Manage Columns */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={activePipelineTab === "primary" ? "default" : "outline"}
                    onClick={() => {
                      setActivePipelineTab("primary");
                      setEditingLabels({});
                      setEditingIcons({});
                      setEditingColors({});
                    }}
                    size="sm"
                    className="rounded-lg h-9"
                  >
                    <Lucide.Package className="w-4 h-4 mr-2" />
                    Processo Primário (Vendas)
                  </Button>
                  <Button
                    variant={activePipelineTab === "secondary" ? "default" : "outline"}
                    onClick={() => {
                      setActivePipelineTab("secondary");
                      setEditingLabels({});
                      setEditingIcons({});
                      setEditingColors({});
                    }}
                    size="sm"
                    className="rounded-lg h-9"
                  >
                    <Lucide.Ticket className="w-4 h-4 mr-2" />
                    Processo Secundário (Tickets)
                  </Button>
                  <Button
                    variant={activePipelineTab === "tertiary" ? "default" : "outline"}
                    onClick={() => {
                      setActivePipelineTab("tertiary");
                      setEditingLabels({});
                      setEditingIcons({});
                      setEditingColors({});
                    }}
                    size="sm"
                    className="rounded-lg h-9"
                  >
                    <Lucide.AlertTriangle className="w-4 h-4 mr-2" />
                    Processo Terciário (Exceções)
                  </Button>
                </div>

                <Dialog open={isColumnsDialogOpen} onOpenChange={setIsColumnsDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="gap-1.5 h-9">
                      <Lucide.Settings2 className="w-4 h-4" />
                      Gerenciar Colunas
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Gerenciar Colunas do Quadro</DialogTitle>
                      <DialogDescription>
                        Personalize as colunas e status aceitos no processo ativo: 
                        <span className="font-semibold text-foreground ml-1">
                          {activePipelineTab === "primary" ? "Vendas" : activePipelineTab === "secondary" ? "Tickets" : "Exceções"}
                        </span>
                      </DialogDescription>
                    </DialogHeader>

                    {/* Columns List & Add Section */}
                    <div className="space-y-6 my-4">
                      <div className="space-y-3">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Colunas Atuais</h5>
                        {pipelineColumns.filter(c => c.pipeline_type === activePipelineTab).length === 0 ? (
                          <p className="text-sm text-muted-foreground py-2 text-center border rounded-lg border-dashed">
                            Nenhuma coluna cadastrada para este processo.
                          </p>
                        ) : (
                          <div className="flex flex-col gap-3">
                            {pipelineColumns
                              .filter(c => c.pipeline_type === activePipelineTab)
                              .map((col, index, arr) => (
                                <div key={col.status_key} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-3 border rounded-lg bg-muted/20">
                                  <div className="flex-1 min-w-0 w-full">
                                    <span className="text-3xs text-muted-foreground font-mono block mb-1">Status/ID: {col.status_key}</span>
                                    <Input
                                      value={editingLabels[col.status_key] ?? col.label}
                                      onChange={(e) => setEditingLabels(prev => ({ ...prev, [col.status_key]: e.target.value }))}
                                      placeholder="Rótulo da coluna"
                                      className="h-8 text-xs"
                                    />
                                  </div>

                                  <div className="w-full sm:w-[130px]">
                                    <span className="text-3xs text-muted-foreground block mb-1">Ícone</span>
                                    <Select
                                      value={editingIcons[col.status_key] ?? col.icon_name ?? "HelpCircle"}
                                      onValueChange={(val) => setEditingIcons(prev => ({ ...prev, [col.status_key]: val }))}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_ICONS.map(ic => (
                                          <SelectItem key={ic.name} value={ic.name} className="text-xs">
                                            {ic.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="w-full sm:w-[140px]">
                                    <span className="text-3xs text-muted-foreground block mb-1">Cor</span>
                                    <Select
                                      value={editingColors[col.status_key] ?? col.color_class ?? "bg-gray-100 text-gray-800"}
                                      onValueChange={(val) => setEditingColors(prev => ({ ...prev, [col.status_key]: val }))}
                                    >
                                      <SelectTrigger className="h-8 text-xs">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {AVAILABLE_COLORS.map(c => (
                                          <SelectItem key={c.class} value={c.class} className="text-xs">
                                            {c.label}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  </div>

                                  <div className="flex gap-1.5 self-end sm:self-center mt-2 sm:mt-0">
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-green-600 hover:text-green-700"
                                      onClick={() => handleUpdateColumn(col)}
                                      title="Salvar alterações"
                                    >
                                      <Lucide.CheckCircle className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      disabled={index === 0}
                                      onClick={() => handleMoveColumn(col, "up")}
                                      title="Mover para cima"
                                    >
                                      <Lucide.ArrowUp className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8"
                                      disabled={index === arr.length - 1}
                                      onClick={() => handleMoveColumn(col, "down")}
                                      title="Mover para baixo"
                                    >
                                      <Lucide.ArrowDown className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      size="icon"
                                      variant="outline"
                                      className="h-8 w-8 text-red-600 hover:text-red-700"
                                      onClick={() => handleDeleteColumn(col.status_key)}
                                      title="Excluir coluna"
                                    >
                                      <Lucide.Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>

                      <div className="border border-dashed p-4 rounded-xl space-y-4">
                        <h5 className="font-bold text-xs uppercase tracking-wider text-muted-foreground">Nova Coluna</h5>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-2xs block mb-1">Nome/Rótulo</Label>
                            <Input
                              value={newColLabel}
                              onChange={(e) => {
                                setNewColLabel(e.target.value);
                                if (!keyManuallyEdited) {
                                  setNewColKey(slugify(e.target.value));
                                }
                              }}
                              placeholder="Ex: Embalagem Final"
                              className="h-8 text-xs"
                            />
                          </div>
                          <div>
                            <Label className="text-2xs block mb-1">Status / Chave (Identificador Único)</Label>
                            <Input
                              value={newColKey}
                              onChange={(e) => {
                                setNewColKey(e.target.value);
                                setKeyManuallyEdited(true);
                              }}
                              placeholder="Ex: embalagem_final"
                              className="h-8 text-xs font-mono"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <Label className="text-2xs block mb-1">Ícone</Label>
                            <Select value={newColIcon} onValueChange={setNewColIcon}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_ICONS.map(ic => (
                                  <SelectItem key={ic.name} value={ic.name} className="text-xs">
                                    {ic.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-2xs block mb-1">Cor</Label>
                            <Select value={newColColor} onValueChange={setNewColColor}>
                              <SelectTrigger className="h-8 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {AVAILABLE_COLORS.map(c => (
                                  <SelectItem key={c.class} value={c.class} className="text-xs">
                                    {c.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <Button 
                          className="w-full h-8 text-xs gap-1.5"
                          onClick={handleAddColumn}
                          disabled={!newColLabel}
                        >
                          <Lucide.Plus className="w-3.5 h-3.5" /> Adicionar Coluna
                        </Button>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>

              {/* Kanban Scroll View */}
              <div className="overflow-x-auto w-full pb-6 scrollbar-thin">
                <div className="flex gap-4 items-start min-w-max pb-2">
                  {(() => {
                    const activeCols = pipelineColumns.filter(c => c.pipeline_type === activePipelineTab);
                    if (activeCols.length === 0) {
                      return (
                        <div className="w-full py-12 text-center text-sm text-muted-foreground border border-dashed rounded-xl">
                          Nenhuma coluna configurada para este processo. Clique em "Gerenciar Colunas" para adicionar.
                        </div>
                      );
                    }

                    return activeCols.map((col) => {
                      const IconComponent = (Lucide as any)[col.icon_name || "HelpCircle"] || Lucide.HelpCircle;
                      const colStatus = col.status_key;

                      let cardCount = 0;
                      let columnOrders: Order[] = [];
                      let columnTickets: any[] = [];

                      if (activePipelineTab === "secondary") {
                        columnTickets = tickets.filter(t => t.status === colStatus);
                        cardCount = columnTickets.length;
                      } else {
                        columnOrders = filteredOrders.filter(order => order.status === colStatus);
                        cardCount = columnOrders.length;
                      }

                      return (
                        <div key={colStatus} className="flex flex-col gap-4 w-[280px] min-w-[280px] flex-shrink-0 bg-muted/20 p-3 rounded-xl border border-border/40 max-h-[80vh]">
                          {/* Column Header */}
                          <div className="flex items-center justify-between border-b pb-2">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className={cn("p-1.5 rounded-lg text-xs", (col.color_class || "bg-gray-100 text-gray-800").split(" ")[0])}>
                                <IconComponent className="w-3.5 h-3.5" />
                              </div>
                              <h4 className="font-bold text-xs truncate max-w-[150px]" title={col.label}>
                                {col.label}
                              </h4>
                            </div>
                            <Badge variant="secondary" className="text-2xs font-semibold px-2 py-0.5 rounded-full">
                              {cardCount}
                            </Badge>
                          </div>

                          {/* Column Cards Container */}
                          <div className="flex flex-col gap-3 overflow-y-auto max-h-[60vh] pr-1 py-1 scrollbar-thin">
                            {cardCount === 0 ? (
                              <div className="text-center py-8 text-xs text-muted-foreground border border-dashed border-border/60 rounded-lg bg-background/20">
                                {activePipelineTab === "secondary" ? "Sem tickets" : "Sem pedidos"}
                              </div>
                            ) : activePipelineTab === "secondary" ? (
                              columnTickets.map((ticket) => {
                                const customerName = ticket.orders?.profiles 
                                  ? `${ticket.orders.profiles.first_name} ${ticket.orders.profiles.last_name}` 
                                  : "Cliente";
                                return (
                                  <div 
                                    key={ticket.id} 
                                    className="p-3 border rounded-lg bg-background/80 hover:bg-background transition-all duration-300 shadow-sm hover:shadow relative group flex flex-col gap-2"
                                  >
                                    {/* Card Header */}
                                    <div className="flex justify-between items-center text-xs">
                                      <span className="font-bold text-primary">{ticket.ticket_number}</span>
                                      <span className="text-muted-foreground text-3xs">
                                        {format(new Date(ticket.created_at), "dd/MM HH:mm", { locale: ptBR })}
                                      </span>
                                    </div>

                                    {/* Ticket Details */}
                                    <div className="text-2xs">
                                      <p className="font-semibold text-foreground truncate">{customerName}</p>
                                      <p className="text-muted-foreground mt-0.5 line-clamp-2 italic" title={ticket.reason}>
                                        "{ticket.reason}"
                                      </p>
                                      <div className="flex justify-between items-center mt-1 pt-1 border-t border-dashed">
                                        <Badge variant="outline" className="text-3xs px-1 py-0 uppercase bg-muted/40 font-semibold">
                                          {ticket.tipo}
                                        </Badge>
                                        {ticket.orders && (
                                          <span className="text-3xs text-muted-foreground font-mono">
                                            Pedido #{ticket.orders.order_number}
                                          </span>
                                        )}
                                      </div>
                                    </div>

                                    {/* Card Footer / Actions */}
                                    <div className="flex items-center justify-between gap-2 mt-1 border-t pt-2">
                                      <Button
                                        variant="outline"
                                        size="sm"
                                        className="h-7 px-2 text-2xs flex-1"
                                        onClick={() => handleViewTicketOrder(ticket.order_id)}
                                        disabled={!ticket.order_id}
                                      >
                                        <Lucide.Eye className="w-3.5 h-3.5 mr-1" />
                                        Ver Pedido
                                      </Button>

                                      <Select
                                        value={ticket.status}
                                        onValueChange={(val) => updateTicketStatus(ticket.id, val)}
                                      >
                                        <SelectTrigger className="h-7 w-[100px] text-3xs px-2 flex-1">
                                          <SelectValue placeholder="Status" />
                                        </SelectTrigger>
                                        <SelectContent>
                                          {activeCols.map((c) => (
                                            <SelectItem key={c.status_key} value={c.status_key} className="text-3xs">
                                              {c.label}
                                            </SelectItem>
                                          ))}
                                        </SelectContent>
                                      </Select>
                                    </div>
                                  </div>
                                );
                              })
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
                                        <Lucide.Eye className="w-3.5 h-3.5 mr-1" />
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
                                          {activeCols.map((c) => (
                                            <SelectItem key={c.status_key} value={c.status_key} className="text-3xs">
                                              {c.label}
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
