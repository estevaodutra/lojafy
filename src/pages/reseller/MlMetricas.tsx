import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, ShoppingBag, Star, RefreshCw,
  CheckCircle2, AlertTriangle, XCircle, Award
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMlMetrics } from '@/hooks/useMlMetrics';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── Reputação ─────────────────────────────────────────────────────────────────

const LEVEL_CONFIG: Record<string, { label: string; color: string; bgColor: string; icon: typeof CheckCircle2 }> = {
  '1': { label: 'Novato',   color: 'text-gray-600',  bgColor: 'bg-gray-100',   icon: ShoppingBag },
  '2': { label: 'Bronze',   color: 'text-amber-700', bgColor: 'bg-amber-100',  icon: Award },
  '3': { label: 'Prata',    color: 'text-slate-600', bgColor: 'bg-slate-100',  icon: Award },
  '4': { label: 'Ouro',     color: 'text-yellow-600',bgColor: 'bg-yellow-100', icon: Award },
  '5': { label: 'Platina',  color: 'text-blue-600',  bgColor: 'bg-blue-100',   icon: Award },
};

function ReputationCard({ reputation }: { reputation: any }) {
  if (!reputation) return null;

  const levelId = String(reputation.level_id ?? '1');
  const level = LEVEL_CONFIG[levelId] ?? LEVEL_CONFIG['1'];
  const LevelIcon = level.icon;

  const metrics = reputation.metrics ?? {};
  const cancRate = metrics.cancellations?.rate ?? 0;
  const claimsRate = metrics.claims?.rate ?? 0;
  const delayRate = metrics.delayed_handling_time?.rate ?? 0;

  function rateColor(rate: number) {
    if (rate <= 0.02) return 'text-green-600';
    if (rate <= 0.05) return 'text-amber-600';
    return 'text-destructive';
  }

  const positiveRatings = reputation.transactions?.ratings?.positive ?? 0;
  const negativeRatings = reputation.transactions?.ratings?.negative ?? 0;
  const totalRatings = positiveRatings + negativeRatings;
  const positiveRate = totalRatings > 0 ? (positiveRatings / totalRatings) * 100 : 100;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Star className="h-5 w-5 text-yellow-500" />
            Reputação no Mercado Livre
          </CardTitle>
          {reputation.power_seller_status && (
            <Badge className="bg-yellow-400 text-yellow-900 gap-1">
              <Award className="h-3 w-3" />
              Power Seller {reputation.power_seller_status}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Nível */}
        <div className="flex items-center gap-4">
          <div className={`p-3 rounded-full ${level.bgColor}`}>
            <LevelIcon className={`h-8 w-8 ${level.color}`} />
          </div>
          <div>
            <p className={`text-xl font-bold ${level.color}`}>{level.label}</p>
            <p className="text-sm text-muted-foreground">
              {reputation.transactions?.completed ?? 0} vendas concluídas
            </p>
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Avaliação positiva</span>
              <span className="font-bold text-green-600">{positiveRate.toFixed(1)}%</span>
            </div>
            <div className="h-3 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${positiveRate}%` }}
              />
            </div>
          </div>
        </div>

        {/* Métricas */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Cancelamentos', rate: cancRate, icon: XCircle },
            { label: 'Reclamações', rate: claimsRate, icon: AlertTriangle },
            { label: 'Atraso no envio', rate: delayRate, icon: RefreshCw },
          ].map(m => {
            const color = rateColor(m.rate);
            const Icon = m.icon;
            const ok = m.rate <= 0.02;
            return (
              <div key={m.label} className="text-center p-3 rounded-lg bg-muted/50">
                <Icon className={`h-5 w-5 mx-auto mb-1 ${color}`} />
                <p className={`text-lg font-bold ${color}`}>{(m.rate * 100).toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">{m.label}</p>
                <Badge variant="outline" className={`text-xs mt-1 ${ok ? 'text-green-600 border-green-400' : 'text-destructive border-destructive'}`}>
                  {ok ? '✓ OK' : '⚠ Atenção'}
                </Badge>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlMetricas({ resellerUserId }: { resellerUserId?: string }) {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const { data: metrics, isLoading, refetch, error } = useMlMetrics(resellerUserId);

  if (!hasActiveIntegration && !resellerUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <TrendingUp className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para ver as métricas.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>Conectar ML</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TrendingUp className="h-6 w-6 text-yellow-500" />
            Métricas ML
          </h1>
          <p className="text-muted-foreground text-sm">Desempenho da sua loja no Mercado Livre</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-40 w-full" />)}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-8 w-8 mx-auto mb-2 text-destructive" />
            <p>Erro ao carregar métricas. Verifique se sua conta ML está conectada.</p>
          </CardContent>
        </Card>
      ) : metrics ? (
        <>
          {/* Reputação */}
          <ReputationCard reputation={metrics.reputation} />

          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Anúncios ativos', value: metrics.activeListings, icon: ShoppingBag, color: 'text-blue-600' },
              { label: 'Vendas (30d)', value: metrics.totalSales30d, icon: CheckCircle2, color: 'text-green-600' },
              { label: 'Receita (30d)', value: formatBRL(metrics.totalRevenue30d), icon: TrendingUp, color: 'text-primary' },
              { label: 'Ticket médio', value: metrics.totalSales30d > 0 ? formatBRL(metrics.totalRevenue30d / metrics.totalSales30d) : '—', icon: Star, color: 'text-amber-600' },
            ].map(s => {
              const Icon = s.icon;
              return (
                <Card key={s.label}>
                  <CardContent className="pt-5 pb-4">
                    <div className="flex items-center gap-2 mb-1">
                      <Icon className={`h-4 w-4 ${s.color}`} />
                      <span className="text-xs text-muted-foreground">{s.label}</span>
                    </div>
                    <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Gráfico de vendas por dia */}
          {metrics.salesByDay.some(d => d.sales > 0) && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Vendas por dia (últimos 30 dias)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={metrics.salesByDay}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis
                      dataKey="date"
                      tickFormatter={d => {
                        const date = new Date(d + 'T12:00:00');
                        return format(date, 'dd/MM', { locale: ptBR });
                      }}
                      tick={{ fontSize: 11 }}
                      interval={4}
                    />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip
                      formatter={(value: number, name: string) => [
                        name === 'sales' ? `${value} venda(s)` : formatBRL(value),
                        name === 'sales' ? 'Vendas' : 'Receita',
                      ]}
                      labelFormatter={d => format(new Date(d + 'T12:00:00'), "dd 'de' MMMM", { locale: ptBR })}
                    />
                    <Line type="monotone" dataKey="sales" stroke="#2563eb" strokeWidth={2} dot={false} name="sales" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Pedidos recentes */}
          {metrics.recentOrders.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Pedidos Recentes do ML</CardTitle>
                <CardDescription>{metrics.recentOrders.length} pedido(s) encontrado(s)</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {metrics.recentOrders.slice(0, 20).map(order => {
                        const item = order.order_items?.[0];
                        const statusMap: Record<string, { label: string; color: string }> = {
                          paid:      { label: 'Pago',      color: 'bg-green-100 text-green-700' },
                          delivered: { label: 'Entregue',  color: 'bg-blue-100 text-blue-700' },
                          cancelled: { label: 'Cancelado', color: 'bg-red-100 text-red-700' },
                          pending:   { label: 'Pendente',  color: 'bg-amber-100 text-amber-700' },
                        };
                        const st = statusMap[order.status] ?? { label: order.status, color: 'bg-gray-100 text-gray-600' };
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(order.date_created), "dd/MM/yy HH:mm", { locale: ptBR })}
                            </TableCell>
                            <TableCell className="text-sm">{order.buyer?.nickname ?? '—'}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">
                              {item?.item?.title ?? '—'}
                            </TableCell>
                            <TableCell className="font-medium text-sm">
                              {formatBRL(Number(order.total_amount ?? 0))}
                            </TableCell>
                            <TableCell>
                              <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      ) : null}
    </div>
  );
}
