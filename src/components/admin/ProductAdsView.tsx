import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, Plus, Search, Filter, Sparkles, Store, Copy, Edit3, PauseCircle, 
  PlayCircle, Archive, Trash2, ShieldCheck, History, Eye, ExternalLink, MoreHorizontal,
  TrendingUp, DollarSign, ShoppingBag, BarChart3, Tag
} from 'lucide-react';
import { AiVariationModal } from './AiVariationModal';
import { AdHistoryModal } from './AdHistoryModal';

interface ProductAdsViewProps {
  productId: string;
  onBack: () => void;
}

const ORIGIN_BADGES: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive'; className: string }> = {
  super_admin: { label: 'Superadmin', variant: 'default', className: 'bg-purple-600 text-white' },
  supplier: { label: 'Fornecedor', variant: 'secondary', className: 'bg-blue-600 text-white' },
  reseller: { label: 'Vendedor', variant: 'outline', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  imported: { label: 'Importado ML', variant: 'outline', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  duplicated: { label: 'Duplicado', variant: 'outline', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  ai_generated: { label: 'Gerado por IA', variant: 'default', className: 'bg-emerald-600 text-white animate-pulse' },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 border-emerald-300' },
  draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300 border-gray-300' },
  paused: { label: 'Pausado', className: 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300 border-amber-300' },
  closed: { label: 'Encerrado', className: 'bg-red-100 text-red-800 dark:bg-red-950 dark:text-red-300 border-red-300' },
  archived: { label: 'Arquivado', className: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border-slate-300' },
};

export const ProductAdsView: React.FC<ProductAdsViewProps> = ({ productId, onBack }) => {
  const { user } = useAuth();
  const { isSuperAdmin, isSupplier } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [marketplaceFilter, setMarketplaceFilter] = useState('all');
  const [originFilter, setOriginFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);
  
  // Modais
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetId, setHistoryTargetId] = useState<string | null>(null);
  
  // Modal de Novo/Edição de Anúncio
  const [showAdFormModal, setShowAdFormModal] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [adFormName, setAdFormName] = useState('');
  const [adFormTitle, setAdFormTitle] = useState('');
  const [adFormPrice, setAdFormPrice] = useState('');
  const [adFormDesc, setAdFormDesc] = useState('');

  // 1. Fetch Dados do Produto
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product-details', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*, categories!category_id(name)')
        .eq('id', productId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  // 2. Fetch Anúncios Vinculados
  const { data: ads = [], isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['product-ads', productId, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('ml_listing_variants')
        .select(`
          *,
          seller:profiles!ml_listing_variants_user_id_fkey(first_name, last_name, role)
        `)
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      // Permissões de Visibilidade:
      // - Superadmin vê TUDO.
      // - Fornecedor vê TUDO do produto dele.
      // - Vendedor vê apenas MODELOS OFICIAIS ou SEUS PRÓPRIOS anúncios!
      if (!isSuperAdmin && !isSupplier) {
        query = query.or(`is_official_model.eq.true,user_id.eq.${user?.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!productId && !!user?.id,
  });

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  };

  // Filtragem dos anúncios
  const filteredAds = ads.filter((ad: any) => {
    const internal = (ad.internal_name || '').toLowerCase();
    const title = (ad.variant_title || '').toLowerCase();
    const matchesSearch = !search || internal.includes(search.toLowerCase()) || title.includes(search.toLowerCase());

    const matchesMarketplace = marketplaceFilter === 'all' || (ad.marketplace || 'mercadolivre') === marketplaceFilter;
    const matchesOrigin = originFilter === 'all' || (ad.origin_type || 'reseller') === originFilter;
    const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;

    return matchesSearch && matchesMarketplace && matchesOrigin && matchesStatus;
  });

  // Métricas Consolidadas
  const totalAdsCount = ads.length;
  const totalSalesCount = ads.reduce((acc: number, item: any) => acc + Number(item.sales || 0), 0);
  const totalViewsCount = ads.reduce((acc: number, item: any) => acc + Number(item.visits || 0), 0);
  const totalRevenueSum = ads.reduce((acc: number, item: any) => acc + (Number(item.sales || 0) * Number(item.price || 0)), 0);

  // Ações de Anúncio
  const toggleSelectAd = (id: string) => {
    setSelectedAdIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedAdIds.length === filteredAds.length) {
      setSelectedAdIds([]);
    } else {
      setSelectedAdIds(filteredAds.map((a: any) => a.id));
    }
  };

  // Criar / Salvar Anúncio Vinculado
  const handleSaveAdForm = async () => {
    if (!adFormName.trim() || !adFormTitle.trim()) {
      toast({ variant: 'destructive', title: 'Preencha o Nome Interno e o Título do Anúncio.' });
      return;
    }

    try {
      const priceNum = parseFloat(adFormPrice.replace(',', '.')) || Number(product?.suggested_price || product?.price || 0);

      if (editingAd) {
        // Atualizar
        const { error } = await supabase
          .from('ml_listing_variants')
          .update({
            internal_name: adFormName,
            variant_title: adFormTitle,
            variant_description: adFormDesc,
            price: priceNum,
          })
          .eq('id', editingAd.id);

        if (error) throw error;
        toast({ title: 'Anúncio atualizado com sucesso!' });
      } else {
        // Criar Novo
        const originType = isSuperAdmin ? 'super_admin' : isSupplier ? 'supplier' : 'reseller';
        const { error } = await supabase
          .from('ml_listing_variants')
          .insert({
            product_id: productId,
            user_id: user!.id,
            internal_name: adFormName,
            variant_title: adFormTitle,
            variant_description: adFormDesc,
            price: priceNum,
            status: 'draft',
            origin_type: originType,
            origin_user_id: user!.id,
            origin_user_role: isSuperAdmin ? 'super_admin' : isSupplier ? 'supplier' : 'reseller',
            marketplace: 'mercadolivre',
            is_official_model: false
          });

        if (error) throw error;
        toast({ title: 'Novo anúncio criado como Rascunho!' });
      }

      setShowAdFormModal(false);
      setEditingAd(null);
      refetchAds();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao salvar anúncio', description: e.message });
    }
  };

  // Auxiliares de formatação para duplicação de anúncios
  const formatCopyTitle = (title?: string) => {
    if (!title) return 'Anúncio Copy';
    const cleanTitle = title.replace(/\s*(Copy|\(Cópia\))+$/gi, '').trim();
    return `${cleanTitle} Copy`;
  };

  const generateAdSku = (baseSku?: string) => {
    const prefix = baseSku ? baseSku.trim() : 'PROD';
    const randomHex = Math.floor(Math.random() * 0xffffff).toString(16).toUpperCase().padStart(6, '0');
    return `${prefix}-COPY-${randomHex}`;
  };

  const generateAdGtin = () => {
    const random10Digits = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    return `789${random10Digits}`;
  };

  // Duplicar Anúncio
  const handleDuplicateAd = async (ad: any) => {
    try {
      const targetProductId = productId || ad.product_id;
      const newTitle = formatCopyTitle(ad.variant_title || ad.internal_name);
      const newInternalName = formatCopyTitle(ad.internal_name || ad.variant_title);
      const newSku = generateAdSku(ad.sku || product?.sku);
      const newGtin = generateAdGtin();

      const { error } = await supabase
        .from('ml_listing_variants')
        .insert({
          product_id: targetProductId,
          user_id: user!.id,
          internal_name: newInternalName,
          variant_title: newTitle,
          variant_description: ad.variant_description || null,
          price: ad.price || 0,
          promotional_price: ad.promotional_price || null,
          video_url: ad.video_url || null,
          category_id: ad.category_id || null,
          sku: newSku,
          gtin: newGtin,
          status: 'draft',
          origin_type: 'duplicated',
          origin_user_id: user!.id,
          source_ad_id: ad.id && !ad.is_synthesized ? ad.id : null,
          marketplace: ad.marketplace || 'mercadolivre',
          is_official_model: false,
          ml_item_id: null,
          permalink: null,
          visits: 0,
          sales: 0,
          gross_revenue: 0,
          net_profit: 0,
          conversion_rate: 0,
          cancellations: 0,
          refunds: 0,
          last_synced_at: null,
        });

      if (error) throw error;
      toast({ title: 'Anúncio duplicado com sucesso!', description: 'A cópia foi criada como Rascunho com novos SKU e GTIN.' });
      refetchAds();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao duplicar anúncio', description: e.message });
    }
  };

  // Transformar em Modelo Oficial
  const handleTransformToOfficial = async (ad: any) => {
    try {
      const { error } = await supabase
        .from('ml_listing_variants')
        .insert({
          product_id: productId,
          user_id: user!.id,
          internal_name: `[OFICIAL] ${ad.internal_name || ad.variant_title}`,
          variant_title: ad.variant_title,
          variant_description: ad.variant_description,
          price: ad.price,
          status: 'published',
          origin_type: isSuperAdmin ? 'super_admin' : 'supplier',
          origin_user_id: user!.id,
          source_ad_id: ad.id,
          marketplace: ad.marketplace || 'mercadolivre',
          is_official_model: true
        });

      if (error) throw error;
      toast({ title: '⭐ Modelo Oficial Criado e Liberado para a Rede!' });
      refetchAds();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao criar Modelo Oficial', description: e.message });
    }
  };

  // Pausar / Ativar
  const handleToggleStatus = async (ad: any) => {
    const newStatus = ad.status === 'published' ? 'paused' : 'published';
    try {
      const { error } = await supabase
        .from('ml_listing_variants')
        .update({ status: newStatus })
        .eq('id', ad.id);
      if (error) throw error;
      toast({ title: `Status alterado para ${newStatus}` });
      refetchAds();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao alterar status', description: e.message });
    }
  };

  if (productLoading) {
    return (
      <div className="p-8 text-center space-y-4">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
        <p className="text-muted-foreground">Carregando dados do produto e anúncios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── BOTÃO VOLTAR E TÍTULO DA TELA ───────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          Voltar para a Lista de Produtos
        </Button>

        <div className="flex items-center gap-2">
          {selectedAdIds.length >= 1 && (
            <Button
              className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2"
              onClick={() => setShowAiModal(true)}
            >
              <Sparkles className="h-4 w-4" />
              Gerar Variações com IA ({selectedAdIds.length})
            </Button>
          )}

          <Button
            onClick={() => {
              setEditingAd(null);
              setAdFormName(`${product?.name} - Anúncio`);
              setAdFormTitle(product?.name || '');
              setAdFormPrice(String(product?.suggested_price || product?.price || ''));
              setAdFormDesc(product?.description || '');
              setShowAdFormModal(true);
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Novo Anúncio Vinculado
          </Button>
        </div>
      </div>

      {/* ── CABEÇALHO FIXO DO PRODUTO (TOP BANNER) ──────────────────────────── */}
      <Card className="bg-card border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <img
                src={product?.main_image_url || product?.image_url || '/placeholder.svg'}
                alt={product?.name}
                className="w-16 h-16 rounded-lg object-cover border bg-muted"
              />
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground">{product?.name}</h2>
                  <Badge variant={product?.active ? 'default' : 'secondary'}>
                    {product?.active ? 'Produto Ativo' : 'Inativo'}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  SKU: <strong className="text-foreground">{product?.sku || 'N/A'}</strong> | Categoria: {product?.categories?.name || 'Geral'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 w-full md:w-auto bg-muted/40 p-4 rounded-lg border">
              <div>
                <span className="text-xs text-muted-foreground block">Preço de Custo</span>
                <strong className="text-sm font-semibold">{formatPrice(product?.cost_price || product?.price)}</strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Preço Sugerido</span>
                <strong className="text-sm font-semibold text-emerald-600">{formatPrice(product?.suggested_price || product?.price)}</strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Estoque Central</span>
                <strong className={`text-sm font-bold ${Number(product?.stock_quantity || 0) <= 10 ? 'text-red-500' : 'text-foreground'}`}>
                  {product?.stock_quantity ?? 0} un
                </strong>
              </div>
              <div>
                <span className="text-xs text-muted-foreground block">Anúncios Vinculados</span>
                <strong className="text-sm font-bold text-primary">{totalAdsCount} anúncios</strong>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── CARD DE MÉTRICAS CONSOLIDADAS DOS ANÚNCIOS ─────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-blue-100 dark:bg-blue-950 text-blue-600 rounded-lg">
            <Store className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Total de Anúncios</span>
            <h3 className="text-2xl font-bold">{totalAdsCount}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-emerald-100 dark:bg-emerald-950 text-emerald-600 rounded-lg">
            <ShoppingBag className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Vendas Acumuladas</span>
            <h3 className="text-2xl font-bold">{totalSalesCount} un</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-purple-100 dark:bg-purple-950 text-purple-600 rounded-lg">
            <Eye className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Visualizações Totais</span>
            <h3 className="text-2xl font-bold">{totalViewsCount}</h3>
          </div>
        </Card>

        <Card className="p-4 flex items-center gap-4">
          <div className="p-3 bg-amber-100 dark:bg-amber-950 text-amber-600 rounded-lg">
            <DollarSign className="h-6 w-6" />
          </div>
          <div>
            <span className="text-xs text-muted-foreground">Faturamento Gerado</span>
            <h3 className="text-2xl font-bold">{formatPrice(totalRevenueSum)}</h3>
          </div>
        </Card>
      </div>

      {/* ── PAINEL DE FILTROS E BUSCA DE ANÚNCIOS ────────────────────────────── */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome interno, título..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto items-center">
              <Select value={marketplaceFilter} onValueChange={setMarketplaceFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Marketplace" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os Canais</SelectItem>
                  <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                  <SelectItem value="shopee">Shopee</SelectItem>
                </SelectContent>
              </Select>

              <Select value={originFilter} onValueChange={setOriginFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as Origens</SelectItem>
                  <SelectItem value="super_admin">Superadmin</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="reseller">Vendedor</SelectItem>
                  <SelectItem value="ai_generated">Gerado por IA</SelectItem>
                  <SelectItem value="imported">Importado ML</SelectItem>
                </SelectContent>
              </Select>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos Status</SelectItem>
                  <SelectItem value="published">Ativo</SelectItem>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="paused">Pausado</SelectItem>
                  <SelectItem value="closed">Encerrado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* ── TABELA DE ANÚNCIOS VINCULADOS ──────────────────────────────────── */}
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead className="w-12 text-center">
                    <Checkbox
                      checked={selectedAdIds.length > 0 && selectedAdIds.length === filteredAds.length}
                      onCheckedChange={toggleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Nome Interno do Anúncio</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Marketplace</TableHead>
                  <TableHead>Título Público</TableHead>
                  <TableHead className="text-right">Preço de Venda</TableHead>
                  <TableHead className="text-center">Performance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {adsLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8">
                      <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                      <p className="text-sm text-muted-foreground mt-2">Carregando anúncios...</p>
                    </TableCell>
                  </TableRow>
                ) : filteredAds.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      Nenhum anúncio vinculado encontrado com os filtros selecionados.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredAds.map((ad: any) => {
                    const isSelected = selectedAdIds.includes(ad.id);
                    const originInfo = ORIGIN_BADGES[ad.origin_type || 'reseller'] || ORIGIN_BADGES.reseller;
                    const statusInfo = STATUS_BADGES[ad.status || 'draft'] || STATUS_BADGES.draft;

                    return (
                      <TableRow key={ad.id} className={isSelected ? 'bg-muted/60' : ''}>
                        <TableCell className="text-center">
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelectAd(ad.id)}
                          />
                        </TableCell>

                        {/* Nome Interno + Flag de Modelo Oficial */}
                        <TableCell className="font-semibold text-foreground">
                          <div className="flex items-center gap-2">
                            <span>{ad.internal_name || ad.variant_title}</span>
                            {ad.is_official_model && (
                              <Badge variant="default" className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                                Modelo Oficial ⭐
                              </Badge>
                            )}
                          </div>
                        </TableCell>

                        {/* Origem */}
                        <TableCell>
                          <Badge className={originInfo.className}>
                            {originInfo.label}
                          </Badge>
                        </TableCell>

                        {/* Marketplace */}
                        <TableCell>
                          <div className="flex items-center gap-1.5 font-medium text-xs">
                            <Store className="h-3.5 w-3.5 text-primary" />
                            {ad.marketplace === 'shopee' ? 'Shopee' : 'Mercado Livre'}
                          </div>
                        </TableCell>

                        {/* Título Público */}
                        <TableCell className="max-w-xs truncate text-muted-foreground" title={ad.variant_title}>
                          {ad.variant_title}
                        </TableCell>

                        {/* Preço de Venda */}
                        <TableCell className="text-right font-bold text-foreground">
                          {formatPrice(ad.price)}
                        </TableCell>

                        {/* Performance */}
                        <TableCell className="text-center">
                          <div className="flex flex-col text-xs gap-0.5">
                            <span>👁️ {ad.visits || 0} visitas</span>
                            <strong className="text-emerald-600">🛒 {ad.sales || 0} vendas</strong>
                          </div>
                        </TableCell>

                        {/* Status */}
                        <TableCell className="text-center">
                          <Badge variant="outline" className={statusInfo.className}>
                            {statusInfo.label}
                          </Badge>
                        </TableCell>

                        {/* Menu de Ações */}
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuLabel>Opções do Anúncio</DropdownMenuLabel>
                              <DropdownMenuItem onClick={() => {
                                setEditingAd(ad);
                                setAdFormName(ad.internal_name || ad.variant_title);
                                setAdFormTitle(ad.variant_title || '');
                                setAdFormPrice(String(ad.price || ''));
                                setAdFormDesc(ad.variant_description || '');
                                setShowAdFormModal(true);
                              }}>
                                <Edit3 className="h-4 w-4 mr-2" /> Editar Anúncio
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleDuplicateAd(ad)}>
                                <Copy className="h-4 w-4 mr-2" /> Duplicar Anúncio
                              </DropdownMenuItem>

                              <DropdownMenuItem onClick={() => handleToggleStatus(ad)}>
                                {ad.status === 'published' ? (
                                  <><PauseCircle className="h-4 w-4 mr-2 text-amber-500" /> Pausar Anúncio</>
                                ) : (
                                  <><PlayCircle className="h-4 w-4 mr-2 text-emerald-500" /> Ativar Anúncio</>
                                )}
                              </DropdownMenuItem>

                              {(isSuperAdmin || isSupplier) && !ad.is_official_model && (
                                <DropdownMenuItem onClick={() => handleTransformToOfficial(ad)}>
                                  <ShieldCheck className="h-4 w-4 mr-2 text-amber-500" /> Criar Modelo Oficial ⭐
                                </DropdownMenuItem>
                              )}

                              <DropdownMenuSeparator />

                              <DropdownMenuItem onClick={() => {
                                setHistoryTargetId(ad.id);
                                setShowHistoryModal(true);
                              }}>
                                <History className="h-4 w-4 mr-2 text-blue-500" /> Ver Histórico / Logs
                              </DropdownMenuItem>

                              {ad.permalink && (
                                <DropdownMenuItem asChild>
                                  <a href={ad.permalink} target="_blank" rel="noopener noreferrer">
                                    <ExternalLink className="h-4 w-4 mr-2" /> Ver no Marketplace
                                  </a>
                                </DropdownMenuItem>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── MODAL DE CRIAR / EDITAR ANÚNCIO VINCULADO ────────────────────────── */}
      <Dialog open={showAdFormModal} onOpenChange={setShowAdFormModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Editar Anúncio' : 'Novo Anúncio Vinculado'}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do anúncio que consome o estoque central do produto.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-2">
            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Nome Interno do Anúncio (Obrigatório / Uso Exclusivo Lojafy)
              </label>
              <Input
                placeholder="Ex: Anúncio Frete Grátis - Teste Imagem 2"
                value={adFormName}
                onChange={(e) => setAdFormName(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground block mt-1">
                Não é enviado ao Mercado Livre/Shopee. Serve para a sua organização.
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Título Público do Anúncio (Máx 60 caracteres no ML)
              </label>
              <Input
                maxLength={60}
                placeholder="Ex: Mini Impressora Térmica Bluetooth Portátil"
                value={adFormTitle}
                onChange={(e) => setAdFormTitle(e.target.value)}
              />
              <span className="text-[11px] text-muted-foreground block mt-1">
                {adFormTitle.length}/60 caracteres
              </span>
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Preço de Venda (R$)
              </label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={adFormPrice}
                onChange={(e) => setAdFormPrice(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-foreground block mb-1">
                Descrição do Anúncio
              </label>
              <textarea
                className="w-full h-24 p-2 text-sm border rounded-md bg-background"
                placeholder="Descrição detalhada do anúncio..."
                value={adFormDesc}
                onChange={(e) => setAdFormDesc(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdFormModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdForm}>Salvar Anúncio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── MODAL IA DE VARIAÇÕES ────────────────────────────────────────────── */}
      <AiVariationModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        productId={productId}
        selectedAds={ads.filter((a: any) => selectedAdIds.includes(a.id))}
        onSuccess={() => {
          setSelectedAdIds([]);
          refetchAds();
        }}
      />

      {/* ── MODAL DE HISTÓRICO E AUDITORIA ──────────────────────────────────── */}
      <AdHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        adId={historyTargetId}
      />
    </div>
  );
};
