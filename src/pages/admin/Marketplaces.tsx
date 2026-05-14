import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, ShoppingBag, Users, MapPin, ChevronRight, MessageSquare, TrendingUp, Tag, Megaphone, Receipt } from "lucide-react";
import MlMensagens from "@/pages/reseller/MlMensagens";
import MlMetricas from "@/pages/reseller/MlMetricas";
import MlPromocoes from "@/pages/reseller/MlPromocoes";
import MlPublicidade from "@/pages/reseller/MlPublicidade";
import MlFaturamento from "@/pages/reseller/MlFaturamento";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

// ── Download de etiqueta (super admin pode baixar de qualquer pedido) ────────
async function downloadLabelAsAdmin(orderId: string, orderNumber: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const res = await fetch(`${supabaseUrl}/functions/v1/ml-get-label?order_id=${orderId}`, {
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (!res.ok) return;

  const blob = await res.blob();
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `etiqueta-${orderNumber}.pdf`;
  link.click();
  URL.revokeObjectURL(link.href);
}

// ── Chamar ML API como um revendedor específico ───────────────────────────────
async function callMlProxy(resellerUserId: string, mlPath: string, method = 'GET', payload?: unknown) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  const { data, error } = await supabase.functions.invoke('ml-proxy', {
    body: { reseller_user_id: resellerUserId, ml_path: mlPath, method, payload },
  });
  if (error) throw error;
  return data;
}

// ── Seção A: Contas conectadas ───────────────────────────────────────────────

function ConnectedAccounts({ onSelectReseller }: { onSelectReseller: (id: string, name: string) => void }) {
  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-ml-integrations'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('mercadolivre_integrations')
        .select(`
          user_id, ml_user_id, is_active, last_refreshed_at, expires_at,
          profile:profiles!mercadolivre_integrations_user_id_fkey(first_name, last_name, role)
        `)
        .eq('is_active', true)
        .order('last_refreshed_at', { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{integrations.length} conta(s) conectada(s)</p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />Atualizar
        </Button>
      </div>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Revendedor</TableHead>
              <TableHead>Função</TableHead>
              <TableHead>ML User ID</TableHead>
              <TableHead>Token válido até</TableHead>
              <TableHead>Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {integrations.map((intg: any) => {
              const name = [intg.profile?.first_name, intg.profile?.last_name].filter(Boolean).join(' ') || 'Usuário';
              const expiresAt = intg.expires_at ? new Date(intg.expires_at) : null;
              const isExpired = expiresAt ? expiresAt < new Date() : false;
              return (
                <TableRow key={intg.user_id}>
                  <TableCell className="font-medium">{name}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{intg.profile?.role}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{intg.ml_user_id}</TableCell>
                  <TableCell>
                    {expiresAt ? (
                      <span className={isExpired ? 'text-destructive text-xs' : 'text-xs text-muted-foreground'}>
                        {isExpired ? '⚠️ Expirado — ' : ''}
                        {format(expiresAt, "dd/MM/yy HH:mm", { locale: ptBR })}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell>
                    <Button size="sm" variant="default" onClick={() => onSelectReseller(intg.user_id, name)}>
                      Operar como <ChevronRight className="h-3 w-3 ml-1" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Seção B: Pedidos ML globais ───────────────────────────────────────────────

function MlOrders() {
  const [resellerFilter, setResellerFilter] = useState('all');

  const { data: orders = [], isLoading } = useQuery({
    queryKey: ['admin-ml-orders', resellerFilter],
    queryFn: async () => {
      let query = supabase
        .from('orders')
        .select(`
          id, order_number, status, payment_status, total_amount, created_at,
          payment_method, ml_shipment_id, tracking_code, reseller_id,
          reseller:profiles!orders_reseller_id_fkey(first_name, last_name)
        `)
        .eq('payment_method', 'mercadolivre')
        .order('created_at', { ascending: false })
        .limit(100);

      if (resellerFilter !== 'all') {
        query = query.eq('reseller_id', resellerFilter);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
  });

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">{orders.length} pedido(s) via Mercado Livre</p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pedido</TableHead>
              <TableHead>Revendedor</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Valor</TableHead>
              <TableHead>Rastreio</TableHead>
              <TableHead>Data</TableHead>
              <TableHead>Etiqueta</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {orders.map((order: any) => {
              const resellerName = order.reseller
                ? `${order.reseller.first_name ?? ''} ${order.reseller.last_name ?? ''}`.trim()
                : '—';
              return (
                <TableRow key={order.id}>
                  <TableCell className="font-mono text-sm">#{order.order_number}</TableCell>
                  <TableCell className="text-sm">{resellerName}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs">{order.status}</Badge></TableCell>
                  <TableCell className="font-medium">R$ {Number(order.total_amount).toFixed(2)}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {order.tracking_code ? (
                      <span className="flex items-center gap-1 text-blue-600">
                        <MapPin className="h-3 w-3" />{order.tracking_code}
                      </span>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {format(new Date(order.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                  </TableCell>
                  <TableCell>
                    {order.ml_shipment_id ? (
                      <Button size="sm" variant="outline" className="text-xs h-7 gap-1"
                        onClick={() => downloadLabelAsAdmin(order.id, order.order_number)}>
                        <Download className="h-3 w-3" />PDF
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">Sem envio</span>}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ── Seção C: Gerenciar anúncios de um revendedor ──────────────────────────────

function ResellerListings({ resellerUserId, resellerName }: { resellerUserId: string; resellerName: string }) {
  const { data, isLoading, refetch } = useQuery({
    queryKey: ['admin-ml-listings', resellerUserId],
    queryFn: async () => {
      // Buscar ml_user_id do revendedor
      const { data: intg } = await supabase
        .from('mercadolivre_integrations')
        .select('ml_user_id')
        .eq('user_id', resellerUserId)
        .single();

      if (!intg?.ml_user_id) return [];

      const result = await callMlProxy(resellerUserId, `/users/${intg.ml_user_id}/items/search?status=active&limit=50`);
      if (!result?.data?.results) return [];

      // Buscar detalhes dos itens
      const ids: string[] = result.data.results;
      if (ids.length === 0) return [];

      const details = await callMlProxy(resellerUserId, `/items?ids=${ids.join(',')}`);
      return (details?.data ?? []).map((d: any) => d.body ?? d);
    },
    enabled: !!resellerUserId,
  });

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}</div>;

  const listings = data ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{listings.length} anúncio(s) ativo(s) de <strong>{resellerName}</strong></p>
        <Button variant="outline" size="sm" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-2" />Atualizar
        </Button>
      </div>
      {listings.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum anúncio ativo encontrado.</p>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Preço</TableHead>
                <TableHead>Estoque</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {listings.map((item: any) => (
                <TableRow key={item.id}>
                  <TableCell className="max-w-xs truncate text-sm">{item.title}</TableCell>
                  <TableCell>R$ {Number(item.price ?? 0).toFixed(2)}</TableCell>
                  <TableCell>{item.available_quantity ?? '—'}</TableCell>
                  <TableCell><Badge variant="outline" className="text-xs capitalize">{item.status}</Badge></TableCell>
                  <TableCell className="flex gap-2">
                    {item.status === 'active' && (
                      <Button size="sm" variant="outline" className="text-xs h-7"
                        onClick={async () => {
                          await callMlProxy(resellerUserId, `/items/${item.id}`, 'PUT', { status: 'paused' });
                          refetch();
                        }}>
                        Pausar
                      </Button>
                    )}
                    {item.status === 'paused' && (
                      <Button size="sm" variant="default" className="text-xs h-7"
                        onClick={async () => {
                          await callMlProxy(resellerUserId, `/items/${item.id}`, 'PUT', { status: 'active' });
                          refetch();
                        }}>
                        Ativar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" className="text-xs h-7"
                      onClick={() => window.open(`https://www.mercadolivre.com.br/p/${item.id}`, '_blank')}>
                      Ver ↗
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function Marketplaces() {
  const [selectedReseller, setSelectedReseller] = useState<{ id: string; name: string } | null>(null);
  const [activeTab, setActiveTab] = useState('accounts');

  const handleSelectReseller = (id: string, name: string) => {
    setSelectedReseller({ id, name });
    setActiveTab('listings');
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <ShoppingBag className="h-7 w-7 text-yellow-500" />
          Gestão de Marketplaces
        </h1>
        <p className="text-muted-foreground">
          Gerencie as contas do Mercado Livre de todos os revendedores
        </p>
      </div>

      {selectedReseller && (
        <Card className="border-yellow-300 bg-yellow-50/50">
          <CardContent className="flex items-center justify-between py-3 px-4">
            <p className="text-sm font-medium">
              Operando como: <strong>{selectedReseller.name}</strong>
            </p>
            <Button size="sm" variant="outline" onClick={() => setSelectedReseller(null)}>
              Sair
            </Button>
          </CardContent>
        </Card>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="accounts">
            <Users className="h-4 w-4 mr-2" />Contas Conectadas
          </TabsTrigger>
          <TabsTrigger value="orders">
            <ShoppingBag className="h-4 w-4 mr-2" />Pedidos ML
          </TabsTrigger>
          <TabsTrigger value="listings" disabled={!selectedReseller}>
            Anúncios {selectedReseller ? `(${selectedReseller.name})` : ''}
          </TabsTrigger>
          <TabsTrigger value="messages" disabled={!selectedReseller}>
            <MessageSquare className="h-4 w-4 mr-1" />
            Mensagens {selectedReseller ? `(${selectedReseller.name})` : ''}
          </TabsTrigger>
          <TabsTrigger value="metrics" disabled={!selectedReseller}>
            <TrendingUp className="h-4 w-4 mr-1" />
            Métricas
          </TabsTrigger>
          <TabsTrigger value="promotions" disabled={!selectedReseller}>
            <Tag className="h-4 w-4 mr-1" />
            Promoções
          </TabsTrigger>
          <TabsTrigger value="ads" disabled={!selectedReseller}>
            <Megaphone className="h-4 w-4 mr-1" />
            Publicidade
          </TabsTrigger>
          <TabsTrigger value="billing" disabled={!selectedReseller}>
            <Receipt className="h-4 w-4 mr-1" />
            Faturamento
          </TabsTrigger>
        </TabsList>

        <TabsContent value="accounts">
          <Card>
            <CardHeader>
              <CardTitle>Contas Mercado Livre</CardTitle>
              <CardDescription>Revendedores com conta ML conectada. Clique em "Operar como" para gerenciar.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectedAccounts onSelectReseller={handleSelectReseller} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="orders">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos via Mercado Livre</CardTitle>
              <CardDescription>Todos os pedidos recebidos pelo ML com etiquetas de envio.</CardDescription>
            </CardHeader>
            <CardContent>
              <MlOrders />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="listings">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Anúncios — {selectedReseller.name}</CardTitle>
                <CardDescription>Gerencie os anúncios ativos no Mercado Livre deste revendedor.</CardDescription>
              </CardHeader>
              <CardContent>
                <ResellerListings resellerUserId={selectedReseller.id} resellerName={selectedReseller.name} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor na aba "Contas Conectadas" para ver seus anúncios.
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="messages">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Mensagens — {selectedReseller.name}</CardTitle>
                <CardDescription>Perguntas e mensagens pós-venda deste revendedor no Mercado Livre.</CardDescription>
              </CardHeader>
              <CardContent>
                <MlMensagens resellerUserId={selectedReseller.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor na aba "Contas Conectadas" para ver suas mensagens.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="metrics">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Métricas — {selectedReseller.name}</CardTitle>
                <CardDescription>Reputação e desempenho no Mercado Livre.</CardDescription>
              </CardHeader>
              <CardContent>
                <MlMetricas resellerUserId={selectedReseller.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor para ver suas métricas.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="promotions">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Promoções — {selectedReseller.name}</CardTitle>
                <CardDescription>Gerencie as promoções no Mercado Livre deste revendedor.</CardDescription>
              </CardHeader>
              <CardContent>
                <MlPromocoes resellerUserId={selectedReseller.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor para ver suas promoções.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="ads">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Publicidade — {selectedReseller.name}</CardTitle>
                <CardDescription>Product Ads do Mercado Livre deste revendedor.</CardDescription>
              </CardHeader>
              <CardContent>
                <MlPublicidade resellerUserId={selectedReseller.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor para ver sua publicidade.
              </CardContent>
            </Card>
          )}
        </TabsContent>
        <TabsContent value="billing">
          {selectedReseller ? (
            <Card>
              <CardHeader>
                <CardTitle>Faturamento — {selectedReseller.name}</CardTitle>
                <CardDescription>Extrato financeiro e fiscal do Mercado Livre deste revendedor.</CardDescription>
              </CardHeader>
              <CardContent>
                <MlFaturamento resellerUserId={selectedReseller.id} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                Selecione um revendedor para ver o faturamento.
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
