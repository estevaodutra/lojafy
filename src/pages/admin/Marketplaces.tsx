import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Download, RefreshCw, ShoppingBag, Users, MapPin, ChevronRight, MessageSquare, TrendingUp, Tag, Megaphone, Receipt, RotateCcw, Play, Trash2, Clock, LayoutList, ToggleLeft, ToggleRight, ExternalLink, Copy, Pencil, AlertTriangle, AlertCircle, Link as LinkIcon, ArrowLeft, ArrowRight, Store, Package, CheckCircle2, Sparkles } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
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
import { cn } from "@/lib/utils";

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
  const [refreshingToken, setRefreshingToken] = useState<string | null>(null);
  const [refreshingAll, setRefreshingAll] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [page, setPage] = useState(0);

  const { data: integrations = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-ml-integrations'],
    queryFn: async () => {
      // Busca todas as integrações cadastradas (incluindo as que precisam de reconexão)
      const { data: intgData, error } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id, ml_user_id, is_active, last_refreshed_at, expires_at')
        .order('last_refreshed_at', { ascending: false });
      if (error) {
        console.error('Erro ao buscar integrações do Mercado Livre:', error);
        return [];
      }

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

  const handleRefreshToken = async (userId: string, name: string) => {
    setRefreshingToken(userId);
    try {
      const { data, error } = await supabase.functions.invoke('ml-token-refresh', {
        body: { user_id: userId, force: true },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Falha ao renovar token');
      }
      toast({
        title: 'Token renovado!',
        description: `O token de ${name} foi renovado com sucesso e está válido por mais 6 horas.`,
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Erro ao renovar token',
        description: err.message,
        variant: 'destructive',
      });
      refetch();
    } finally {
      setRefreshingToken(null);
    }
  };

  const handleRefreshAllTokens = async () => {
    setRefreshingAll(true);
    try {
      const { data, error } = await supabase.functions.invoke('ml-token-refresh', {
        body: { mode: 'refresh_all_expiring' },
      });
      if (error || !data?.success) {
        throw new Error(data?.error || error?.message || 'Falha ao renovar tokens');
      }
      const s = data.summary;
      toast({
        title: 'Renovação em lote concluída',
        description: `${s.refreshed} conta(s) renovada(s) com sucesso.${s.failed > 0 ? ` ${s.failed} falha(s).` : ''}`,
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Erro ao renovar contas',
        description: err.message,
        variant: 'destructive',
      });
    } finally {
      setRefreshingAll(false);
    }
  };

  const handleCopyReauthLink = async (userId: string, name: string) => {
    try {
      const { data: creds } = await supabase
        .from('marketplace_credentials')
        .select('client_id')
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();

      const clientId = creds?.client_id || import.meta.env.VITE_ML_CLIENT_ID || '2003351424267574';
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lojafy-supabase.d2x.site';
      const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, '');
      const redirectUri = `${cleanSupabaseUrl}/functions/v1/ml-oauth-callback`;
      const state = `${userId}:${redirectUri}`;
      const authUrl = `https://auth.mercadolibre.com.br/authorization?response_type=code&client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&state=${encodeURIComponent(state)}`;

      await navigator.clipboard.writeText(authUrl);
      toast({
        title: 'Link de Reconexão copiado!',
        description: `Envie o link para ${name}. Ao autorizar, a conta será reativada automaticamente na Lojafy.`,
      });
    } catch (err: any) {
      toast({
        title: 'Erro ao gerar link',
        description: err.message,
        variant: 'destructive',
      });
    }
  };

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

  const handleResetAll = async () => {
    setResetting(true);
    const count = integrations.length;
    try {
      // Deletar integrações, fila e listings (neq UUID impossível = deleta tudo)
      await supabase.from('mercadolivre_integrations').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ml_sync_queue').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      await supabase.from('ml_listing_variants').delete().neq('id', '00000000-0000-0000-0000-000000000000');
      toast({
        title: 'Integrações removidas',
        description: `${count} conta(s) desconectadas. Revendedores precisarão reconectar.`,
      });
      setPage(0);
      refetch();
    } catch (err) {
      toast({ title: 'Erro ao resetar', description: String(err), variant: 'destructive' });
    } finally {
      setResetting(false);
    }
  };

  if (isLoading) return <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{integrations.length} conta(s) conectada(s)</p>
        <div className="flex flex-wrap gap-2">
          <Button 
            variant="default" 
            size="sm" 
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
            disabled={refreshingAll} 
            onClick={handleRefreshAllTokens}
          >
            <RefreshCw className={`h-4 w-4 mr-1.5 ${refreshingAll ? 'animate-spin' : ''}`} />
            {refreshingAll ? 'Renovando...' : 'Renovar Todos os Tokens'}
          </Button>
          <Button variant="outline" size="sm" disabled={!!syncing} onClick={() => handleResync(undefined)}>
            <RotateCcw className={`h-4 w-4 mr-1.5 ${syncing === 'all' ? 'animate-spin' : ''}`} />
            {syncing === 'all' ? 'Sincronizando...' : 'Re-sincronizar Anúncios'}
          </Button>
          <Button variant="outline" size="sm" onClick={() => { setPage(0); refetch(); }}>
            <RefreshCw className="h-4 w-4 mr-1.5" />Atualizar
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm" disabled={resetting || integrations.length === 0}>
                <AlertTriangle className="h-4 w-4 mr-2" />
                Resetar Todas
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Resetar todas as integrações ML?</AlertDialogTitle>
                <AlertDialogDescription>
                  Isso desconectará <strong>{integrations.length} conta(s)</strong> do Mercado Livre,
                  limpará a fila de sincronização e removerá todos os anúncios importados.
                  Os revendedores precisarão reconectar suas contas.
                  <br /><br />
                  <strong>Esta ação não pode ser desfeita.</strong>
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive hover:bg-destructive/90"
                  onClick={handleResetAll}
                >
                  {resetting ? 'Resetando...' : 'Sim, resetar todas'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
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
              const now = new Date();
              const isExpired = expiresAt ? expiresAt < now : false;
              const isExpiringSoon = expiresAt ? (!isExpired && expiresAt.getTime() < now.getTime() + 2 * 60 * 60 * 1000) : false;
              const isReauthNeeded = intg.is_active === false;
              const isRefreshingThis = refreshingToken === intg.user_id;

              return (
                <TableRow key={intg.user_id} className={isReauthNeeded ? 'bg-destructive/5' : undefined}>
                  <TableCell className="font-medium">
                    <div className="space-y-0.5">
                      <p className="font-semibold text-foreground text-xs">{name}</p>
                      <span className="text-[10px] text-muted-foreground font-mono">{intg.user_id.slice(0, 8)}...</span>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline" className="capitalize text-[11px]">{intg.profile?.role || 'reseller'}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{intg.ml_user_id}</TableCell>
                  <TableCell>
                    {isReauthNeeded ? (
                      <Badge variant="destructive" className="gap-1 text-[11px] font-medium">
                        <AlertCircle className="h-3 w-3" /> Reconexão Necessária
                      </Badge>
                    ) : isExpired ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="border-destructive/40 text-destructive bg-destructive/10 gap-1 text-[11px]">
                          <AlertTriangle className="h-3 w-3" /> Expirado
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          {expiresAt ? format(expiresAt, "dd/MM/yy HH:mm", { locale: ptBR }) : ''}
                        </p>
                      </div>
                    ) : isExpiringSoon ? (
                      <div className="space-y-1">
                        <Badge variant="outline" className="border-amber-500/40 text-amber-600 bg-amber-500/10 gap-1 text-[11px]">
                          <Clock className="h-3 w-3" /> Expira em breve
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          {expiresAt ? format(expiresAt, "dd/MM HH:mm", { locale: ptBR }) : ''}
                        </p>
                      </div>
                    ) : expiresAt ? (
                      <div className="space-y-0.5">
                        <Badge variant="outline" className="border-emerald-500/40 text-emerald-700 dark:text-emerald-400 bg-emerald-500/10 gap-1 text-[11px]">
                          <CheckCircle2 className="h-3 w-3" /> Ativo
                        </Badge>
                        <p className="text-[10px] text-muted-foreground">
                          Válido até {format(expiresAt, "dd/MM HH:mm", { locale: ptBR })}
                        </p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Botão de Renovação Rápida de Token */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2.5 text-xs text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50 border-emerald-300 dark:border-emerald-800"
                        disabled={isRefreshingThis || isReauthNeeded}
                        onClick={() => handleRefreshToken(intg.user_id, name)}
                        title="Forçar renovação do token do Mercado Livre agora"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 mr-1 ${isRefreshingThis ? 'animate-spin' : ''}`} />
                        {isRefreshingThis ? '...' : 'Renovar'}
                      </Button>

                      {/* Botão Copiar Link de Reconexão (WhatsApp) */}
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 px-2 text-xs text-blue-600 hover:text-blue-700 hover:bg-blue-50 border-blue-200 dark:border-blue-800"
                        onClick={() => handleCopyReauthLink(intg.user_id, name)}
                        title="Copiar link de autorização OAuth para enviar no WhatsApp do revendedor"
                      >
                        <LinkIcon className="h-3.5 w-3.5 mr-1" />
                        Link
                      </Button>

                      {/* Botão Sincronizar Fila de Anúncios */}
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 px-2.5 text-xs"
                        disabled={!!queueing || queueing === intg.user_id || isReauthNeeded}
                        onClick={() => handleQueueSync(intg.user_id, name)}
                      >
                        <Play className={`h-3 w-3 mr-1 ${queueing === intg.user_id ? 'animate-spin' : ''}`} />
                        {queueing === intg.user_id ? '...' : 'Sincronizar'}
                      </Button>

                      {/* Operar como */}
                      <Button 
                        size="sm" 
                        variant="default" 
                        className="h-8 px-2.5 text-xs"
                        disabled={isReauthNeeded}
                        onClick={() => onSelectReseller(intg.user_id, name)}
                      >
                        Operar como <ChevronRight className="h-3 w-3 ml-0.5" />
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
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [toggling, setToggling] = useState<string | null>(null);

  // Buscar lista de contas/sellers conectados para filtro
  const { data: sellers = [] } = useQuery({
    queryKey: ['admin-ml-sellers-list'],
    queryFn: async () => {
      const { data: intgs, error } = await supabase
        .from('mercadolivre_integrations')
        .select('user_id, ml_user_id')
        .eq('is_active', true);
      if (error || !intgs || intgs.length === 0) return [];

      const userIds = intgs.map(i => i.user_id);
      const { data: profs } = await supabase
        .from('profiles')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds);

      const profMap = new Map((profs ?? []).map(p => [p.user_id, p]));
      return intgs.map(i => ({
        user_id: i.user_id,
        ml_user_id: i.ml_user_id,
        profile: profMap.get(i.user_id),
      }));
    },
  });

  const { data: listings = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-global-listings'],
    queryFn: async () => {
      // 1. Variantes de anúncio sincronizadas
      const { data: variants, error } = await supabase
        .from('ml_listing_variants')
        .select(`
          id, ml_item_id, variant_title, price, status, visits, sales,
          permalink, thumbnail, user_id, product_id, last_synced_at,
          product:products(sku, cost_price, name, image_url),
          seller:profiles!ml_listing_variants_user_id_fkey(first_name, last_name)
        `)
        .not('ml_item_id', 'is', null)
        .order('last_synced_at', { ascending: false })
        .limit(1000);
      if (error) throw error;

      // 2. Produtos publicados diretamente para não perder nenhum anúncio recente
      const { data: published } = await supabase
        .from('mercadolivre_published_products')
        .select(`
          id, ml_item_id, user_id, product_id, permalink, status, published_at,
          product:products(sku, cost_price, name, price, image_url),
          seller:profiles!mercadolivre_published_products_user_id_fkey(first_name, last_name)
        `)
        .not('ml_item_id', 'is', null)
        .order('published_at', { ascending: false })
        .limit(500);

      const itemsMap = new Map<string, any>();
      (variants ?? []).forEach((v: any) => {
        if (v.ml_item_id) itemsMap.set(v.ml_item_id, v);
      });

      (published ?? []).forEach((p: any) => {
        if (p.ml_item_id && !itemsMap.has(p.ml_item_id)) {
          itemsMap.set(p.ml_item_id, {
            id: p.id,
            ml_item_id: p.ml_item_id,
            variant_title: p.product?.name || 'Produto ML',
            price: Number(p.product?.price ?? 0),
            status: p.status === 'published' ? 'published' : 'paused',
            visits: 0,
            sales: 0,
            permalink: p.permalink,
            thumbnail: p.product?.image_url || null,
            user_id: p.user_id,
            product_id: p.product_id,
            last_synced_at: p.published_at,
            product: p.product,
            seller: p.seller,
          });
        }
      });

      return Array.from(itemsMap.values());
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
      toast({
        title: newStatus === 'published' ? 'Anúncio reativado' : 'Anúncio pausado',
        description: `O anúncio ${listing.ml_item_id} foi ${newStatus === 'published' ? 'reativado' : 'pausado'} no Mercado Livre.`,
      });
    } catch (err) {
      toast({ title: 'Erro ao alterar status', description: String(err), variant: 'destructive' });
    } finally {
      setToggling(null);
    }
  };

  const filtered = listings.filter((l: any) => {
    // Filtro por vendedor / conta
    if (selectedSeller !== 'all' && l.user_id !== selectedSeller) return false;

    // Filtro por status
    if (statusFilter === 'published' && l.status !== 'published') return false;
    if (statusFilter === 'paused' && l.status === 'published') return false;

    // Filtro de busca textual
    if (!search) return true;
    const term = search.toLowerCase();
    const titleMatch = l.variant_title?.toLowerCase().includes(term);
    const skuMatch = l.product?.sku?.toLowerCase().includes(term);
    const mlIdMatch = l.ml_item_id?.toLowerCase().includes(term);
    const sellerMatch = [l.seller?.first_name, l.seller?.last_name].filter(Boolean).join(' ').toLowerCase().includes(term);

    return titleMatch || skuMatch || mlIdMatch || sellerMatch;
  });

  const totalListings = listings.length;
  const activeListings = listings.filter((l: any) => l.status === 'published').length;
  const pausedListings = listings.filter((l: any) => l.status !== 'published').length;
  const totalSales = listings.reduce((acc: number, l: any) => acc + (Number(l.sales) || 0), 0);

  const formatBRL = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  return (
    <div className="space-y-4">
      {/* Cards de Métricas Consolidadas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card className="p-3 shadow-none">
          <p className="text-xs text-muted-foreground">Total de Anúncios</p>
          <p className="text-xl font-bold mt-0.5">{totalListings}</p>
        </Card>
        <Card className="p-3 shadow-none">
          <p className="text-xs text-muted-foreground">Anúncios Ativos</p>
          <p className="text-xl font-bold text-emerald-600 mt-0.5">{activeListings}</p>
        </Card>
        <Card className="p-3 shadow-none">
          <p className="text-xs text-muted-foreground">Anúncios Pausados</p>
          <p className="text-xl font-bold text-amber-600 mt-0.5">{pausedListings}</p>
        </Card>
        <Card className="p-3 shadow-none">
          <p className="text-xs text-muted-foreground">Vendas Acumuladas</p>
          <p className="text-xl font-bold text-blue-600 mt-0.5">{totalSales}</p>
        </Card>
      </div>

      {/* Barra de Filtros e Busca */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[280px]">
          <Input
            placeholder="Buscar por anúncio, SKU, MLB ou seller..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="max-w-xs"
          />

          {/* Filtro de Seller / Conta */}
          <Select value={selectedSeller} onValueChange={setSelectedSeller}>
            <SelectTrigger className="w-[180px] text-xs">
              <SelectValue placeholder="Todas as Contas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as Contas</SelectItem>
              {sellers.map((s: any) => {
                const name = [s.profile?.first_name, s.profile?.last_name].filter(Boolean).join(' ') || `ML ${s.ml_user_id}`;
                return (
                  <SelectItem key={s.user_id} value={s.user_id}>
                    {name}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>

          {/* Filtro de Status */}
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px] text-xs">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos Status</SelectItem>
              <SelectItem value="published">Apenas Ativos</SelectItem>
              <SelectItem value="paused">Apenas Pausados</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>{filtered.length} anúncio(s)</span>
          <Button size="sm" variant="outline" onClick={() => refetch()} title="Atualizar listagem">
            <RefreshCw className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <LayoutList className="h-10 w-10 mx-auto mb-2 opacity-30" />
          <p className="text-sm">Nenhum anúncio encontrado com os filtros selecionados.</p>
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

// ── Endpoints da Aplicação Mercado Livre ─────────────────────────────────────

function MlAppEndpointsCard() {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://lojafy-supabase.d2x.site';
  const cleanSupabaseUrl = supabaseUrl.replace(/\/$/, '');
  const webhookUrl = `${cleanSupabaseUrl}/functions/v1/ml-order-webhook`;
  const redirectUri = `${cleanSupabaseUrl}/functions/v1/ml-oauth-callback`;

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: `${label} copiada!`,
      description: 'URL copiada para a área de transferência.',
    });
  };

  return (
    <Card className="border-border/60 bg-muted/20">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-semibold flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-yellow-600" />
          Endpoints Oficiais da Aplicação Mercado Livre
        </CardTitle>
        <CardDescription className="text-xs">
          Configure estas URLs no seu aplicativo em <strong>developers.mercadolivre.com.br</strong> para recebimento de vendas e autorização OAuth.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 pt-0">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="p-2.5 rounded-lg border bg-background space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Webhook de Vendas (Tópico: orders_v2)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => copyToClipboard(webhookUrl, 'URL de Webhook')}
              >
                <Copy className="h-3 w-3" />
                Copiar
              </Button>
            </div>
            <code className="text-[11px] font-mono block bg-muted/60 p-1.5 rounded truncate select-all">
              {webhookUrl}
            </code>
          </div>

          <div className="p-2.5 rounded-lg border bg-background space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">Redirect URI (Autenticação OAuth)</span>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-[11px] gap-1"
                onClick={() => copyToClipboard(redirectUri, 'Redirect URI')}
              >
                <Copy className="h-3 w-3" />
                Copiar
              </Button>
            </div>
            <code className="text-[11px] font-mono block bg-muted/60 p-1.5 rounded truncate select-all">
              {redirectUri}
            </code>
          </div>
        </div>
      </CardContent>
    </Card>
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
  const [searchParams, setSearchParams] = useSearchParams();
  const currentMp = searchParams.get('mp');
  const [selectedMarketplace, setSelectedMarketplace] = useState<string | null>(currentMp || null);
  const [selectedReseller, setSelectedReseller] = useState<{ id: string; name: string } | null>(null);
  const currentTab = searchParams.get('tab') || 'accounts';
  const [activeTab, setActiveTab] = useState(currentTab);

  useEffect(() => {
    if (currentMp && currentMp !== selectedMarketplace) {
      setSelectedMarketplace(currentMp);
    } else if (!currentMp && selectedMarketplace) {
      setSelectedMarketplace(null);
    }
  }, [currentMp]);

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab');
    if (tabFromUrl && tabFromUrl !== activeTab) {
      setActiveTab(tabFromUrl);
    }
  }, [searchParams]);

  const handleTabChange = (tab: string) => {
    setActiveTab(tab);
    if (selectedMarketplace) {
      setSearchParams({ mp: selectedMarketplace, tab });
    }
  };

  const handleSelectMarketplace = (mp: string | null) => {
    setSelectedMarketplace(mp);
    if (mp) {
      setSearchParams({ mp, tab: activeTab });
    } else {
      setSearchParams({});
    }
  };

  // Estatísticas para o card do Mercado Livre no hub
  const { data: mlStats, isLoading: loadingStats } = useQuery({
    queryKey: ['admin-ml-hub-stats'],
    queryFn: async () => {
      const [{ count: accountsCount }, { count: listingsCount }, { count: ordersCount }] = await Promise.all([
        supabase.from('mercadolivre_integrations').select('*', { count: 'exact', head: true }).eq('is_active', true),
        supabase.from('ml_listing_variants').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }).eq('payment_method', 'mercadolivre'),
      ]);
      return {
        accountsCount: accountsCount ?? 0,
        listingsCount: listingsCount ?? 0,
        ordersCount: ordersCount ?? 0,
      };
    },
    staleTime: 1000 * 60 * 2,
  });

  const handleSelectReseller = (id: string, name: string) => {
    setSelectedReseller({ id, name });
    handleTabChange('listings');
  };

  // Se nenhum marketplace selecionado, exibe o Hub com os Cards
  if (selectedMarketplace !== 'mercadolivre') {
    return (
      <div className="space-y-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 rounded-lg bg-yellow-500/10 text-yellow-600">
              <ShoppingBag className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight">Marketplaces</h1>
          </div>
          <p className="text-muted-foreground text-sm">
            Selecione uma plataforma integrada para gerenciar canais de venda, revendedores, pedidos e anúncios.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Card Mercado Livre (Ativo) */}
          <Card 
            className="group relative overflow-hidden border-2 border-yellow-400/70 hover:border-yellow-500 transition-all duration-200 hover:shadow-xl hover:shadow-yellow-500/10 cursor-pointer flex flex-col justify-between bg-gradient-to-b from-card via-card to-yellow-500/5"
            onClick={() => handleSelectMarketplace('mercadolivre')}
          >
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 rounded-2xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center p-2 shadow-sm group-hover:scale-105 transition-transform overflow-hidden">
                  <img 
                    src="/mercadolivre-logo.png" 
                    alt="Mercado Livre" 
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20 gap-1.5 font-medium">
                    <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    Ativo & Conectado
                  </Badge>
                  <span className="text-[11px] text-muted-foreground font-mono">Oficial API</span>
                </div>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground group-hover:text-yellow-600 transition-colors flex items-center gap-1.5">
                  Mercado Livre
                  <ChevronRight className="h-4 w-4 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all text-yellow-600" />
                </h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Gerenciamento de contas de revendedores, sincronização de anúncios em massa, etiquetas de envio, mensagens pós-venda e faturamento.
                </p>
              </div>

              {/* Resumo de métricas rápidas */}
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60">
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Contas</p>
                  <p className="text-base font-bold text-foreground">
                    {loadingStats ? '...' : (mlStats?.accountsCount ?? 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Anúncios</p>
                  <p className="text-base font-bold text-foreground">
                    {loadingStats ? '...' : (mlStats?.listingsCount ?? 0)}
                  </p>
                </div>
                <div className="p-2.5 rounded-lg bg-background/80 border border-border/50 text-center">
                  <p className="text-[11px] text-muted-foreground">Pedidos</p>
                  <p className="text-base font-bold text-foreground">
                    {loadingStats ? '...' : (mlStats?.ordersCount ?? 0)}
                  </p>
                </div>
              </div>

              {/* Tags de funcionalidades */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <Badge variant="secondary" className="text-[10px] py-0 font-normal">Multi-contas</Badge>
                <Badge variant="secondary" className="text-[10px] py-0 font-normal">Etiquetas ML</Badge>
                <Badge variant="secondary" className="text-[10px] py-0 font-normal">Mensagens SAC</Badge>
                <Badge variant="secondary" className="text-[10px] py-0 font-normal">Publicidade Ads</Badge>
              </div>
            </div>

            <CardFooter className="p-6 pt-0">
              <Button 
                className="w-full bg-yellow-500 hover:bg-yellow-600 text-slate-950 font-semibold shadow-sm gap-2"
                onClick={(e) => {
                  e.stopPropagation();
                  handleSelectMarketplace('mercadolivre');
                }}
              >
                Acessar Mercado Livre
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>

          {/* Card Shopee (Em breve) */}
          <Card className="flex flex-col justify-between border border-border/60 opacity-80 hover:opacity-100 transition-all bg-card/50">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center p-2 shadow-sm overflow-hidden">
                  <img 
                    src="/shopee-logo.png" 
                    alt="Shopee" 
                    className="h-10 w-10 object-contain"
                    onError={(e) => {
                      e.target.style.display = 'none';
                    }}
                  />
                </div>
                <Badge variant="outline" className="border-amber-500/30 text-amber-600 bg-amber-500/10">
                  Em breve
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Shopee</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Sincronização em massa de anúncios, suporte a etiquetas Shopee Xpress e gestão unificada de pedidos.
                </p>
              </div>

              <div className="space-y-1.5 pt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso da integração</span>
                  <span className="font-semibold text-foreground">65%</span>
                </div>
                <Progress value={65} className="h-1.5 bg-muted" />
              </div>
            </div>

            <CardFooter className="p-6 pt-0">
              <Button variant="outline" disabled className="w-full text-muted-foreground">
                Em desenvolvimento
              </Button>
            </CardFooter>
          </Card>

          {/* Card Amazon (Em breve) */}
          <Card className="flex flex-col justify-between border border-border/60 opacity-80 hover:opacity-100 transition-all bg-card/50">
            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div className="h-14 w-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center p-2.5 shadow-sm">
                  <Package className="h-8 w-8 text-blue-600" />
                </div>
                <Badge variant="outline" className="border-blue-500/30 text-blue-600 bg-blue-500/10">
                  Em breve
                </Badge>
              </div>

              <div>
                <h3 className="text-xl font-bold text-foreground">Amazon Brasil</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Conexão oficial com Amazon Seller Central, suporte à logística DBA/FBA e sincronização de catálogo.
                </p>
              </div>

              <div className="space-y-1.5 pt-4">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Progresso da integração</span>
                  <span className="font-semibold text-foreground">50%</span>
                </div>
                <Progress value={50} className="h-1.5 bg-muted" />
              </div>
            </div>

            <CardFooter className="p-6 pt-0">
              <Button variant="outline" disabled className="w-full text-muted-foreground">
                Em desenvolvimento
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-border/60">
        <div className="space-y-1">
          <div className="flex items-center gap-2 mb-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleSelectMarketplace(null)}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground h-8"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para Marketplaces
            </Button>
            <span className="text-muted-foreground text-xs">/</span>
            <Badge className="bg-yellow-500/15 text-yellow-700 dark:text-yellow-400 border-yellow-500/30 font-semibold text-xs">
              Mercado Livre
            </Badge>
          </div>
          <h1 className="text-3xl font-bold flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-yellow-400/20 text-yellow-600">
              <Store className="h-6 w-6" />
            </div>
            Gestão do Mercado Livre
          </h1>
          <p className="text-muted-foreground text-sm">
            Gerencie as contas do Mercado Livre de todos os revendedores, anúncios, pedidos e métricas
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSelectMarketplace(null)}
            className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Outros marketplaces
          </Button>
        </div>
      </div>

      {/* Layout com Subsidebar ao lado da Sidebar Principal */}
      <div className="flex flex-col lg:flex-row gap-6 items-start">
        {/* Subsidebar */}
        <aside className="w-full lg:w-64 shrink-0 bg-card border rounded-2xl p-3 shadow-xs sticky top-4 space-y-4">
          {/* Subsidebar Header */}
          <div className="space-y-3 pb-3 border-b border-border/60">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleSelectMarketplace(null)}
              className="w-full justify-start text-xs text-muted-foreground hover:text-foreground h-8 px-2 -ml-1 gap-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              Voltar para Marketplaces
            </Button>

            <div className="flex items-center gap-2.5 px-1 pt-0.5">
              <div className="h-9 w-9 rounded-xl bg-yellow-400/20 border border-yellow-400/40 flex items-center justify-center p-1.5 shrink-0 shadow-xs">
                <img
                  src="/mercadolivre-logo.png"
                  alt="Mercado Livre"
                  className="h-6 w-6 object-contain"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <h2 className="text-xs font-bold text-foreground truncate">Mercado Livre</h2>
                  <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[9px] px-1 py-0 h-3.5 border-emerald-500/30">
                    Ativo
                  </Badge>
                </div>
                <p className="text-[10px] text-muted-foreground truncate">Gestão Integrada</p>
              </div>
            </div>

            {selectedReseller && (
              <div className="p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/30 space-y-1">
                <div className="flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">Operando como:</span>
                  <button
                    onClick={() => setSelectedReseller(null)}
                    className="font-medium text-yellow-700 dark:text-yellow-400 hover:underline"
                  >
                    Sair
                  </button>
                </div>
                <p className="text-xs font-semibold text-foreground truncate">{selectedReseller.name}</p>
              </div>
            )}
          </div>

          {/* Subsidebar Navigation Groups */}
          <nav className="space-y-4">
            {/* Grupo 1: Global */}
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-2.5">
                Visão Geral
              </span>
              <div className="space-y-0.5 pt-1">
                {[
                  { value: 'accounts', label: 'Contas Conectadas', icon: Users, badge: mlStats?.accountsCount },
                  { value: 'global-listings', label: 'Todos os Anúncios', icon: LayoutList, badge: mlStats?.listingsCount },
                  { value: 'orders', label: 'Pedidos ML', icon: ShoppingBag, badge: mlStats?.ordersCount },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => handleTabChange(item.value)}
                    className={cn(
                      "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left group",
                      activeTab === item.value
                        ? "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200 font-semibold border border-yellow-500/30 shadow-xs"
                        : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <item.icon className={cn(
                        "h-4 w-4 shrink-0 transition-colors",
                        activeTab === item.value ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground group-hover:text-foreground"
                      )} />
                      <span className="truncate">{item.label}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className={cn(
                        "text-[10px] px-1.5 py-0.2 rounded-full font-mono",
                        activeTab === item.value ? "bg-yellow-500/25 text-yellow-900 dark:text-yellow-200 font-bold" : "bg-muted text-muted-foreground"
                      )}>
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Grupo 2: Revendedor Específico */}
            <div className="space-y-1">
              <div className="flex items-center justify-between px-2.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80">
                  Revendedor
                </span>
                {selectedReseller && (
                  <Badge variant="outline" className="text-[9px] px-1 py-0 border-yellow-500/40 text-yellow-700">
                    Ativo
                  </Badge>
                )}
              </div>
              <div className="space-y-0.5 pt-1">
                {[
                  { value: 'listings', label: `Anúncios ${selectedReseller ? `(${selectedReseller.name.split(' ')[0]})` : ''}`, icon: LayoutList },
                  { value: 'messages', label: 'Mensagens', icon: MessageSquare },
                  { value: 'metrics', label: 'Métricas', icon: TrendingUp },
                  { value: 'promotions', label: 'Promoções', icon: Tag },
                  { value: 'ads', label: 'Publicidade', icon: Megaphone },
                  { value: 'billing', label: 'Faturamento', icon: Receipt },
                ].map((item) => {
                  const isItemDisabled = !selectedReseller;
                  return (
                    <button
                      key={item.value}
                      onClick={() => handleTabChange(item.value)}
                      className={cn(
                        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all text-left group",
                        activeTab === item.value
                          ? "bg-yellow-500/15 text-yellow-900 dark:text-yellow-200 font-semibold border border-yellow-500/30 shadow-xs"
                          : isItemDisabled
                            ? "text-muted-foreground/60 hover:bg-muted/40 hover:text-muted-foreground"
                            : "text-muted-foreground hover:bg-muted/70 hover:text-foreground"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <item.icon className={cn(
                          "h-4 w-4 shrink-0 transition-colors",
                          activeTab === item.value ? "text-yellow-600 dark:text-yellow-400" : "text-muted-foreground group-hover:text-foreground"
                        )} />
                        <span className="truncate">{item.label}</span>
                      </div>
                      {isItemDisabled && (
                        <span className="text-[9px] text-muted-foreground/50">Requer conta</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </nav>
        </aside>

        {/* Área de Conteúdo da Aba */}
        <div className="flex-1 min-w-0">
          <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-4">

        <TabsContent value="accounts" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Contas Mercado Livre</CardTitle>
              <CardDescription>Revendedores com conta ML conectada. Clique em "Operar como" para gerenciar.</CardDescription>
            </CardHeader>
            <CardContent>
              <ConnectedAccounts onSelectReseller={handleSelectReseller} />
            </CardContent>
          </Card>
          <MlAppEndpointsCard />
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
      </div>
    </div>
  );
}
