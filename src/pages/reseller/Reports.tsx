import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, Download, Calendar, DollarSign, ShoppingCart } from 'lucide-react';

const ResellerReports = () => {
  const reportTypes = [
    {
      title: "Relatório de Vendas",
      description: "Análise detalhada das suas vendas por período",
      icon: ShoppingCart,
      data: "34 vendas este mês",
      trend: "+15%"
    },
    {
      title: "Relatório de Comissões",
      description: "Histórico de comissões recebidas e pendentes",
      icon: DollarSign,
      data: "R$ 1.845 em comissões",
      trend: "+20%"
    },
    {
      title: "Performance Mensal",
      description: "Análise de performance e metas atingidas",
      icon: TrendingUp,
      data: "74% da meta",
      trend: "+5%"
    },
    {
      title: "Análise de Clientes",
      description: "Dados sobre seus clientes e comportamento de compra",
      icon: BarChart3,
      data: "67 clientes ativos",
      trend: "+8%"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Análises detalhadas da sua performance de vendas
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas Totais</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 47.530</div>
            <p className="text-xs text-muted-foreground">
              +15% nos últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ 4.753</div>
            <p className="text-xs text-muted-foreground">
              10% de comissão média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">89</div>
            <p className="text-xs text-muted-foreground">
              +12 este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3.2%</div>
            <p className="text-xs text-muted-foreground">
              +0.8% vs mês anterior
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {reportTypes.map((report, index) => (
          <Card key={index} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-center space-x-2">
                <report.icon className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">{report.title}</CardTitle>
              </div>
              <CardDescription>{report.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-2xl font-bold">{report.data}</p>
                  <p className="text-sm text-green-600">{report.trend} vs anterior</p>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button variant="outline" className="flex-1">
                  <Calendar className="h-4 w-4 mr-2" />
                  Visualizar
                </Button>
                <Button variant="outline" className="flex-1">
                  <Download className="h-4 w-4 mr-2" />
                  Exportar
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detailed Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas por Período</CardTitle>
            <CardDescription>Últimos 6 meses</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun'].map((month, index) => (
                <div key={month} className="flex items-center justify-between">
                  <span className="text-sm font-medium">{month}</span>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-primary h-2 rounded-full" 
                        style={{ width: `${Math.min((index + 1) * 15, 100)}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-muted-foreground">
                      R$ {((index + 1) * 3500).toLocaleString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top Produtos Vendidos</CardTitle>
            <CardDescription>Produtos com melhor performance</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { name: 'Smartphone Pro Max', sales: 45, commission: 'R$ 675' },
                { name: 'Notebook Gaming Ultra', sales: 23, commission: 'R$ 920' },
                { name: 'Headphone Wireless', sales: 34, commission: 'R$ 340' },
                { name: 'Smartwatch Fitness', sales: 18, commission: 'R$ 234' }
              ].map((product, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-sm text-muted-foreground">{product.sales} vendas</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-green-600">{product.commission}</p>
                    <p className="text-sm text-muted-foreground">comissão</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Export Options */}
      <Card>
        <CardHeader>
          <CardTitle>Exportar Relatórios</CardTitle>
          <CardDescription>
            Baixe seus dados em diferentes formatos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button variant="outline" className="h-20 flex-col">
              <Download className="h-6 w-6 mb-2" />
              <span>Excel (.xlsx)</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Download className="h-6 w-6 mb-2" />
              <span>PDF</span>
            </Button>
            <Button variant="outline" className="h-20 flex-col">
              <Download className="h-6 w-6 mb-2" />
              <span>CSV</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerReports;