import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, ShoppingCart, Eye, ExternalLink } from "lucide-react";

export default function ResellerSales() {
  const recentSales = [
    {
      id: 1,
      product: "Smartphone XYZ Pro",
      customer: "Ana Costa",
      saleValue: "R$ 1.299,00",
      commission: "R$ 129,90",
      commissionRate: "10%",
      date: "15/01/2024",
      status: "Pago"
    },
    {
      id: 2,
      product: "Notebook ABC Gaming",
      customer: "Pedro Alves",
      saleValue: "R$ 2.899,00",
      commission: "R$ 289,90",
      commissionRate: "10%",
      date: "14/01/2024",
      status: "Pendente"
    },
    {
      id: 3,
      product: "Headphones DEF Wireless",
      customer: "Carla Lima",
      saleValue: "R$ 399,00",
      commission: "R$ 39,90",
      commissionRate: "10%",
      date: "13/01/2024",
      status: "Pago"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pago</Badge>;
      case 'Pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'Processando':
        return <Badge variant="default">Processando</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-foreground">Minhas Vendas</h1>
        <p className="text-muted-foreground">Acompanhe suas vendas e comissões</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 18.450</div>
            <p className="text-xs text-muted-foreground">+15% vs mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 1.845</div>
            <p className="text-xs text-muted-foreground">10% das vendas</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">34</div>
            <p className="text-xs text-muted-foreground">+3 hoje</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ticket Médio</CardTitle>
            <DollarSign className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 543</div>
            <p className="text-xs text-muted-foreground">+R$ 45 vs média</p>
          </CardContent>
        </Card>
      </div>

      {/* Sales Table */}
      <Card>
        <CardHeader>
          <CardTitle>Vendas Recentes</CardTitle>
          <CardDescription>
            Suas vendas mais recentes e status das comissões
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
                
                <div className="grid grid-cols-4 gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Valor Venda</p>
                    <p className="font-medium">{sale.saleValue}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Comissão</p>
                    <p className="font-medium text-green-600">{sale.commission}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Taxa</p>
                    <p className="font-medium">{sale.commissionRate}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Data</p>
                    <p className="font-medium">{sale.date}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  {getStatusBadge(sale.status)}
                  <Button variant="outline" size="sm">
                    <Eye className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Performance & Tools */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Performance do Mês</CardTitle>
            <CardDescription>Seu desempenho em vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-sm">Meta de Vendas</span>
                <span className="text-sm font-medium">74%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-2">
                <div className="bg-primary h-2 rounded-full" style={{ width: '74%' }} />
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>R$ 18.450 / R$ 25.000</span>
                <span>Faltam R$ 6.550</span>
              </div>
              
              <div className="pt-4 border-t">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Conversão</p>
                    <p className="font-medium">2.8%</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Clientes Novos</p>
                    <p className="font-medium">12</p>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Ferramentas de Venda</CardTitle>
            <CardDescription>Links e recursos para suas vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <Button variant="outline" className="w-full justify-between">
                Catálogo de Produtos
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Link de Afiliado
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Material de Divulgação
                <ExternalLink className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="w-full justify-between">
                Calculadora de Comissão
                <ExternalLink className="w-4 h-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}