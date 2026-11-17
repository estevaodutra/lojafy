import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  ShoppingCart,
  DollarSign,
  TrendingUp,
  Package,
  Calendar,
  Eye,
  ArrowRight,
  ShoppingBag,
  Award,
  Crown,
} from 'lucide-react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
} from 'recharts';
import { subDays, format, startOfMonth, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useResellerOrders, ResellerOrder } from '@/hooks/useResellerOrders';
import { useResellerSales } from '@/hooks/useResellerSales';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';
import { ORDER_STATUS_CONFIG, OrderStatus } from '@/constants/orderStatus';
import OrderDetailsModal from '@/components/OrderDetailsModal';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';

export default function ResellerDashboard() {
  const navigate = useNavigate();
  const { data: orders, isLoading: isOrdersLoading } = useResellerOrders();
  const { data: salesData, isLoading: isSalesLoading } = useResellerSales();
  const { isFree, paymentUrl } = useSubscriptionCheck();

  const [periodDays, setPeriodDays] = useState<7 | 15 | 30>(30);
  const [selectedDetailOrderId, setSelectedDetailOrderId] = useState<string | null>(null);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  // Pedidos válidos (não cancelados)
  const validOrders = useMemo(() => {
    return (orders || []).filter((o) => o.status !== 'cancelado');
  }, [orders]);

  // Cálculos de métricas gerais
  const metrics = useMemo(() => {
    const totalOrdersCount = orders?.length || 0;
    const totalRevenue = validOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );
    const avgTicket = validOrders.length > 0 ? totalRevenue / validOrders.length : 0;

    const startMonth = startOfMonth(new Date());
    const thisMonthOrders = validOrders.filter(
      (o) => o.created_at && new Date(o.created_at) >= startMonth
    );
    const thisMonthRevenue = thisMonthOrders.reduce(
      (sum, o) => sum + (Number(o.total_amount) || 0),
      0
    );

    const commissions = salesData?.commissions_this_month || 0;

    return {
      totalOrdersCount,
      totalRevenue,
      avgTicket,
      thisMonthOrdersCount: thisMonthOrders.length,
      thisMonthRevenue,
      commissions,
    };
  }, [orders, validOrders, salesData]);

  // Dados para o Gráfico de Faturamento por período
  const chartData = useMemo(() => {
    const today = new Date();
    const daysInterval = eachDayOfInterval({
      start: subDays(today, periodDays - 1),
      end: today,
    });

    return daysInterval.map((dateObj) => {
      const dateKey = format(dateObj, 'yyyy-MM-dd');
      const label = format(dateObj, 'dd/MM', { locale: ptBR });
      const fullLabel = format(dateObj, "dd 'de' MMMM", { locale: ptBR });

      const dayOrders = validOrders.filter((order) => {
        if (!order.created_at) return false;
        return format(new Date(order.created_at), 'yyyy-MM-dd') === dateKey;
      });

      const faturamento = dayOrders.reduce(
        (sum, o) => sum + (Number(o.total_amount) || 0),
        0
      );
      const pedidos = dayOrders.length;
      const ticketMedio = pedidos > 0 ? faturamento / pedidos : 0;

      return {
        date: label,
        fullDate: fullLabel,
        faturamento,
        pedidos,
        ticketMedio,
      };
    });
  }, [validOrders, periodDays]);

  // Resumo do período selecionado no gráfico
  const periodSummary = useMemo(() => {
    const totalRevenue = chartData.reduce((sum, item) => sum + item.faturamento, 0);
    const totalOrders = chartData.reduce((sum, item) => sum + item.pedidos, 0);
    const dailyAverage = totalRevenue / periodDays;

    return {
      totalRevenue,
      totalOrders,
      dailyAverage,
    };
  }, [chartData, periodDays]);

  // Produtos mais vendidos
  const topProducts = useMemo(() => {
    if (!orders || orders.length === 0) return [];

    const productMap = new Map<
      string,
      {
        id: string;
        name: string;
        image: string;
        totalSold: number;
        totalRevenue: number;
      }
    >();

    validOrders.forEach((order) => {
      const items = order.order_items || [];
      items.forEach((item: any) => {
        const itemSnapshot = item.product_snapshot || {};
        const itemProd = item.product || {};
        const itemThumb =
          itemSnapshot.image_url ||
          itemSnapshot.imageUrl ||
          itemSnapshot.image ||
          itemProd.image_url ||
          itemProd.imageUrl ||
          itemProd.images?.[0] ||
          (itemProd.original_images && itemProd.original_images[0]) ||
          '/placeholder.svg';
        const itemTitle =
          itemSnapshot.name ||
          itemProd.name ||
          item.product_name ||
          'Produto';
        const qty = Number(item.quantity) || 1;
        const revenue =
          Number(item.total_price) ||
          (Number(item.unit_price) || 0) * qty ||
          0;
        const prodId = item.product_id || item.id || itemTitle;

        const existing = productMap.get(prodId);
        if (existing) {
          existing.totalSold += qty;
          existing.totalRevenue += revenue;
        } else {
          productMap.set(prodId, {
            id: prodId,
            name: itemTitle,
            image: itemThumb,
            totalSold: qty,
            totalRevenue: revenue,
          });
        }
      });
    });

    return Array.from(productMap.values())
      .sort((a, b) => b.totalSold - a.totalSold || b.totalRevenue - a.totalRevenue)
      .slice(0, 5);
  }, [orders, validOrders]);

  // Últimos pedidos
  const recentOrders = useMemo(() => {
    if (!orders) return [];
    return orders.slice(0, 6);
  }, [orders]);

  const getCustomerName = (order: ResellerOrder) => {
    if (order.profiles?.first_name) {
      return `${order.profiles.first_name} ${order.profiles.last_name || ''}`.trim();
    }
    if ((order as any).customer_name) {
      return (order as any).customer_name;
    }
    if (order.shipping_address?.receiver_name) {
      return order.shipping_address.receiver_name;
    }
    if (order.shipping_address?.name) {
      return order.shipping_address.name;
    }
    return 'Cliente';
  };

  const getStatusInfo = (status: string) => {
    return (
      ORDER_STATUS_CONFIG[status as OrderStatus] || {
        label: status,
        color: 'bg-muted text-foreground',
        icon: Package,
      }
    );
  };

  const isLoading = isOrdersLoading || isSalesLoading;

  return (
    <div className="space-y-6">
      {/* 1. Header do Dashboard */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-foreground">
            Dashboard do Revendedor
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Acompanhe o faturamento, evolução de vendas e seus últimos pedidos
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/reseller/catalogo')}
            className="text-xs gap-1.5 shadow-2xs"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Catálogo</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate('/reseller/pedidos')}
            className="text-xs gap-1.5 shadow-2xs font-semibold"
          >
            <ShoppingCart className="w-3.5 h-3.5" />
            <span>Meus Pedidos</span>
          </Button>
        </div>
      </div>

      {/* Alerta de Plano se gratuito */}
      {isFree && (
        <Alert className="border-yellow-500 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20">
          <Crown className="h-5 w-5 text-yellow-600" />
          <AlertTitle className="text-yellow-900 dark:text-yellow-100">
            Plano Revendedor
          </AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span className="text-yellow-800 dark:text-yellow-200 text-xs sm:text-sm">
              Potencialize suas operações com recursos avançados de integrações e vendas.
            </span>
            <Button
              size="sm"
              className="bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 text-white ml-4 text-xs"
              onClick={() => window.open(paymentUrl, '_blank')}
            >
              <Crown className="mr-1.5 h-3.5 w-3.5" />
              Ver Planos
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* 2. Cards de Métricas Principais (KPIs) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Faturamento Total */}
        <Card className="hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Faturamento Total
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-28" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.totalRevenue)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong className="text-foreground">{formatCurrency(metrics.thisMonthRevenue)}</strong> este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total de Pedidos */}
        <Card className="hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Total de Pedidos
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center">
              <ShoppingCart className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-20" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {metrics.totalOrdersCount}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  <strong className="text-foreground">{metrics.thisMonthOrdersCount}</strong> realizados este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Ticket Médio */}
        <Card className="hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Ticket Médio
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.avgTicket)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Média por pedido aprovado
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Comissões do Mês */}
        <Card className="hover:shadow-xs transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Comissões do Mês
            </CardTitle>
            <div className="w-8 h-8 rounded-full bg-amber-500/10 text-amber-600 flex items-center justify-center">
              <Award className="w-4 h-4" />
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold text-foreground">
                  {formatCurrency(metrics.commissions)}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Ganhos acumulados este mês
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* 3. Gráfico de Faturamento */}
      <Card className="shadow-2xs">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-3 border-b">
          <div>
            <CardTitle className="text-base sm:text-lg font-bold flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-emerald-600" />
              <span>Evolução do Faturamento</span>
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Receita diária obtida através dos pedidos realizados
            </CardDescription>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-muted-foreground" />
              <Select
                value={String(periodDays)}
                onValueChange={(val) => setPeriodDays(Number(val) as 7 | 15 | 30)}
              >
                <SelectTrigger className="w-[150px] h-8 text-xs font-medium">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Últimos 7 dias</SelectItem>
                  <SelectItem value="15">Últimos 15 dias</SelectItem>
                  <SelectItem value="30">Últimos 30 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>

        <CardContent className="pt-5 space-y-4">
          {/* Resumo do Período */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 rounded-lg bg-muted/30 border border-border/60">
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Total no Período</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(periodSummary.totalRevenue)}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Pedidos no Período</p>
              <p className="text-lg font-bold text-foreground">
                {periodSummary.totalOrders} {periodSummary.totalOrders === 1 ? 'pedido' : 'pedidos'}
              </p>
            </div>
            <div>
              <p className="text-[11px] text-muted-foreground font-medium">Média Diária</p>
              <p className="text-lg font-bold text-foreground">
                {formatCurrency(periodSummary.dailyAverage)}
              </p>
            </div>
          </div>

          {/* Gráfico Recharts */}
          <div className="h-[280px] w-full pt-2">
            {isLoading ? (
              <div className="h-full flex items-center justify-center">
                <Skeleton className="h-full w-full rounded-md" />
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={chartData}
                  margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="colorFaturamento" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis
                    dataKey="date"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#64748b' }}
                    tickFormatter={(val) => `R$ ${val}`}
                    width={80}
                  />
                  <RechartsTooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const data = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border shadow-md rounded-lg p-3 text-xs space-y-1">
                            <p className="font-semibold text-foreground border-b pb-1 mb-1">
                              {data.fullDate}
                            </p>
                            <p className="text-emerald-600 font-bold">
                              Faturamento: {formatCurrency(data.faturamento)}
                            </p>
                            <p className="text-muted-foreground">
                              Pedidos: {data.pedidos}
                            </p>
                            {data.pedidos > 0 && (
                              <p className="text-muted-foreground">
                                Ticket Médio: {formatCurrency(data.ticketMedio)}
                              </p>
                            )}
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="faturamento"
                    stroke="#10b981"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#colorFaturamento)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 4. Duas Colunas: Produtos Mais Vendidos & Últimos Pedidos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Coluna 1: Produtos Mais Vendidos */}
        <Card className="shadow-2xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Package className="w-4 h-4 text-primary" />
                <span>Produtos Mais Vendidos</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Itens com maior volume de vendas realizadas
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reseller/catalogo')}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <span>Ver Catálogo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : topProducts.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <Package className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Nenhum produto vendido ainda
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-3">
                  Assim que você registrar pedidos, os produtos com maior saída aparecerão organizados aqui.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/reseller/catalogo')}
                  className="text-xs gap-1.5"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Explorar Catálogo</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {topProducts.map((product, idx) => (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors"
                  >
                    {/* Rank Badge */}
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                        idx === 0
                          ? 'bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/40'
                          : idx === 1
                          ? 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200'
                          : idx === 2
                          ? 'bg-orange-200 text-orange-900 dark:bg-orange-950 dark:text-orange-200'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      #{idx + 1}
                    </div>

                    {/* Foto */}
                    <div className="w-12 h-12 rounded-md border overflow-hidden bg-muted/40 shrink-0 flex items-center justify-center">
                      <img
                        src={product.image}
                        alt={product.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                    </div>

                    {/* Detalhes */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground truncate" title={product.name}>
                        {product.name}
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        <strong className="text-foreground">{product.totalSold}</strong>{' '}
                        {product.totalSold === 1 ? 'unidade vendida' : 'unidades vendidas'}
                      </p>
                    </div>

                    {/* Faturamento do Produto */}
                    <div className="text-right shrink-0">
                      <p className="text-xs font-bold text-foreground">
                        {formatCurrency(product.totalRevenue)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">receita</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coluna 2: Últimos Pedidos */}
        <Card className="shadow-2xs flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ShoppingCart className="w-4 h-4 text-primary" />
                <span>Últimos Pedidos</span>
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Movimentações recentes dos seus clientes
              </CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/reseller/pedidos')}
              className="text-xs text-muted-foreground hover:text-foreground gap-1"
            >
              <span>Ver Todos ({orders?.length || 0})</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 p-4">
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <Skeleton key={i} className="h-16 w-full rounded-lg" />
                ))}
              </div>
            ) : recentOrders.length === 0 ? (
              <div className="h-56 flex flex-col items-center justify-center text-center p-4">
                <ShoppingCart className="w-10 h-10 text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">
                  Nenhum pedido registrado
                </p>
                <p className="text-xs text-muted-foreground max-w-xs mt-1 mb-3">
                  Quando seus clientes realizarem compras ou pedidos forem sincronizados, eles serão listados aqui.
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/reseller/pedidos')}
                  className="text-xs gap-1.5"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>Acessar Painel de Pedidos</span>
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentOrders.map((order) => {
                  const statusInfo = getStatusInfo(order.status);
                  const StatusIcon = statusInfo.icon;
                  const customerName = getCustomerName(order);
                  const formattedDate = order.created_at
                    ? format(new Date(order.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })
                    : '-';

                  return (
                    <div
                      key={order.id}
                      className="p-3 rounded-lg border border-border/70 bg-card hover:bg-muted/30 transition-colors flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono font-bold text-xs text-foreground">
                            #{order.order_number}
                          </span>
                          <Badge
                            variant="secondary"
                            className={`text-[10px] px-2 py-0.5 flex items-center gap-1 font-medium ${statusInfo.color}`}
                          >
                            <StatusIcon className="w-3 h-3" />
                            <span>{statusInfo.label}</span>
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground truncate">
                          {customerName} • {formattedDate}
                        </p>
                      </div>

                      <div className="text-right shrink-0 flex items-center gap-2">
                        <div>
                          <p className="text-xs font-bold text-foreground">
                            {formatCurrency(Number(order.total_amount) || 0)}
                          </p>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-foreground"
                          onClick={() => setSelectedDetailOrderId(order.id)}
                          title="Ver detalhes do pedido"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal de Detalhes do Pedido Compartilhado */}
      {selectedDetailOrderId && (
        <OrderDetailsModal
          orderId={selectedDetailOrderId}
          isOpen={!!selectedDetailOrderId}
          onClose={() => setSelectedDetailOrderId(null)}
        />
      )}
    </div>
  );
}
