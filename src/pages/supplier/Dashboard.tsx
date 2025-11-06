import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Package, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { useSupplierProductStats } from '@/hooks/useSupplierProducts';
import { useSupplierOrderStats } from '@/hooks/useSupplierOrders';

const SupplierDashboard = () => {
  const { data: productStats } = useSupplierProductStats();
  const { data: orderStats } = useSupplierOrderStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard do Fornecedor</h1>
        <p className="text-muted-foreground">
          Visão geral dos seus produtos e vendas
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productStats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              de {productStats?.total || 0} produtos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos do Mês</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{orderStats?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {orderStats?.totalItems || 0} itens vendidos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Receita do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">R$ {(orderStats?.totalRevenue || 0).toFixed(2)}</div>
            <p className="text-xs text-muted-foreground">
              vendas confirmadas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{productStats?.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">
              Produtos precisam de reposição
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Visão Geral</CardTitle>
            <CardDescription>Resumo da sua operação</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total de Produtos</span>
                <span className="text-sm font-medium">{productStats?.total || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Produtos Ativos</span>
                <span className="text-sm font-medium text-green-600">{productStats?.active || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Estoque Baixo</span>
                <span className="text-sm font-medium text-yellow-600">{productStats?.lowStock || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Sem Estoque</span>
                <span className="text-sm font-medium text-red-600">{productStats?.outOfStock || 0}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vendas do Mês</CardTitle>
            <CardDescription>Performance das suas vendas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pedidos com seus produtos</span>
                <span className="text-sm font-medium">{orderStats?.totalOrders || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Itens vendidos</span>
                <span className="text-sm font-medium">{orderStats?.totalItems || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Receita total</span>
                <span className="text-sm font-medium text-green-600">R$ {(orderStats?.totalRevenue || 0).toFixed(2)}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default SupplierDashboard;