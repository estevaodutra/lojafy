import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Separator } from '@/components/ui/separator';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  FileText, RefreshCw, Download, TrendingUp,
  TrendingDown, DollarSign, Building2, Receipt
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMlBilling } from '@/hooks/useMlBilling';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const CHARGE_TYPE_LABELS: Record<string, string> = {
  commission:    'Comissão ML',
  listing:       'Taxa de listagem',
  advertising:   'Publicidade',
  shipping:      'Frete',
  tax:           'Impostos',
  other:         'Outros',
};

// ── Exportar CSV ──────────────────────────────────────────────────────────────

function exportCSV(orders: any[], period: string) {
  const headers = ['Data', 'Nº Pedido', 'Comprador', 'Produto', 'Qtd', 'Valor Bruto'];
  const rows = orders.map(order => {
    const item = order.items?.[0];
    return [
      format(new Date(order.date_created), 'dd/MM/yyyy HH:mm', { locale: ptBR }),
      String(order.id),
      order.buyer_nickname ?? '—',
      item?.title ?? '—',
      String(item?.quantity ?? 1),
      formatBRL(Number(order.total_amount ?? 0)),
    ];
  });

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `extrato-ml-${period}.csv`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlFaturamento({ resellerUserId }: { resellerUserId?: string }) {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const {
    periods, activePeriod, selectPeriod,
    charges, chargesByType, billingInfo,
    paidOrders, grossRevenue, totalCharges, netIncome,
    isLoading,
  } = useMlBilling(resellerUserId);

  const currentPeriod = periods.find(p => p.id === activePeriod);

  if (!hasActiveIntegration && !resellerUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Receipt className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para ver o faturamento.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>Conectar ML</Button>
      </div>
    );
  }

  // Dados para o gráfico
  const chartData = [
    { name: 'Receita Bruta', valor: grossRevenue, fill: '#22c55e' },
    { name: 'Taxas ML', valor: totalCharges, fill: '#ef4444' },
    { name: 'Lucro Líquido', valor: netIncome, fill: '#3b82f6' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Receipt className="h-6 w-6 text-yellow-500" />
            Faturamento ML
          </h1>
          <p className="text-muted-foreground text-sm">Extrato financeiro e fiscal das vendas no Mercado Livre</p>
        </div>
        <div className="flex items-center gap-2">
          {periods.length > 0 && (
            <Select value={activePeriod ?? ''} onValueChange={selectPeriod}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Selecionar período" />
              </SelectTrigger>
              <SelectContent>
                {periods.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {format(new Date(p.date_from), 'MMM yyyy', { locale: ptBR })}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {paidOrders.length > 0 && activePeriod && (
            <Button variant="outline" className="gap-1" onClick={() => exportCSV(paidOrders, activePeriod)}>
              <Download className="h-4 w-4" />CSV
            </Button>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <>
          {/* Resumo financeiro */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-green-200">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <span className="text-xs text-muted-foreground">Receita Bruta</span>
                </div>
                <p className="text-2xl font-bold text-green-600">{formatBRL(grossRevenue)}</p>
                <p className="text-xs text-muted-foreground">{paidOrders.length} pedido(s) pago(s)</p>
              </CardContent>
            </Card>
            <Card className="border-red-200">
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <TrendingDown className="h-4 w-4 text-destructive" />
                  <span className="text-xs text-muted-foreground">Taxas ML</span>
                </div>
                <p className="text-2xl font-bold text-destructive">{formatBRL(totalCharges)}</p>
                <p className="text-xs text-muted-foreground">{charges.length} cobrança(s)</p>
              </CardContent>
            </Card>
            <Card className={netIncome >= 0 ? 'border-blue-200' : 'border-red-200'}>
              <CardContent className="pt-5 pb-4">
                <div className="flex items-center gap-2 mb-1">
                  <DollarSign className={`h-4 w-4 ${netIncome >= 0 ? 'text-blue-600' : 'text-destructive'}`} />
                  <span className="text-xs text-muted-foreground">Lucro Líquido</span>
                </div>
                <p className={`text-2xl font-bold ${netIncome >= 0 ? 'text-blue-600' : 'text-destructive'}`}>
                  {formatBRL(netIncome)}
                </p>
                <p className="text-xs text-muted-foreground">
                  {grossRevenue > 0 ? `${((netIncome / grossRevenue) * 100).toFixed(1)}% de margem` : '—'}
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Gráfico */}
          {grossRevenue > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Resumo do Período</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={180}>
                  <BarChart data={chartData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={v => `R$${v.toFixed(0)}`} tick={{ fontSize: 11 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                    <Tooltip formatter={(v: number) => formatBRL(v)} />
                    <Bar dataKey="valor" fill="#3b82f6" radius={4} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Detalhamento de taxas */}
          {Object.keys(chargesByType).length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Detalhamento de Taxas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(chargesByType).map(([type, amount]) => (
                    <div key={type} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{CHARGE_TYPE_LABELS[type] ?? type}</span>
                      <span className="font-medium text-destructive">{formatBRL(amount)}</span>
                    </div>
                  ))}
                  <Separator />
                  <div className="flex items-center justify-between font-bold">
                    <span>Total de taxas</span>
                    <span className="text-destructive">{formatBRL(totalCharges)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Extrato de vendas */}
          <Card>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base">Extrato de Vendas</CardTitle>
                  <CardDescription>{paidOrders.length} pedido(s) no período</CardDescription>
                </div>
                {paidOrders.length > 0 && activePeriod && (
                  <Button size="sm" variant="outline" className="gap-1"
                    onClick={() => exportCSV(paidOrders, activePeriod)}>
                    <Download className="h-3 w-3" />Exportar CSV
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {paidOrders.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Receipt className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma venda no período selecionado.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Data</TableHead>
                        <TableHead>Pedido</TableHead>
                        <TableHead>Comprador</TableHead>
                        <TableHead>Produto</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paidOrders.map(order => {
                        const item = order.items?.[0];
                        return (
                          <TableRow key={order.id}>
                            <TableCell className="text-xs text-muted-foreground">
                              {format(new Date(order.date_created), 'dd/MM/yy HH:mm', { locale: ptBR })}
                            </TableCell>
                            <TableCell className="font-mono text-xs">#{order.id}</TableCell>
                            <TableCell className="text-sm">{order.buyer_nickname ?? '—'}</TableCell>
                            <TableCell className="text-sm max-w-xs truncate">{item?.title ?? '—'}</TableCell>
                            <TableCell className="font-medium text-green-600 text-sm">
                              {formatBRL(Number(order.total_amount ?? 0))}
                            </TableCell>
                            <TableCell>
                              <Badge className="text-xs bg-green-100 text-green-700">
                                {order.status === 'delivered' ? 'Entregue' : 'Pago'}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Dados fiscais */}
          {billingInfo && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  Dados Fiscais
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <p className="text-xs text-muted-foreground">Tipo de Documento</p>
                    <p className="font-medium">{billingInfo.doc_type}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Número</p>
                    <p className="font-medium">{billingInfo.doc_number}</p>
                  </div>
                  {billingInfo.business_name && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Razão Social</p>
                      <p className="font-medium">{billingInfo.business_name}</p>
                    </div>
                  )}
                  {billingInfo.address && (
                    <div className="col-span-2">
                      <p className="text-xs text-muted-foreground">Endereço</p>
                      <p className="font-medium">{billingInfo.address}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
