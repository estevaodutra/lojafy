import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useEffectiveUser } from '@/hooks/useEffectiveUser';
import { Package, MapPin, Heart, Clock, Truck, CheckCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Order {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  order_items: { id: string }[];
}

const Dashboard = () => {
  const { effectiveUserId, effectiveProfile } = useEffectiveUser();
  const [recentOrders, setRecentOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecentOrders = async () => {
      if (!effectiveUserId) return;

      try {
        const { data, error } = await supabase
          .from('orders')
          .select(`
            id,
            order_number,
            status,
            total_amount,
            created_at,
            order_items (id)
          `)
          .eq('user_id', effectiveUserId)
          .order('created_at', { ascending: false })
          .limit(3);

        if (error) throw error;
        setRecentOrders(data || []);
      } catch (error) {
        console.error('Erro ao buscar pedidos:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecentOrders();
  }, [effectiveUserId]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />;
      case 'shipped': return <Truck className="h-4 w-4" />;
      case 'delivered': return <CheckCircle className="h-4 w-4" />;
      default: return <Package className="h-4 w-4" />;
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'pending': return 'Processando';
      case 'shipped': return 'Enviado';
      case 'delivered': return 'Entregue';
      default: return 'Pendente';
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'delivered': return 'default';
      case 'shipped': return 'secondary';
      case 'pending': return 'outline';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">
          Olá, {effectiveProfile?.first_name || 'Cliente'}! 👋
        </h1>
        <p className="text-muted-foreground mt-2">
          Bem-vindo ao seu painel pessoal. Aqui você pode acompanhar seus pedidos e gerenciar sua conta.
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Package className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Meus Pedidos</h3>
            <p className="text-sm text-muted-foreground text-center">
              Acompanhe seus pedidos
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/minha-conta/pedidos">Ver Pedidos</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <MapPin className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Endereços</h3>
            <p className="text-sm text-muted-foreground text-center">
              Gerencie seus endereços
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/minha-conta/enderecos">Gerenciar</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <Heart className="h-8 w-8 text-primary mb-2" />
            <h3 className="font-semibold">Favoritos</h3>
            <p className="text-sm text-muted-foreground text-center">
              Produtos salvos
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/minha-conta/favoritos">Ver Lista</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col items-center justify-center p-6">
            <div className="h-8 w-8 bg-hero-gradient rounded-full flex items-center justify-center mb-2">
              <span className="text-white font-bold text-sm">E</span>
            </div>
            <h3 className="font-semibold">Continuar Comprando</h3>
            <p className="text-sm text-muted-foreground text-center">
              Explore novos produtos
            </p>
            <Button variant="outline" size="sm" className="mt-3" asChild>
              <Link to="/">Ver Loja</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Pedidos Recentes</CardTitle>
              <CardDescription>
                Seus últimos pedidos realizados
              </CardDescription>
            </div>
            <Button variant="outline" asChild>
              <Link to="/minha-conta/pedidos">Ver Todos</Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="text-muted-foreground mt-2">Carregando pedidos...</p>
            </div>
          ) : recentOrders.length > 0 ? (
            <div className="space-y-4">
              {recentOrders.map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between p-4 border border-border rounded-lg"
                >
                  <div className="flex items-center space-x-4">
                    {getStatusIcon(order.status)}
                    <div>
                      <p className="font-medium">#{order.order_number}</p>
                      <p className="text-sm text-muted-foreground">
                        {order.order_items?.length || 0} item(s) • {new Date(order.created_at).toLocaleDateString('pt-BR')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge variant={getStatusVariant(order.status)}>
                      {getStatusLabel(order.status)}
                    </Badge>
                    <span className="font-semibold">
                      R$ {Number(order.total_amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Package className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum pedido ainda</h3>
              <p className="text-muted-foreground mb-4">
                Que tal explorar nossa loja e fazer seu primeiro pedido?
              </p>
              <Button asChild>
                <Link to="/">Começar a Comprar</Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Dashboard;