import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ShoppingCart, DollarSign, Users, TrendingUp, Crown, ExternalLink } from 'lucide-react';
import { SetupChecklist } from '@/components/reseller/SetupChecklist';
import { useResellerSales } from '@/hooks/useResellerSales';
import { useSetupProgress } from '@/hooks/useSetupProgress';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';
import { OnboardingWizard } from '@/components/reseller/OnboardingWizard';

import { useAuth } from '@/contexts/AuthContext';

const ResellerDashboard = () => {
  const { data: salesData, isLoading } = useResellerSales();
  const { data: setupData } = useSetupProgress();
  const { isFree, paymentUrl } = useSubscriptionCheck();
  const { user } = useAuth();

  const calcChange = (curr: number, prev: number) => {
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 100);
  };

  const storeUrl = `${window.location.origin}/loja/${user?.id}`;

  return (
    <div className="space-y-6">
      <OnboardingWizard />
      
      {/* Header with Action Button */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Dashboard do Revendedor</h1>
          <p className="text-muted-foreground">
            Acompanhe suas vendas e comissões
          </p>
        </div>
        <Button 
          variant="default" 
          onClick={() => window.open(storeUrl, '_blank')}
          className="shrink-0"
        >
          <ExternalLink className="mr-2 h-4 w-4" />
          Ver Minha Loja
        </Button>
      </div>

      {isFree && (
        <Alert className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <Crown className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            Upgrade para Premium!
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 dark:text-yellow-200">
              Desbloqueie loja pública, importação de produtos e vendas ilimitadas.
            </span>
            <Button 
              size="sm"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white ml-4"
              onClick={() => window.open(paymentUrl, '_blank')}
            >
              <Crown className="mr-2 h-4 w-4" />
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {setupData && setupData.progress < 100 && <SetupChecklist />}

      {/* Financial Summary Section - Grouped */}
      <div className="border rounded-lg p-6 bg-card/50">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <DollarSign className="h-5 w-5 text-primary" />
          Resumo do Mês
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Vendas do Mês</CardTitle>
              <ShoppingCart className="h-5 w-5 text-blue-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-16" /> : (
                <>
                  <div className="text-2xl font-bold">{salesData?.sales_this_month || 0}</div>
                  <p className={`text-xs font-medium ${
                    calcChange(salesData?.sales_this_month || 0, salesData?.sales_last_month || 0) > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {calcChange(salesData?.sales_this_month || 0, salesData?.sales_last_month || 0) > 0 ? '+' : ''}
                    {calcChange(salesData?.sales_this_month || 0, salesData?.sales_last_month || 0)}% vs mês anterior
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Comissões</CardTitle>
              <DollarSign className="h-5 w-5 text-green-500" />
            </CardHeader>
            <CardContent>
              {isLoading ? <Skeleton className="h-8 w-24" /> : (
                <>
                  <div className="text-2xl font-bold">
                    {new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(salesData?.commissions_this_month || 0)}
                  </div>
                  <p className={`text-xs font-medium ${
                    calcChange(salesData?.commissions_this_month || 0, salesData?.commissions_last_month || 0) > 0 
                      ? 'text-green-600' 
                      : 'text-red-600'
                  }`}>
                    {calcChange(salesData?.commissions_this_month || 0, salesData?.commissions_last_month || 0) > 0 ? '+' : ''}
                    {calcChange(salesData?.commissions_this_month || 0, salesData?.commissions_last_month || 0)}% vs mês anterior
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Clientes</CardTitle>
              <Users className="h-5 w-5 text-purple-500" />
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

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taxa Conversão</CardTitle>
              <TrendingUp className="h-5 w-5 text-orange-500" />
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
      </div>

    </div>
  );
};

export default ResellerDashboard;