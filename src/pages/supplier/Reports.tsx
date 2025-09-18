import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BarChart3, Download, TrendingUp, Calendar, Filter } from "lucide-react";

export default function SupplierReports() {
  const salesData = [
    { month: 'Jan', sales: 12500, orders: 45 },
    { month: 'Fev', sales: 18900, orders: 67 },
    { month: 'Mar', sales: 15600, orders: 56 },
    { month: 'Abr', sales: 22100, orders: 78 },
    { month: 'Mai', sales: 28400, orders: 89 }
  ];

  const topProducts = [
    {
      name: "Smartphone XYZ Pro",
      revenue: "R$ 18.450,00",
      orders: 34,
      growth: "+15%"
    },
    {
      name: "Notebook ABC Gaming",
      revenue: "R$ 15.680,00",
      orders: 28,
      growth: "+8%"
    },
    {
      name: "Headphones DEF Wireless",
      revenue: "R$ 8.970,00",
      orders: 21,
      growth: "+22%"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Relatórios</h1>
          <p className="text-muted-foreground">Análise detalhada do seu desempenho</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filtros
          </Button>
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita Total</CardTitle>
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 97.500</div>
            <p className="text-xs text-muted-foreground">Últimos 5 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos Totais</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">335</div>
            <p className="text-xs text-muted-foreground">Últimos 5 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 291</div>
            <p className="text-xs text-muted-foreground">+5% vs período anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Crescimento</CardTitle>
            <TrendingUp className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">+14.2%</div>
            <p className="text-xs text-muted-foreground">Crescimento mensal médio</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Mês</CardTitle>
            <CardDescription>Evolução das vendas nos últimos 5 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {salesData.map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 text-sm font-medium">{item.month}</div>
                    <div className="flex-1">
                      <div className="w-full bg-muted rounded-full h-2">
                        <div
                          className="bg-primary h-2 rounded-full"
                          style={{ width: `${(item.sales / 30000) * 100}%` }}
                        />
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-medium">R$ {(item.sales / 1000).toFixed(1)}k</div>
                    <div className="text-xs text-muted-foreground">{item.orders} pedidos</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
            <CardDescription>Produtos com melhor desempenho</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium text-sm">{product.name}</h4>
                    <p className="text-xs text-muted-foreground">{product.orders} pedidos</p>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-sm">{product.revenue}</div>
                    <Badge variant="default" className="text-xs">
                      {product.growth}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Card>
        <CardHeader>
          <CardTitle>Análise Detalhada</CardTitle>
          <CardDescription>Métricas avançadas de performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <h4 className="font-medium">Conversão</h4>
              <div className="text-2xl font-bold">3.2%</div>
              <p className="text-xs text-muted-foreground">Taxa de conversão média</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Tempo Médio</h4>
              <div className="text-2xl font-bold">2.3 dias</div>
              <p className="text-xs text-muted-foreground">Para processar pedidos</p>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Satisfação</h4>
              <div className="text-2xl font-bold">4.7/5.0</div>
              <p className="text-xs text-muted-foreground">Avaliação média dos clientes</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Relatórios</CardTitle>
          <CardDescription>Baixe seus dados para análise externa</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Vendas (CSV)
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Produtos (PDF)
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Estoque (Excel)
            </Button>
            <Button variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Relatório Completo (PDF)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}