import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DollarSign, Package, ShoppingCart, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { SalesSection } from '@/components/admin/SalesSection';
import { StoreVisitsSection } from '@/components/admin/StoreVisitsSection';
import { OrdersManagementSection } from '@/components/admin/OrdersManagementSection';
import { SupportAlertsWidget } from '@/components/admin/SupportAlertsWidget';

interface DashboardStats {
  monthlyRevenue: number;
  monthlyOrders: number;
  totalProducts: number;
  totalCustomers: number;
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats>({
    monthlyRevenue: 0,
    monthlyOrders: 0,
    totalProducts: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        const currentMonth = new Date();
        const firstDayOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1);
        
        // Fetch monthly statistics
        const [monthlyOrdersQuery, productsCount, customersWithOrdersQuery, monthlyRevenueQuery] = await Promise.all([
          // Monthly orders count
          supabase
            .from('orders')
            .select('id', { count: 'exact', head: true })
            .gte('created_at', firstDayOfMonth.toISOString()),
          
          // Total active products
          supabase
            .from('products')
            .select('id', { count: 'exact', head: true })
            .eq('active', true),
          
          // Customers with orders (more relevant metric)
          supabase
            .from('orders')
            .select('user_id')
            .gte('created_at', firstDayOfMonth.toISOString()),
          
          // Monthly revenue from paid orders
          supabase
            .from('orders')
            .select('total_amount')
            .eq('payment_status', 'paid')
            .gte('created_at', firstDayOfMonth.toISOString())
        ]);

        const monthlyRevenue = monthlyRevenueQuery.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;
        const uniqueCustomers = new Set(customersWithOrdersQuery.data?.map(order => order.user_id)).size;

        setStats({
          monthlyRevenue,
          monthlyOrders: monthlyOrdersQuery.count || 0,
          totalProducts: productsCount.count || 0,
          totalCustomers: uniqueCustomers
        });
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);


  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground mt-2">
          Visão geral das vendas, produtos e pedidos
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Faturamento do Mês</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : `R$ ${stats.monthlyRevenue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Vendas pagas este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pedidos</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.monthlyOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Pedidos este mês
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalProducts}
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Clientes</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {loading ? '...' : stats.totalCustomers}
            </div>
            <p className="text-xs text-muted-foreground">
              Clientes com pedidos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* New Sections */}
      <div className="space-y-6">
        {/* Support Alerts Widget */}
        <SupportAlertsWidget />
        
        {/* Sales Section */}
        <SalesSection />
        
        {/* Store Visits Section */}
        <StoreVisitsSection />
        
        {/* Orders Management Section */}
        <OrdersManagementSection />
      </div>
    </div>
  );
};

export default Dashboard;