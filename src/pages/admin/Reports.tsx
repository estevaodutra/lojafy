import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { DollarSign, TrendingUp, Package, Download, RefreshCw, Settings, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useReportSettings } from '@/hooks/useReportSettings';

interface DailyReport {
  id: string;
  report_date: string;
  total_orders: number;
  total_items: number;
  total_cost: number;
  total_revenue: number;
  total_profit: number;
  profit_margin: number;
  total_shipping: number;
  total_taxes: number;
  orders_by_status: Record<string, number>;
  top_products: Array<{ id: string; name: string; qty: number; revenue: number }>;
  generated_at: string;
}

export default function AdminReports() {
  const [reports, setReports] = useState<DailyReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [period, setPeriod] = useState('30');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [realtimeActive, setRealtimeActive] = useState(false);
  const { settings, updateSettings } = useReportSettings();

  useEffect(() => {
    fetchReports();
    
    // Setup realtime subscription
    setRealtimeActive(true);
    const channel = supabase
      .channel('daily_sales_reports_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_sales_reports'
        },
        (payload) => {
          console.log('Relatório atualizado em tempo real:', payload);
          toast.success('Relatório atualizado!');
          fetchReports();
        }
      )
      .subscribe();

    return () => {
      setRealtimeActive(false);
      supabase.removeChannel(channel);
    };
  }, [period]);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('daily_sales_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (period === 'today') {
        query = query.eq('report_date', format(new Date(), 'yyyy-MM-dd'));
      } else if (period === 'yesterday') {
        query = query.eq('report_date', format(subDays(new Date(), 1), 'yyyy-MM-dd'));
      } else if (period !== 'all' && period !== 'custom') {
        const daysAgo = subDays(new Date(), parseInt(period));
        query = query.gte('report_date', format(daysAgo, 'yyyy-MM-dd'));
      }

      const { data, error } = await query;
      if (error) throw error;

      setReports((data as unknown) as DailyReport[]);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const generateReport = async (dateOffset: number = 1) => {
    try {
      setGenerating(true);
      const targetDate = format(subDays(new Date(), dateOffset), 'yyyy-MM-dd');
      
      toast.loading('Gerando relatório...', { id: 'generating' });

      const { data, error } = await supabase.functions.invoke('generate-daily-report', {
        body: { date: targetDate }
      });

      if (error) throw error;

      toast.success('Relatório gerado com sucesso!', { id: 'generating' });
      await fetchReports();
    } catch (error) {
      console.error('Error generating report:', error);
      toast.error('Erro ao gerar relatório', { id: 'generating' });
    } finally {
      setGenerating(false);
    }
  };

  const exportToCSV = () => {
    const headers = ['Data', 'Pedidos', 'Itens', 'Custo Total', 'Receita Total', 'Lucro Líquido', 'Margem (%)'];
    const rows = reports.map(r => [
      r.report_date,
      r.total_orders,
      r.total_items,
      `R$ ${Number(r.total_cost).toFixed(2)}`,
      `R$ ${Number(r.total_revenue).toFixed(2)}`,
      `R$ ${Number(r.total_profit).toFixed(2)}`,
      Number(r.profit_margin).toFixed(2)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `relatorios-vendas-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Relatório exportado!');
  };

  // Calcular totais do período
  const totals = reports.reduce((acc, r) => ({
    revenue: acc.revenue + Number(r.total_revenue),
    profit: acc.profit + Number(r.total_profit),
    cost: acc.cost + Number(r.total_cost),
    orders: acc.orders + r.total_orders,
    items: acc.items + r.total_items,
  }), { revenue: 0, profit: 0, cost: 0, orders: 0, items: 0 });

  const avgMargin = reports.length > 0
    ? reports.reduce((sum, r) => sum + Number(r.profit_margin), 0) / reports.length
    : 0;

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios Financeiros</h1>
          <p className="text-muted-foreground">
            Análise detalhada de vendas, custos e lucros
          </p>
        </div>
        <div className="flex gap-2">
          {realtimeActive && (
            <Badge variant="outline" className="text-sm flex items-center gap-1">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
              Tempo real ativo
            </Badge>
          )}
          
          <Select value={period} onValueChange={setPeriod}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Hoje</SelectItem>
              <SelectItem value="yesterday">Ontem</SelectItem>
              <SelectItem value="7">Últimos 7 dias</SelectItem>
              <SelectItem value="30">Últimos 30 dias</SelectItem>
              <SelectItem value="90">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todos os períodos</SelectItem>
            </SelectContent>
          </Select>
          
          <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Settings className="w-4 h-4 mr-2" />
                Configurar
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Configurações do Relatório</DialogTitle>
                <DialogDescription>
                  Configure o horário de geração automática dos relatórios diários
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="auto-generate">Geração Automática</Label>
                  <Switch
                    id="auto-generate"
                    checked={settings?.auto_generate_enabled || false}
                    onCheckedChange={(checked) => 
                      updateSettings({ auto_generate_enabled: checked })
                    }
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Horário de Geração</Label>
                  <div className="flex gap-2 items-center">
                    <Select
                      value={settings?.generation_hour?.toString() || '0'}
                      onValueChange={(value) => 
                        updateSettings({ generation_hour: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }, (_, i) => (
                          <SelectItem key={i} value={i.toString()}>
                            {i.toString().padStart(2, '0')}h
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>:</span>
                    <Select
                      value={settings?.generation_minute?.toString() || '5'}
                      onValueChange={(value) => 
                        updateSettings({ generation_minute: parseInt(value) })
                      }
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {[0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55].map(min => (
                          <SelectItem key={min} value={min.toString()}>
                            {min.toString().padStart(2, '0')}min
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <Clock className="w-3 h-3 inline mr-1" />
                    Próxima execução: {settings?.generation_hour?.toString().padStart(2, '0')}:
                    {settings?.generation_minute?.toString().padStart(2, '0')}
                  </p>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          <Button onClick={exportToCSV} variant="outline" disabled={reports.length === 0}>
            <Download className="w-4 h-4 mr-2" />
            Exportar CSV
          </Button>
          
          <Button onClick={() => generateReport(0)} disabled={generating} variant="default">
            <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
            Gerar Últimas 24h
          </Button>
        </div>
      </div>

      {/* Cards de Resumo */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Receita Total
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {totals.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Custo: R$ {totals.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Lucro Líquido
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totals.profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {totals.orders} pedidos pagos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Margem Média
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {avgMargin.toFixed(2)}%
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Margem de lucro média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Package className="w-4 h-4" />
              Total de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totals.items.toLocaleString('pt-BR')}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Unidades vendidas
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Gráfico de Evolução */}
      <Card>
        <CardHeader>
          <CardTitle>Evolução de Receita e Lucro</CardTitle>
          <CardDescription>Visualização das vendas e lucros ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={[...reports].reverse()}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.1} />
                <XAxis 
                  dataKey="report_date" 
                  tickFormatter={(date) => format(new Date(date), 'dd/MM')}
                  style={{ fontSize: 12 }}
                />
                <YAxis style={{ fontSize: 12 }} />
                <Tooltip 
                  labelFormatter={(date) => format(new Date(date), 'dd/MM/yyyy', { locale: ptBR })}
                  formatter={(value: number) => [`R$ ${value.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, '']}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="total_revenue" 
                  stroke="hsl(var(--primary))" 
                  name="Receita"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_profit" 
                  stroke="#10b981" 
                  name="Lucro"
                  strokeWidth={2}
                />
                <Line 
                  type="monotone" 
                  dataKey="total_cost" 
                  stroke="#ef4444" 
                  name="Custo"
                  strokeWidth={2}
                  strokeDasharray="5 5"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Relatórios */}
      <Card>
        <CardHeader>
          <CardTitle>Relatórios Diários</CardTitle>
          <CardDescription>
            Histórico completo de relatórios gerados (apenas pedidos pagos)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Pedidos</TableHead>
                <TableHead>Itens</TableHead>
                <TableHead>Custo</TableHead>
                <TableHead>Receita</TableHead>
                <TableHead>Lucro</TableHead>
                <TableHead>Margem</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    Carregando relatórios...
                  </TableCell>
                </TableRow>
              ) : reports.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    <div className="flex flex-col items-center gap-2">
                      <p className="text-muted-foreground">Nenhum relatório encontrado</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => generateReport(1)}
                        disabled={generating}
                      >
                        <RefreshCw className={`w-4 h-4 mr-2 ${generating ? 'animate-spin' : ''}`} />
                        Gerar Primeiro Relatório
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {format(new Date(report.report_date), 'dd/MM/yyyy', { locale: ptBR })}
                    </TableCell>
                    <TableCell>{report.total_orders}</TableCell>
                    <TableCell>{report.total_items}</TableCell>
                    <TableCell>
                      R$ {Number(report.total_cost).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      R$ {Number(report.total_revenue).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="font-semibold text-green-600">
                      R$ {Number(report.total_profit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      <Badge 
                        variant={Number(report.profit_margin) >= 30 ? 'default' : Number(report.profit_margin) >= 20 ? 'secondary' : 'destructive'}
                      >
                        {Number(report.profit_margin).toFixed(2)}%
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}