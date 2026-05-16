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
import { Download, RefreshCw, ShoppingBag, Users, MapPin, ChevronRight, MessageSquare, TrendingUp, Tag, Megaphone, Receipt, RotateCcw, Play, Trash2, Clock, LayoutList, ToggleLeft, ToggleRight, ExternalLink, Copy, Pencil } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "@/hooks/use-toast";
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

async function triggerBulkResync(resellerUserId?: string) {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');
  const { data, error } = await supabase.functions.invoke('ml-bulk-resync', {
    body: resellerUserId ? { reseller_user_id: resellerUserId } : {},
  });
  if (error) throw error;
  return data;
}

const PAGE_SIZE = 10;

function ConnectedAccounts({ onSelectReseller }: { onSelectReseller: (id: string, name: string) => void }) {
  const [syncing, setSyncing] = useState<string | null>(null);
  const [queueing, setQueueing] = useState<string | null>(null);
  const [page, setPage] = useState(0);

  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-ml-integrations'],
    queryFn: async () => {
      // Two separate queries to avoid PostgREST nested JOIN + RLS blocking
      const { data: intgData, error } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id, ml_user_id, is_active, last_refreshed_at, expires_at')
        .eq('is_active', true)
        .order('last_refreshed_at', { ascending: false });
      if (error) throw error;

      const userIds = (intgData ?? []).map(i => i.user_id);
      if (userIds.length === 0) return [];

      const { data: profileData } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name, role')
        .in('user_id', userIds);

      const profileMap = new Map((profileData ?? []).map(p => [p.user_id, p]));
      return (intgData ?? []).map(i => ({ ...i, profile: profileMap.get(i.user_id) }));
    },
  });

  const handleResync = async (resellerUserId?: string, name?: string) => {
    const key = resellerUserId ?? 'all';
    setSyncing(key);
    try {
      const result = await triggerBulkResync(resellerUserId);
      toast({
        title: 'Re-sincronização concluída',
        description: `${result.success} anúncio(s) re-sincronizados${result.failed > 0 ? `, ${result.failed} falha(s)` : ''}${name ? ` para ${name}` : ''}.`,
      });
    } catch (err) {
      toast({ title: 'Erro ao re-sincronizar', description: String(err), variant: 'destructive' });
    } finally {
      setSyncing(null);
    }
  };

  const handleQueueSync = async (resellerUserId: string, name: string) => {
    setQueueing(resellerUserId);
    try {
      const { data: existing } = await supabase
        .from('ml_sync_queue')
        .select('id')
        .eq('user_id', resellerUserId)
        .in('status', ['pending', 'processing'])
        .limit(1);

      if (existing && existing.length > 0) {
        toast({ title: 'Já na fila', description: `${name} já tem sincronização pendente.` });
        return;
      }

      const { error } = await supabase.from('ml_sync_queue').insert({ user_id: resellerUserId, status: 'pending' });
      if (error) throw error;
      toast({ title: 'Adicionado à fila', description: `${name} será sincronizado nos próximos 10 minutos.` });
    } catch (err) {
      toast({ title: 'Erro ao enfileirar', description: String(err), variant: 'destructive' });
    } finally {
      setQueueing(null);
    }
  };

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{integrations.length} conta(s) conectada(s)</p>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={!!syncing} onClick={() => handleResync(undefined)}>
            <RotateCcw className={`h-4 w-4 mr-2 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            {syncing === 'all' ? 'Sincronizando...' : 'Re-sincronizar Todos'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPage(0); refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-2" />Atualizar
          </Button>
        </div>
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
            {integrations.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((intg: any) => {
              const name = [intg.profile?.first_name, intg.profile?.last_name].filter(Boolean).join(' ') || 'Usuário';
              const expiresAt = intg.expires_at ? new Date(intg.expires_at) : null;
              const isExpired = expiresAt ? expiresAt < new Date() : false;
              const isSyncingThis = syncing === intg.user_id;
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
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" disabled={!!queueing || queueing === intg.user_id}
                        onClick={() => handleQueueSync(intg.user_id, name)}>
                        <Play className={`h-3 w-3 mr-1 ${queueing === intg.user_id ? 'animate-spin' : ''}`} />
                        {queueing === intg.user_id ? '...' : 'Sincronizar'}
                      </Button>
                      <Button size="sm" variant="default" onClick={() => onSelectReseller(intg.user_id, name)}>
                        Operar como <ChevronRight className="h-3 w-3 ml-1" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      {integrations.length > PAGE_SIZE && (
        <div className="flex items-center justify-between pt-1 text-sm text-muted-foreground">
          <span>
            {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, integrations.length)} de {integrations.length}
          </span>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page === 0} onClick={() => setPage(p => p - 1)}>
              Anterior
            </Button>
            <Button size="sm" variant="outline" disabled={(page + 1) * PAGE_SIZE >= integrations.length} onClick={() => setPage(p => p + 1)}>
              Próximo
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Gerenciador Global de Anúncios ───────────────────────────────────────────

function GlobalListings() {
  const [search, setSearch] = useState('');
  const [toggling, setToggling] = useState<string | null>(null);

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-global-listings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ml_listing_variants')
        .select(`
          id, ml_item_id, variant_title, price, status, visits, sales,
          permalink, thumbnail, user_id, product_id, last_synced_at,
          product:products(sku, cost_price, name),
          seller:profiles!ml_listing_variants_user_id_fkey(first_name, last_name)
        `)
        .not('ml_item_id', 'is', null)
        .order('last_synced_at', { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as any[];
    },
    staleTime: 2 * 60 * 1000,
  });

  const handleToggle = async (listing: any) => {
    if (toggling) return;
    setToggling(listing.id);
    try {
      const newStatus = listing.status === 'published' ? 'paused' : 'published';
      const mlAction = newStatus === 'published' ? 'active' : 'paused';

      const { data: integration } = await supabase
        .from('mercadolivre_integrations')
        .select('access_token')
        .eq('user_id', listing.user_id)
        .eq('is_active', true)
        .single();

      if (integration?.access_token) {
        await fetch(`https://api.mercadolibre.com/items/${listing.ml_item_id}`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${integration.access_token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: mlAction }),
        });
      }

      await supabase.from('ml_listing_variants').update({ status: newStatus }).eq('id', listing.id);
      refetch();
    } catch (err) {
      toast({ title: 'Erro ao alterar status', description: String(err), variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const filtered = listings.filter(l =>
    !search || l.variant_title?.toLowerCase().includes(search.toLowerCase()) ||
    l.product?.sku?.toLowerCase().includes(search.toLowerCase()) ||
    l.seller?.first_name?.toLowerCase().includes(search.toLowerCase())
  );

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <Input
          placeholder="Buscar por anúncio, SKU ou seller..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filtered.length} anúncio(s)</span>
          <Button size="sm" variant="outline" onClick={() => refetch()}>
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutList className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum anúncio encontrado. Execute a fila de integração para importar.</p>
        </div>
      ) : (
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">Ativo</TableHead>
                <TableHead>Anúncio</TableHead>
                <TableHead>SKU</TableHead>
                <TableHead>Seller</TableHead>
                <TableHead className="text-right">Valor</TableHead>
                <TableHead className="text-right">Lucro</TableHead>
                <TableHead className="text-right">Visitas</TableHead>
                <TableHead className="text-right">Vendas</TableHead>
                <TableHead className="w-20">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((listing: any) => {
                const price = Number(listing.price ?? 0);
                const cost = Number(listing.product?.cost_price ?? 0);
                const profit = price - cost;
                const isActive = listing.status === 'published';
                const sellerName = [listing.seller?.first_name, listing.seller?.last_name].filter(Boolean).join(' ') || '—';

                return (
                  <TableRow key={listing.id}>
                    <TableCell>
                      <Switch
                        checked={isActive}
                        disabled={toggling === listing.id}
                        onCheckedChange={() => handleToggle(listing)}
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {listing.thumbnail && (
                          <img src={listing.thumbnail} alt="" className="h-8 w-8 rounded object-cover flex-shrink-0" />
                        )}
                        <div>
                          <p className="text-sm font-medium line-clamp-1 max-w-xs">{listing.variant_title}</p>
                          <Badge variant="outline" className={`text-xs mt-0.5 ${isActive ? 'border-green-300 text-green-700' : 'border-gray-300 text-gray-500'}`}>
                            {isActive ? 'Ativo' : 'Pausado'}
                          </Badge>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {listing.product?.sku ?? '—'}
                    </TableCell>
                    <TableCell className="text-sm">{sellerName}</TableCell>
                    <TableCell className="text-right font-medium">{price > 0 ? formatBRL(price) : '—'}</TableCell>
                    <TableCell className={`text-right text-sm font-medium ${profit >= 0 ? 'text-green-600' : 'text-destructive'}`}>
                      {cost > 0 ? formatBRL(profit) : '—'}
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{listing.visits ?? 0}</TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">{listing.sales ?? 0}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {listing.permalink && (
                          <Button size="icon" variant="ghost" className="h-7 w-7"
                            onClick={() => window.open(listing.permalink, '_blank')}>
                            <ExternalLink className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

// ── Painel de Fila de Integração ─────────────────────────────────────────────

function IntegrationQueue() {
  const [starting, setStarting] = useState(false);
  const [clearing, setClearing] = useState(false);

  const { data: queueStats, isLoading, refetch } = useQuery({
    queryKey: ['ml-sync-queue-stats'],
    queryFn: async () => {
      const { data } = await supabase
        .from('ml_sync_queue')
        .select('status');
      const rows = data ?? [];
      return {
        pending: rows.filter(r => r.status === 'pending').length,
        processing: rows.filter(r => r.status === 'processing').length,
        done: rows.filter(r => r.status === 'done').length,
        failed: rows.filter(r => r.status === 'failed').length,
        total: rows.length,
      };
    },
    refetchInterval: 30000,
  });

  const handleStart = async () => {
    setStarting(true);
    try {
      // Buscar todos os revendedores com integração ativa
      const { data: integrations } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id')
        .eq('is_active', true);

      if (!integrations?.length) {
        toast({ title: 'Nenhuma integração ativa encontrada' });
        return;
      }

      // Verificar quem já está na fila (pending ou processing)
      const { data: existing } = await supabase
        .from('ml_sync_queue')
        .select('user_id')
        .in('status', ['pending', 'processing']);

      const existingIds = new Set((existing ?? []).map(r => r.user_id));
      const toInsert = integrations
        .filter(i => !existingIds.has(i.user_id))
        .map(i => ({ user_id: i.user_id, status: 'pending' }));

      if (!toInsert.length) {
        toast({ title: 'Todos os revendedores já estão na fila' });
        return;
      }

      await supabase.from('ml_sync_queue').insert(toInsert);
      toast({
        title: 'Fila iniciada',
        description: `${toInsert.length} revendedor(es) adicionados. Processamento a cada 10 minutos.`,
      });
      refetch();
    } catch (err) {
      toast({ title: 'Erro ao iniciar fila', description: String(err), variant: 'destructive' });
    } finally {
      setStarting(false);
    }
  };

  const handleClear = async () => {
    setClearing(true);
    try {
      await supabase.from('ml_sync_queue').delete().in('status', ['done', 'failed']);
      toast({ title: 'Fila limpa', description: 'Itens concluídos e com falha removidos.' });
      refetch();
    } catch (err) {
      toast({ title: 'Erro ao limpar fila', variant: 'destructive' });
    } finally {
      setClearing(false);
    }
  };

  const stats = queueStats ?? { pending: 0, processing: 0, done: 0, failed: 0, total: 0 };
  const processed = stats.done + stats.failed;
  const progress = stats.total > 0 ? Math.round((processed / stats.total) * 100) : 0;
  const isRunning = stats.pending > 0 || stats.processing > 0;

  return (
    <Card className="mt-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Clock className="h-4 w-4 text-primary" />
              Fila de Integração em Lote
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              Processa 1 revendedor a cada 10 minutos via pg_cron
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refetch()}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
            {processed > 0 && (
              <Button size="sm" variant="outline" disabled={clearing} onClick={handleClear}>
                <Trash2 className="h-3.5 w-3.5 mr-1" />
                Limpar
              </Button>
            )}
            <Button size="sm" disabled={starting || isRunning} onClick={handleStart}>
              <Play className="h-3.5 w-3.5 mr-1" />
              {starting ? 'Iniciando...' : isRunning ? 'Em andamento' : 'Iniciar Fila'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : stats.total === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            Fila vazia. Clique em "Iniciar Fila" para sincronizar todos os revendedores.
          </p>
        ) : (
          <>
            <div className="flex gap-4 text-sm">
              <span className="text-amber-600 font-medium">⏳ {stats.pending} aguardando</span>
              {stats.processing > 0 && <span className="text-blue-600 font-medium">🔄 {stats.processing} processando</span>}
              <span className="text-green-600 font-medium">✅ {stats.done} concluídos</span>
              {stats.failed > 0 && <span className="text-destructive font-medium">❌ {stats.failed} falhas</span>}
            </div>
            <div className="space-y-1">
              <Progress value={progress} className="h-2" />
              <p className="text-xs text-muted-foreground text-right">{progress}% — {processed}/{stats.total}</p>
            </div>
            {isRunning && (
              <p className="text-xs text-muted-foreground">
                Próximo processamento em até 10 minutos (pg_cron automático)
              </p>
            )}
          </>
        )}
      </CardContent>
    </Card>
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
          <TabsTrigger value="global-listings">
            <LayoutList className="h-4 w-4 mr-2" />Todos os Anúncios
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
          <IntegrationQueue />
        </TabsContent>

        <TabsContent value="global-listings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <LayoutList className="h-5 w-5 text-primary" />
                Todos os Anúncios ML
              </CardTitle>
              <CardDescription>
                Gerencie anúncios de todos os revendedores. Execute a fila de integração para importar.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <GlobalListings />
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
