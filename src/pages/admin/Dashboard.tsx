import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Package, ShoppingCart, Users, DollarSign, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface AdminOrder {
  id: string;
  order_number: string;
  total_amount: number;
  status: string;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
  };
}

interface LowStockProduct {
  id: string;
  name: string;
  stock_quantity: number;
  min_stock_level: number;
}

interface DashboardStats {
  totalRevenue: number;
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
}

const Dashboard = () => {
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProduct[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    totalRevenue: 0,
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      try {
        // Fetch recent orders with user info
        const { data: ordersData, error: ordersError } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            total_amount,
            status,
            created_at,
            user_id
          `)
          .order('created_at', { ascending: false })
          .limit(5);

        // Fetch user profiles for orders
        let ordersWithProfiles: AdminOrder[] = [];
        if (ordersData) {
          const userIds = [...new Set(ordersData.map(order => order.user_id))];
          const { data: profilesData } = await supabase
            .from('profiles')
            .select('user_id, first_name, last_name')
            .in('user_id', userIds);

          ordersWithProfiles = ordersData.map(order => ({
            ...order,
            profiles: profilesData?.find(p => p.user_id === order.user_id) || {
              first_name: 'Cliente',
              last_name: ''
            }
          }));
        }

        if (ordersError) throw ordersError;

        // Fetch low stock products
        const { data: lowStockData, error: lowStockError } = await supabase
          .from('products')
          .select('id, name, stock_quantity, min_stock_level')
          .lt('stock_quantity', 'min_stock_level')
          .eq('active', true)
          .limit(5);

        if (lowStockError) throw lowStockError;

        // Fetch dashboard statistics
        const [ordersCount, productsCount, customersCount, revenue] = await Promise.all([
          supabase.from('orders').select('id', { count: 'exact', head: true }),
          supabase.from('products').select('id', { count: 'exact', head: true }).eq('active', true),
          supabase.from('profiles').select('id', { count: 'exact', head: true }),
          supabase.from('orders').select('total_amount').eq('payment_status', 'paid')
        ]);

        const totalRevenue = revenue.data?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

        setRecentOrders(ordersWithProfiles);
        setLowStockProducts(lowStockData || []);
        setStats({
          totalRevenue,
          totalOrders: ordersCount.count || 0,
          totalProducts: productsCount.count || 0,
          totalCustomers: customersCount.count || 0
        });
      } catch (error) {
        console.error('Erro ao buscar dados do dashboard:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Pendente';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregue';
      default: return 'Desconhecido';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Dashboard Administrativo</h1>
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
              {loading ? '...' : `R$ ${stats.totalRevenue.toFixed(2)}`}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de vendas confirmadas
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
              {loading ? '...' : stats.totalOrders}
            </div>
            <p className="text-xs text-muted-foreground">
              Total de pedidos realizados
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
              {lowStockProducts.length} com estoque baixo
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
              Usuários registrados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Estatísticas de Vendas</CardTitle>
            <CardDescription>
              Acompanhe o desempenho das vendas
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Gráficos de vendas serão implementados com dados reais
            </p>
          </CardContent>
        </Card>

        {/* Category Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Categorias de Produtos</CardTitle>
            <CardDescription>
              Distribuição por categoria
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-12">
            <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">
              Estatísticas de categoria serão implementadas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Tables Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Pedidos Recentes</CardTitle>
                <CardDescription>
                  Últimos pedidos realizados
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Ver todos
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div
                    key={order.id}
                    className="flex items-center justify-between p-3 border border-border rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {order.profiles?.first_name} {order.profiles?.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        #{order.order_number} • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold">R$ {Number(order.total_amount).toFixed(2)}</p>
                      <Badge variant={getStatusVariant(order.status)} className="text-xs">
                        {getStatusLabel(order.status)}
                      </Badge>
                    </div>
                  </div>
                ))}
                {recentOrders.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Nenhum pedido encontrado
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-warning" />
                  Estoque Baixo
                </CardTitle>
                <CardDescription>
                  Produtos que precisam de reposição
                </CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Gerenciar
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-muted-foreground mt-2 text-sm">Carregando...</p>
              </div>
            ) : (
              <div className="space-y-4">
                {lowStockProducts.map((product) => (
                  <div
                    key={product.id}
                    className="flex items-center justify-between p-3 border border-warning/20 bg-warning/5 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">{product.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Estoque mínimo: {product.min_stock_level}
                      </p>
                    </div>
                    <div className="text-right">
                      <Badge variant="destructive" className="text-xs">
                        {product.stock_quantity} restantes
                      </Badge>
                    </div>
                  </div>
                ))}
                {lowStockProducts.length === 0 && (
                  <p className="text-center text-muted-foreground py-4">
                    Todos os produtos estão com estoque adequado
                  </p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;