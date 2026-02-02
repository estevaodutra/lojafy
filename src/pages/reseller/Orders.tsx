import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useResellerOrders } from "@/hooks/useResellerOrders";
import { Search, Package, Clock, Truck, CheckCircle, XCircle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const statusConfig = {
  pending: { label: "Pendente", icon: Clock, color: "bg-yellow-100 text-yellow-800" },
  processing: { label: "Em preparação", icon: Package, color: "bg-blue-100 text-blue-800" },
  shipped: { label: "Despachado", icon: Truck, color: "bg-purple-100 text-purple-800" },
  delivered: { label: "Finalizado", icon: CheckCircle, color: "bg-green-100 text-green-800" },
  cancelled: { label: "Cancelado", icon: XCircle, color: "bg-red-100 text-red-800" },
  refunded: { label: "Reembolsado", icon: CheckCircle, color: "bg-gray-100 text-gray-800" },
};

function ResellerOrders() {
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const { data: orders, isLoading } = useResellerOrders(statusFilter, searchTerm);

  const getStatusCounts = () => {
    if (!orders) return { all: 0, pending: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
    
    return {
      all: orders.length,
      pending: orders.filter(o => o.status === "pending").length,
      processing: orders.filter(o => o.status === "processing").length,
      shipped: orders.filter(o => o.status === "shipped").length,
      delivered: orders.filter(o => o.status === "delivered").length,
      cancelled: orders.filter(o => o.status === "cancelled").length,
    };
  };

  const counts = getStatusCounts();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Gestão de Pedidos</h1>
        <p className="text-muted-foreground mt-2">
          Acompanhe todos os pedidos da sua loja
        </p>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total de Pedidos</CardDescription>
            <CardTitle className="text-3xl">{counts.all}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Pendentes</CardDescription>
            <CardTitle className="text-3xl text-yellow-600">{counts.pending}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Em Processamento</CardDescription>
            <CardTitle className="text-3xl text-blue-600">{counts.processing}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Enviados</CardDescription>
            <CardTitle className="text-3xl text-purple-600">{counts.shipped}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número do pedido..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Tabs de Status */}
      <Tabs value={statusFilter} onValueChange={setStatusFilter}>
        <TabsList>
          <TabsTrigger value="all">Todos ({counts.all})</TabsTrigger>
          <TabsTrigger value="pending">Pendentes ({counts.pending})</TabsTrigger>
          <TabsTrigger value="processing">Em preparação ({counts.processing})</TabsTrigger>
          <TabsTrigger value="shipped">Despachados ({counts.shipped})</TabsTrigger>
          <TabsTrigger value="delivered">Finalizados ({counts.delivered})</TabsTrigger>
          <TabsTrigger value="cancelled">Cancelados ({counts.cancelled})</TabsTrigger>
        </TabsList>

        <TabsContent value={statusFilter} className="mt-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : orders && orders.length > 0 ? (
            <div className="space-y-4">
              {orders.map((order) => {
                const statusInfo = statusConfig[order.status as keyof typeof statusConfig];
                const StatusIcon = statusInfo?.icon || Package;

                return (
                  <Card key={order.id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h3 className="font-semibold text-lg">#{order.order_number}</h3>
                            <Badge className={statusInfo?.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusInfo?.label}
                            </Badge>
                            {order.payment_status === "approved" && (
                              <Badge variant="outline" className="bg-green-50 text-green-700">
                                Pago
                              </Badge>
                            )}
                          </div>
                          <div className="space-y-1 text-sm text-muted-foreground">
                            <p>
                              <strong>Cliente:</strong>{" "}
                              {order.profiles
                                ? `${order.profiles.first_name} ${order.profiles.last_name}`
                                : "Cliente"}
                            </p>
                            <p>
                              <strong>Data:</strong>{" "}
                              {format(new Date(order.created_at), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", {
                                locale: ptBR,
                              })}
                            </p>
                            {order.shipping_address && (
                              <p>
                                <strong>Endereço:</strong>{" "}
                                {order.shipping_address.city}, {order.shipping_address.state}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-primary">
                            R$ {Number(order.total_amount).toFixed(2)}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">Nenhum pedido encontrado</h3>
                <p className="text-muted-foreground">
                  {searchTerm
                    ? "Tente buscar com outros termos"
                    : "Os pedidos da sua loja aparecerão aqui"}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default ResellerOrders;