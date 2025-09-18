import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DollarSign, TrendingUp, Calendar, Download, Wallet } from "lucide-react";

export default function ResellerCommissions() {
  const commissionHistory = [
    {
      id: 1,
      month: "Janeiro 2024",
      totalSales: "R$ 18.450,00",
      commission: "R$ 1.845,00",
      rate: "10%",
      status: "Pago",
      paidDate: "05/02/2024"
    },
    {
      id: 2,
      month: "Dezembro 2023", 
      totalSales: "R$ 15.680,00",
      commission: "R$ 1.568,00",
      rate: "10%",
      status: "Pago",
      paidDate: "05/01/2024"
    },
    {
      id: 3,
      month: "Novembro 2023",
      totalSales: "R$ 22.100,00", 
      commission: "R$ 2.210,00",
      rate: "10%",
      status: "Pago",
      paidDate: "05/12/2023"
    }
  ];

  const pendingCommissions = [
    {
      id: 1,
      description: "Vendas Fevereiro 2024",
      amount: "R$ 892,50",
      expectedDate: "05/03/2024",
      status: "Processando"
    },
    {
      id: 2,
      description: "Bônus Meta Janeiro",
      amount: "R$ 250,00", 
      expectedDate: "10/03/2024",
      status: "Aprovado"
    }
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Pago':
        return <Badge className="bg-green-100 text-green-800 hover:bg-green-200">Pago</Badge>;
      case 'Processando':
        return <Badge variant="default">Processando</Badge>;
      case 'Aprovado':
        return <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-200">Aprovado</Badge>;
      case 'Pendente':
        return <Badge variant="secondary">Pendente</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Comissões</h1>
          <p className="text-muted-foreground">Acompanhe seus ganhos e histórico de pagamentos</p>
        </div>
        <Button variant="outline">
          <Download className="w-4 h-4 mr-2" />
          Exportar Relatório
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Recebido</CardTitle>
            <DollarSign className="w-4 h-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">R$ 12.847</div>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">A Receber</CardTitle>
            <Wallet className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 1.142,50</div>
            <p className="text-xs text-muted-foreground">Próximo pagamento em 3 dias</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Média Mensal</CardTitle>
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 2.141</div>
            <p className="text-xs text-muted-foreground">Últimos 6 meses</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Atual</CardTitle>
            <Calendar className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">10%</div>
            <p className="text-xs text-muted-foreground">Sobre vendas líquidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Pending Commissions */}
      <Card>
        <CardHeader>
          <CardTitle>Comissões Pendentes</CardTitle>
          <CardDescription>
            Valores a receber nos próximos pagamentos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {pendingCommissions.map((commission) => (
              <div key={commission.id} className="flex items-center justify-between p-3 border rounded-lg">
                <div>
                  <h4 className="font-medium text-sm">{commission.description}</h4>
                  <p className="text-xs text-muted-foreground">
                    Previsão de pagamento: {commission.expectedDate}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <div className="text-right">
                    <div className="font-medium">{commission.amount}</div>
                  </div>
                  {getStatusBadge(commission.status)}
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 p-4 bg-muted/50 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="font-medium">Total a Receber:</span>
              <span className="text-lg font-bold text-green-600">R$ 1.142,50</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Commission History */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de Comissões</CardTitle>
          <CardDescription>
            Pagamentos anteriores e detalhes das vendas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {commissionHistory.map((item) => (
              <div key={item.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h3 className="font-medium">{item.month}</h3>
                    <p className="text-sm text-muted-foreground">
                      Vendas totais: {item.totalSales}
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-3 gap-6 text-sm">
                  <div className="text-center">
                    <p className="text-muted-foreground">Comissão</p>
                    <p className="font-medium text-green-600">{item.commission}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Taxa</p>
                    <p className="font-medium">{item.rate}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-muted-foreground">Pago em</p>
                    <p className="font-medium">{item.paidDate}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  {getStatusBadge(item.status)}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Commission Structure & Info */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Estrutura de Comissões</CardTitle>
            <CardDescription>Como suas comissões são calculadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium text-sm">Vendas até R$ 10.000</p>
                  <p className="text-xs text-muted-foreground">Taxa base</p>
                </div>
                <Badge variant="default">10%</Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium text-sm">Vendas de R$ 10.001 a R$ 25.000</p>
                  <p className="text-xs text-muted-foreground">Taxa progressiva</p>
                </div>
                <Badge variant="secondary">12%</Badge>
              </div>
              
              <div className="flex justify-between items-center p-3 border rounded">
                <div>
                  <p className="font-medium text-sm">Vendas acima de R$ 25.000</p>
                  <p className="text-xs text-muted-foreground">Taxa premium</p>
                </div>
                <Badge className="bg-yellow-100 text-yellow-800">15%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Próximo Pagamento</CardTitle>
            <CardDescription>Detalhes do próximo ciclo</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 bg-primary/5 rounded-lg">
                <h4 className="font-medium mb-2">Março 2024</h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span>Vendas atuais:</span>
                    <span className="font-medium">R$ 8.925,00</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comissão estimada:</span>
                    <span className="font-medium text-green-600">R$ 892,50</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Data do pagamento:</span>
                    <span className="font-medium">05/04/2024</span>
                  </div>
                </div>
              </div>
              
              <Button className="w-full">
                Ver Detalhes do Período
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}