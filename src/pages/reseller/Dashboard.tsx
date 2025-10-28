import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, DollarSign, Users, TrendingUp } from 'lucide-react';
import { SetupChecklist } from '@/components/reseller/SetupChecklist';
import { useResellerSales } from '@/hooks/useResellerSales';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { Skeleton } from '@/components/ui/skeleton';

const ResellerDashboard = () => {
  const { data: salesData, isLoading } = useResellerSales();
  const { data: setupData } = useSetupProgress();

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard do Revendedor</h1>
        <p className="text-muted-foreground">
          Acompanhe suas vendas e comissões
        </p>
      </div>

      {setupData && setupData.progress < 100 && <SetupChecklist />}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{salesData?.sales_this_month || 0}</div>
                <p className="text-xs text-muted-foreground">
                  {calcChange(salesData?.sales_this_month || 0, salesData?.sales_last_month || 0) > 0 ? '+' : ''}
                  {calcChange(salesData?.sales_this_month || 0, salesData?.sales_last_month || 0)}% vs mês anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Comissões</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-24" /> : (
              <>
                <div className="text-2xl font-bold">
                  {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(salesData?.commissions_this_month || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {calcChange(salesData?.commissions_this_month || 0, salesData?.commissions_last_month || 0) > 0 ? '+' : ''}
                  {calcChange(salesData?.commissions_this_month || 0, salesData?.commissions_last_month || 0)}% vs mês anterior
                </p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-12" /> : (
              <>
                <div className="text-2xl font-bold">{salesData?.total_customers || 0}</div>
                <p className="text-xs text-muted-foreground">Total atendidos</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : (
              <>
                <div className="text-2xl font-bold">{salesData?.conversion_rate?.toFixed(1) || 0}%</div>
                <p className="text-xs text-muted-foreground">Visitantes convertidos</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Vendas Recentes</CardTitle>
            <CardDescription>Últimas 5 vendas realizadas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((item) => (
                <div key={item} className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">Pedido #{1000 + item}</p>
                    <p className="text-xs text-muted-foreground">Cliente {item}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">R$ {(150 + item * 50).toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">
                      Comissão: R$ {((150 + item * 50) * 0.1).toFixed(2)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Metas do Mês</CardTitle>
            <CardDescription>Progresso das suas metas</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Vendas</span>
                  <span className="text-sm text-muted-foreground">89/120</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '74%' }}></div>
                </div>
              </div>
              
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Comissões</span>
                  <span className="text-sm text-muted-foreground">R$ 2.450/R$ 3.000</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '82%' }}></div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Novos Clientes</span>
                  <span className="text-sm text-muted-foreground">5/10</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '50%' }}></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ResellerDashboard;