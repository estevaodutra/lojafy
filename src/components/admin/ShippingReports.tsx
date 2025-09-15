import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, Package, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export function ShippingReports() {
  const { data: shippingStats } = useQuery({
    queryKey: ["shipping-stats"],
    queryFn: async () => {
      // Get total orders by shipping method
      const { data: orders, error } = await supabase
        .from("orders")
        .select("shipping_method_name, shipping_amount, created_at")
        .not("shipping_method_name", "is", null);
      
      if (error) throw error;
      return orders;
    },
  });

  const { data: activeMethodsCount } = useQuery({
    queryKey: ["active-methods-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("shipping_methods")
        .select("*", { count: 'exact', head: true })
        .eq("active", true);
      
      if (error) throw error;
      return count;
    },
  });

  const { data: shippingFiles } = useQuery({
    queryKey: ["shipping-files-count"],
    queryFn: async () => {
      const { count, error } = await supabase
        .from("order_shipping_files")
        .select("*", { count: 'exact', head: true });
      
      if (error) throw error;
      return count;
    },
  });

  // Calculate statistics
  const stats = shippingStats ? {
    totalOrders: shippingStats.length,
    totalRevenue: shippingStats.reduce((sum, order) => sum + Number(order.shipping_amount || 0), 0),
    averageShippingCost: shippingStats.length > 0 
      ? shippingStats.reduce((sum, order) => sum + Number(order.shipping_amount || 0), 0) / shippingStats.length 
      : 0,
    methodUsage: shippingStats.reduce((acc, order) => {
      const method = order.shipping_method_name || 'Não especificado';
      acc[method] = (acc[method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>)
  } : null;

  const exportData = () => {
    if (!shippingStats) return;

    const csvContent = [
      ['Data', 'Método de Frete', 'Valor do Frete'],
      ...shippingStats.map(order => [
        new Date(order.created_at).toLocaleDateString('pt-BR'),
        order.shipping_method_name || 'Não especificado',
        `R$ ${Number(order.shipping_amount || 0).toFixed(2)}`
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'relatorio-frete.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Métodos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeMethodsCount || 0}</div>
            <p className="text-xs text-muted-foreground">
              Métodos de frete configurados
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Pedidos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              Pedidos com frete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita em Frete</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {stats?.totalRevenue.toFixed(2) || "0,00"}
            </div>
            <p className="text-xs text-muted-foreground">
              Total arrecadado em frete
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Arquivos Anexados</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{shippingFiles || 0}</div>
            <p className="text-xs text-muted-foreground">
              Etiquetas enviadas por clientes
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Usage by Method */}
      {stats?.methodUsage && Object.keys(stats.methodUsage).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Uso por Método de Frete</CardTitle>
            <CardDescription>
              Distribuição dos pedidos por método de frete selecionado
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(stats.methodUsage)
              .sort(([,a], [,b]) => b - a)
              .map(([method, count]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{method}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{count} pedidos</Badge>
                    <span className="text-sm text-muted-foreground">
                      {((count / stats.totalOrders) * 100).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
          </CardContent>
        </Card>
      )}

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Exportar Dados</CardTitle>
          <CardDescription>
            Baixe relatórios detalhados sobre o uso de métodos de frete
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Button variant="outline" onClick={exportData} disabled={!shippingStats?.length}>
              <Download className="w-4 h-4 mr-2" />
              Exportar CSV
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Average Shipping Cost */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Custo Médio de Frete</CardTitle>
            <CardDescription>
              Análise dos valores de frete praticados
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-primary">
              R$ {stats.averageShippingCost.toFixed(2)}
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Custo médio por pedido
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}