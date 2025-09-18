import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { DollarSign, TrendingUp, ShoppingCart, Users } from "lucide-react";

export default function SupplierSales() {
  const recentSales = [
    {
      id: 1,
      product: "Smartphone XYZ Pro",
      customer: "João Silva",
      quantity: 2,
      value: "R$ 2.598,00",
      commission: "R$ 259,80",
      date: "15/01/2024",
      status: "Confirmado"
    },
    {
      id: 2,
      product: "Notebook ABC Gaming",
      customer: "Maria Santos",
      quantity: 1,
      value: "R$ 2.899,00",
      commission: "R$ 289,90",
      date: "14/01/2024",
      status: "Enviado"
    },
    {
      id: 3,
      product: "Headphones DEF Wireless",
      customer: "Carlos Oliveira",
      quantity: 3,
      value: "R$ 1.197,00",
      commission: "R$ 119,70",
      date: "13/01/2024",
      status: "Entregue"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Confirmado':
        return <Badge variant="default">Confirmado</Badge>;
      case 'Enviado':
        return <Badge variant="secondary">Enviado</Badge>;
      case 'Entregue':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Entregue</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Vendas</h1>
        <p className="text-muted-foreground">Acompanhe o desempenho das suas vendas</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 45.890</div>
            <p className="text-xs text-muted-foreground">+12% em relação ao mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 4.589</div>
            <p className="text-xs text-muted-foreground">10% das vendas brutas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">+8 novos pedidos hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes Únicos</CardTitle>
            <Users className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">67</div>
            <p className="text-xs text-muted-foreground">15 clientes recorrentes</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
          <CardDescription>
            Últimas vendas dos seus produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentSales.map((sale) => (
              <div key={sale.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-muted rounded-lg flex items-center justify-center">
                    <ShoppingCart className="w-6 h-6 text-muted-foreground" />
                  </div>
                  <div>
                    <h3 className="font-medium">{sale.product}</h3>
                    <p className="text-sm text-muted-foreground">Cliente: {sale.customer}</p>
                  </div>
                </div>
                
                <div className="grid grid-cols-4 gap-8 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Quantidade</p>
                    <p className="font-medium">{sale.quantity}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Valor Total</p>
                    <p className="font-medium">{sale.value}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Comissão</p>
                    <p className="font-medium text-green-600">{sale.commission}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{sale.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(sale.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Top Produtos</CardTitle>
            <CardDescription>Produtos mais vendidos este mês</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-sm">Smartphone XYZ Pro</span>
                <span className="text-sm font-medium">34 vendas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Notebook ABC Gaming</span>
                <span className="text-sm font-medium">28 vendas</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm">Headphones DEF Wireless</span>
                <span className="text-sm font-medium">21 vendas</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Meta Mensal</CardTitle>
            <CardDescription>Progresso da meta de vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm">Progresso</span>
                <span className="text-sm font-medium">76%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '76%' }} />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>R$ 45.890 / R$ 60.000</span>
                <span>Faltam R$ 14.110</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}