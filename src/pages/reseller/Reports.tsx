import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useResellerReports } from "@/hooks/useResellerReports";
import { BarChart3, TrendingUp, ShoppingCart, DollarSign, Calendar } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { subDays, startOfDay, endOfDay } from "date-fns";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function ResellerReports() {
  const [period, setPeriod] = useState("7");
  
  const getDateRange = () => {
    const days = parseInt(period);
    return {
      from: startOfDay(subDays(new Date(), days)),
      to: endOfDay(new Date()),
    };
  };

  const { data: reports, isLoading } = useResellerReports(getDateRange());

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(value);
  };

  const statusData = reports?.statusDistribution
    ? Object.entries(reports.statusDistribution).map(([name, value]) => ({
        name: name === "confirmed" ? "Confirmado" : 
              name === "processing" ? "Processando" : 
              name === "shipped" ? "Enviado" : 
              name === "delivered" ? "Entregue" : "Cancelado",
        value,
      }))
    : [];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Relatórios e Estatísticas</h1>
          <p className="text-muted-foreground mt-2">Análise detalhada de vendas e desempenho</p>
        </div>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-[180px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="15">Últimos 15 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="60">Últimos 60 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map(i => (
              <Card key={i}>
                <CardHeader className="pb-3">
                  <Skeleton className="h-20 w-full" />
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      ) : reports ? (
        <>
          {/* Métricas Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total de Vendas
                </CardDescription>
                <CardTitle className="text-3xl text-green-600">
                  {formatCurrency(reports.totalSales)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Total de Pedidos
                </CardDescription>
                <CardTitle className="text-3xl text-blue-600">{reports.totalOrders}</CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4" />
                  Ticket Médio
                </CardDescription>
                <CardTitle className="text-3xl text-purple-600">
                  {formatCurrency(reports.avgTicket)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardDescription className="flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Produtos Vendidos
                </CardDescription>
                <CardTitle className="text-3xl text-orange-600">
                  {reports.topProducts.reduce((sum, p) => sum + p.quantity, 0)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {/* Gráfico de Vendas por Dia */}
          <Card>
            <CardHeader>
              <CardTitle>Vendas por Dia</CardTitle>
              <CardDescription>Evolução das vendas no período selecionado</CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={reports.salesByDay}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => formatCurrency(value)}
                    labelStyle={{ color: "#000" }}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="total"
                    stroke="#8884d8"
                    strokeWidth={2}
                    name="Total de Vendas"
                  />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Top 10 Produtos */}
            <Card>
              <CardHeader>
                <CardTitle>Top 10 Produtos Mais Vendidos</CardTitle>
                <CardDescription>Produtos com maior faturamento</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={reports.topProducts.slice(0, 10)} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={150} />
                    <Tooltip
                      formatter={(value: any) => formatCurrency(value)}
                      labelStyle={{ color: "#000" }}
                    />
                    <Bar dataKey="revenue" fill="#82ca9d" name="Faturamento" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Distribuição de Status */}
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Status</CardTitle>
                <CardDescription>Status dos pedidos no período</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry) => `${entry.name}: ${entry.value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Lista Top Produtos */}
          <Card>
            <CardHeader>
              <CardTitle>Detalhamento de Produtos</CardTitle>
              <CardDescription>Ranking completo de produtos vendidos</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {reports.topProducts.map((product, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary text-primary-foreground font-bold">
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-muted-foreground">{product.quantity} unidades vendidas</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-green-600">{formatCurrency(product.revenue)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-12 text-center">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Sem dados para o período</h3>
            <p className="text-muted-foreground">Ainda não há vendas registradas neste período</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}