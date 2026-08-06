import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useUserRole } from '@/hooks/useUserRole';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Package, Megaphone, Plus, Search, Filter, Sparkles, Store, Copy, Edit3, PauseCircle, 
  PlayCircle, Archive, Trash2, ShieldCheck, History, Eye, ExternalLink, MoreHorizontal,
  TrendingUp, DollarSign, ShoppingBag, X, RefreshCw, Layers, CheckCircle2, ArrowRight
} from 'lucide-react';
import { AiVariationModal } from './AiVariationModal';
import { AdHistoryModal } from './AdHistoryModal';

interface MetaAdsManagerViewProps {
  roleMode?: 'admin' | 'supplier' | 'reseller';
  onNavigateToCreateProduct?: () => void;
  onEditProduct?: (product: any) => void;
}

const ORIGIN_BADGES: Record<string, { label: string; className: string }> = {
  super_admin: { label: 'Superadmin', className: 'bg-purple-600 text-white' },
  supplier: { label: 'Fornecedor', className: 'bg-blue-600 text-white' },
  reseller: { label: 'Vendedor', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  imported: { label: 'Importado ML', className: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
  duplicated: { label: 'Duplicado', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  ai_generated: { label: 'Gerado por IA', className: 'bg-emerald-600 text-white animate-pulse' },
};

const STATUS_BADGES: Record<string, { label: string; className: string }> = {
  published: { label: 'Ativo', className: 'bg-emerald-100 text-emerald-800 border-emerald-300' },
  draft: { label: 'Rascunho', className: 'bg-gray-100 text-gray-800 border-gray-300' },
  paused: { label: 'Pausado', className: 'bg-amber-100 text-amber-800 border-amber-300' },
  closed: { label: 'Encerrado', className: 'bg-red-100 text-red-800 border-red-300' },
  archived: { label: 'Arquivado', className: 'bg-slate-200 text-slate-700 border-slate-300' },
};

export const MetaAdsManagerView: React.FC<MetaAdsManagerViewProps> = ({
  roleMode = 'admin',
  onNavigateToCreateProduct,
  onEditProduct,
}) => {
  const { user } = useAuth();
  const { isSuperAdmin, isSupplier } = useUserRole();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Estado Principal de Abas
  const [activeTab, setActiveTab] = useState<'products' | 'ads'>('products');

  // Estado de Seleção Múltipla de Produtos (Persistente entre abas!)
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [selectedAdIds, setSelectedAdIds] = useState<string[]>([]);

  // Filtros da Aba Produtos
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');

  // Filtros da Aba Anúncios
  const [adSearch, setAdSearch] = useState('');
  const [adMarketplaceFilter, setAdMarketplaceFilter] = useState('all');
  const [adOriginFilter, setAdOriginFilter] = useState('all');
  const [adStatusFilter, setAdStatusFilter] = useState('all');

  // Modais
  const [showAiModal, setShowAiModal] = useState(false);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [historyTargetId, setHistoryTargetId] = useState<string | null>(null);

  // Modal de Criar/Editar Anúncio
  const [showAdFormModal, setShowAdFormModal] = useState(false);
  const [editingAd, setEditingAd] = useState<any>(null);
  const [targetProductIdForNewAd, setTargetProductIdForNewAd] = useState<string>('');
  const [adFormName, setAdFormName] = useState('');
  const [adFormTitle, setAdFormTitle] = useState('');
  const [adFormPrice, setAdFormPrice] = useState('');
  const [adFormDesc, setAdFormDesc] = useState('');

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  };

  // 1. QUERY DE PRODUTOS
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['meta-ads-products', roleMode, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories!category_id(name),
          ml_listing_variants(id, status, price, visits, sales, is_official_model)
        `)
        .order('created_at', { ascending: false });

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // 2. QUERY DE ANÚNCIOS
  const { data: ads = [], isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['meta-ads-ads', roleMode, user?.id],
    queryFn: async () => {
      let query = supabase
        .from('ml_listing_variants')
        .select(`
          *,
          product:products(*),
          seller:profiles!ml_listing_variants_user_id_fkey(first_name, last_name, role)
        `)
        .order('created_at', { ascending: false });

      if (!isSuperAdmin && !isSupplier) {
        query = query.or(`is_official_model.eq.true,user_id.eq.${user?.id}`);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!user?.id,
  });

  // Alternar Status Ativo/Inativo do Produto (Nível Pai)
  const toggleProductActiveMutation = useMutation({
    mutationFn: async ({ productId, newActive }: { productId: string; newActive: boolean }) => {
      const { error } = await supabase
        .from('products')
        .update({ active: newActive, updated_at: new Date().toISOString() })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      toast({ 
        title: variables.newActive ? 'Produto Ativado!' : 'Produto Desativado!',
        description: variables.newActive 
          ? 'Os anúncios vinculados agora estão operacionais.' 
          : 'Os anúncios vinculados foram pausados operacionalmente por herança de status.'
      });
      refetchProducts();
      refetchAds();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao alterar produto', description: e.message })
  });

  // Alternar Status Ativo/Pausado do Anúncio (Nível Filho)
  const toggleAdStatusMutation = useMutation({
    mutationFn: async ({ adId, newStatus }: { adId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('ml_listing_variants')
        .update({ status: newStatus })
        .eq('id', adId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Status do anúncio atualizado com sucesso!' });
      refetchAds();
    },
    onError: (e: Error) => toast({ variant: 'destructive', title: 'Erro ao alterar anúncio', description: e.message })
  });

  // FILTRAGEM DA TABELA PRODUTOS
  const filteredProducts = products.filter((product: any) => {
    const matchesSearch = !productSearch || 
      product.name.toLowerCase().includes(productSearch.toLowerCase()) ||
      (product.sku && product.sku.toLowerCase().includes(productSearch.toLowerCase()));

    const matchesStatus = productStatusFilter === 'all' ||
      (productStatusFilter === 'active' && product.active) ||
      (productStatusFilter === 'inactive' && !product.active);

    return matchesSearch && matchesStatus;
  });

  // FILTRAGEM DA TABELA ANÚNCIOS (Com base nos produtos selecionados ou GLOBAL!)
  const filteredAds = ads.filter((ad: any) => {
    // REGRA META ADS: Se houver produtos selecionados na aba Produtos, filtra apenas anúncios desses produtos!
    if (selectedProductIds.length > 0) {
      if (!selectedProductIds.includes(ad.product_id)) return false;
    }

    const internal = (ad.internal_name || '').toLowerCase();
    const title = (ad.variant_title || '').toLowerCase();
    const productName = (ad.product?.name || '').toLowerCase();

    const matchesSearch = !adSearch || 
      internal.includes(adSearch.toLowerCase()) || 
      title.includes(adSearch.toLowerCase()) ||
      productName.includes(adSearch.toLowerCase());

    const matchesMarketplace = adMarketplaceFilter === 'all' || (ad.marketplace || 'mercadolivre') === adMarketplaceFilter;
    const matchesOrigin = adOriginFilter === 'all' || (ad.origin_type || 'reseller') === adOriginFilter;
    const matchesStatus = adStatusFilter === 'all' || ad.status === adStatusFilter;

    return matchesSearch && matchesMarketplace && matchesOrigin && matchesStatus;
  });

  // Handlers de Seleção de Produtos
  const toggleSelectProduct = (id: string) => {
    setSelectedProductIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllProducts = () => {
    if (selectedProductIds.length === filteredProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(filteredProducts.map((p: any) => p.id));
    }
  };

  // Handlers de Seleção de Anúncios
  const toggleSelectAd = (id: string) => {
    setSelectedAdIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAllAds = () => {
    if (selectedAdIds.length === filteredAds.length) {
      setSelectedAdIds([]);
    } else {
      setSelectedAdIds(filteredAds.map((a: any) => a.id));
    }
  };

  // NAVEGAÇÃO RÁPIDA: Seleciona 1 produto e vai direto para a aba Anúncios
  const handleViewAdsForProduct = (productId: string) => {
    setSelectedProductIds([productId]);
    setActiveTab('ads');
  };

  // Salvar Formulário de Anúncio
  const handleSaveAdForm = async () => {
    if (!adFormName.trim() || !adFormTitle.trim() || (!editingAd && !targetProductIdForNewAd)) {
      toast({ variant: 'destructive', title: 'Preencha o Nome Interno, Título e Selecione o Produto.' });
      return;
    }

    try {
      const targetProd = products.find((p: any) => p.id === (editingAd ? editingAd.product_id : targetProductIdForNewAd));
      const priceNum = parseFloat(adFormPrice.replace(',', '.')) || Number(targetProd?.suggested_price || targetProd?.price || 0);

      if (editingAd) {
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
        toast({ title: 'Anúncio atualizado!' });
      } else {
        const originType = isSuperAdmin ? 'super_admin' : isSupplier ? 'supplier' : 'reseller';
        const { error } = await supabase
          .from('ml_listing_variants')
          .insert({
            product_id: targetProductIdForNewAd,
            user_id: user!.id,
            internal_name: adFormName,
            variant_title: adFormTitle,
            variant_description: adFormDesc,
            price: priceNum,
            status: 'draft',
            origin_type: originType,
            origin_user_id: user!.id,
            origin_user_role: originType,
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

  // Duplicar Anúncio
  const handleDuplicateAd = async (ad: any) => {
    try {
      const { error } = await supabase
        .from('ml_listing_variants')
        .insert({
          product_id: ad.product_id,
          user_id: user!.id,
          internal_name: `${ad.internal_name || ad.variant_title} (Cópia)`,
          variant_title: ad.variant_title,
          variant_description: ad.variant_description,
          price: ad.price,
          status: 'draft',
          origin_type: 'duplicated',
          origin_user_id: user!.id,
          source_ad_id: ad.id,
          marketplace: ad.marketplace || 'mercadolivre',
          is_official_model: false
        });
      if (error) throw error;
      toast({ title: 'Anúncio duplicado!' });
      refetchAds();
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro ao duplicar', description: e.message });
    }
  };

  // Transformar em Modelo Oficial
  const handleTransformToOfficial = async (ad: any) => {
    try {
      const { error } = await supabase
        .from('ml_listing_variants')
        .insert({
          product_id: ad.product_id,
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

  return (
    <div className="space-y-6">
      {/* ── CABEÇALHO DO META ADS MANAGER ───────────────────────────────────── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            Gerenciador de Produtos e Anúncios
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Gerencie seu catálogo macro e os anúncios operacionais no estilo Meta Ads Manager.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'products' ? (
            <Button onClick={() => onNavigateToCreateProduct?.()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          ) : (
            <Button 
              onClick={() => {
                setEditingAd(null);
                setTargetProductIdForNewAd(selectedProductIds[0] || (products[0]?.id || ''));
                setAdFormName('Novo Anúncio Vinculado');
                setAdFormTitle('');
                setAdFormPrice('');
                setAdFormDesc('');
                setShowAdFormModal(true);
              }} 
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Novo Anúncio Vinculado
            </Button>
          )}
        </div>
      </div>

      {/* ── NAVEGAÇÃO POR ABAS ESTILO META ADS ──────────────────────────────── */}
      <Tabs value={activeTab} onValueChange={(val) => setActiveTab(val as 'products' | 'ads')} className="w-full">
        <div className="flex items-center justify-between bg-muted/40 p-1.5 rounded-lg border mb-4">
          <TabsList className="bg-background">
            <TabsTrigger value="products" className="gap-2 font-bold px-6">
              <Package className="h-4 w-4" />
              Produtos ({products.length})
              {selectedProductIds.length > 0 && (
                <Badge variant="default" className="ml-1 bg-primary text-primary-foreground text-xs px-1.5 py-0">
                  {selectedProductIds.length} selecionado{selectedProductIds.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </TabsTrigger>

            <TabsTrigger value="ads" className="gap-2 font-bold px-6">
              <Megaphone className="h-4 w-4" />
              Anúncios ({filteredAds.length})
              {selectedProductIds.length > 0 && (
                <Badge variant="secondary" className="ml-1 bg-amber-500 text-white text-xs px-1.5 py-0">
                  Filtrado ({selectedProductIds.length})
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Banner Rápido de Contexto */}
          {selectedProductIds.length > 0 && (
            <div className="hidden sm:flex items-center gap-2 text-xs bg-amber-500/10 border border-amber-500/30 text-amber-800 dark:text-amber-300 px-3 py-1.5 rounded-md font-medium">
              <span>🎯 Filtrando anúncios por <strong>{selectedProductIds.length} produto(s)</strong></span>
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setSelectedProductIds([])}
                className="h-5 px-1.5 text-xs text-amber-800 dark:text-amber-300 hover:bg-amber-500/20"
              >
                <X className="h-3 w-3 mr-1" /> Limpar Filtro
              </Button>
            </div>
          )}
        </div>

        {/* ── ABA 1: PRODUTOS (PRODUCE TABLE) ─────────────────────────────────── */}
        <TabsContent value="products" className="space-y-4 m-0">
          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome do produto ou SKU..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <Select value={productStatusFilter} onValueChange={setProductStatusFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Status</SelectItem>
                      <SelectItem value="active">Ativos</SelectItem>
                      <SelectItem value="inactive">Inativos</SelectItem>
                    </SelectContent>
                  </Select>

                  {selectedProductIds.length > 0 && (
                    <Button 
                      variant="outline" 
                      onClick={() => setActiveTab('ads')}
                      className="gap-2 border-primary text-primary hover:bg-primary/5"
                    >
                      Ver Anúncios dos Selecionados ({selectedProductIds.length}) <ArrowRight className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>

              {/* Tabela Gerencial Densa de Produtos */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={selectedProductIds.length > 0 && selectedProductIds.length === filteredProducts.length}
                          onCheckedChange={toggleSelectAllProducts}
                        />
                      </TableHead>
                      <TableHead className="w-14 text-center">Ativo</TableHead>
                      <TableHead>Produto</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead>Marketplace</TableHead>
                      <TableHead className="text-right">Preço-base</TableHead>
                      <TableHead className="text-right">Preço Sugerido</TableHead>
                      <TableHead className="text-right">Seu Preço</TableHead>
                      <TableHead className="text-center">Estoque</TableHead>
                      <TableHead className="text-center">Anúncios</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {productsLoading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando catálogo de produtos...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12 text-muted-foreground">
                          Nenhum produto encontrado.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product: any) => {
                        const isSelected = selectedProductIds.includes(product.id);
                        const adsCount = product.ml_listing_variants?.length || 0;

                        return (
                          <TableRow 
                            key={product.id} 
                            className={`hover:bg-muted/50 transition-colors ${isSelected ? 'bg-muted/60' : ''}`}
                          >
                            {/* Checkbox */}
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectProduct(product.id)}
                              />
                            </TableCell>

                            {/* Toggle Ativo/Inativo (Pai) */}
                            <TableCell className="text-center">
                              <Switch
                                checked={!!product.active}
                                onCheckedChange={(checked) => 
                                  toggleProductActiveMutation.mutate({ productId: product.id, newActive: checked })
                                }
                              />
                            </TableCell>

                            {/* Produto (Foto + Nome) */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={product.main_image_url || product.image_url || '/placeholder.svg'}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-md object-cover border bg-muted"
                                />
                                <div>
                                  <h4 className="font-semibold text-sm text-foreground line-clamp-1">{product.name}</h4>
                                  <span className="text-xs text-muted-foreground">{product.categories?.name || 'Geral'}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* SKU */}
                            <TableCell className="font-mono text-xs text-muted-foreground">
                              {product.sku || 'N/A'}
                            </TableCell>

                            {/* Marketplace */}
                            <TableCell>
                              <div className="flex items-center gap-1 text-xs">
                                <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">
                                  Mercado Livre
                                </Badge>
                              </div>
                            </TableCell>

                            {/* Preço-base (Custo) */}
                            <TableCell className="text-right font-medium text-muted-foreground">
                              {formatPrice(product.cost_price || product.price)}
                            </TableCell>

                            {/* Preço Sugerido */}
                            <TableCell className="text-right font-semibold text-emerald-600">
                              {formatPrice(product.suggested_price || product.price)}
                            </TableCell>

                            {/* Seu Preço */}
                            <TableCell className="text-right font-bold text-foreground">
                              {formatPrice(product.price)}
                            </TableCell>

                            {/* Estoque */}
                            <TableCell className="text-center font-bold">
                              <span className={Number(product.stock_quantity || 0) <= 10 ? 'text-red-500' : 'text-foreground'}>
                                {product.stock_quantity ?? 0}
                              </span>
                            </TableCell>

                            {/* Anúncios Vinculados */}
                            <TableCell className="text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleViewAdsForProduct(product.id)}
                                className="h-7 text-xs font-bold text-primary hover:bg-primary/10"
                              >
                                {adsCount} anúncio{adsCount !== 1 ? 's' : ''}
                              </Button>
                            </TableCell>

                            {/* Status */}
                            <TableCell className="text-center">
                              <Badge variant={product.active ? 'default' : 'secondary'}>
                                {product.active ? 'Ativo' : 'Inativo'}
                              </Badge>
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Ações do Produto</DropdownMenuLabel>
                                  <DropdownMenuItem onClick={() => handleViewAdsForProduct(product.id)}>
                                    <Megaphone className="h-4 w-4 mr-2 text-primary" /> Ver Anúncios Vinculados
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => onEditProduct?.(product)}>
                                    <Edit3 className="h-4 w-4 mr-2" /> Editar Produto
                                  </DropdownMenuItem>
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
        </TabsContent>

        {/* ── ABA 2: ANÚNCIOS (ADS TABLE) ─────────────────────────────────────── */}
        <TabsContent value="ads" className="space-y-4 m-0">
          {/* BANNER DE CONTEXTO DO META ADS DA ABA ANÚNCIOS */}
          <div className="bg-card border rounded-lg p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 text-primary rounded-lg">
                <Megaphone className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-foreground">
                  {selectedProductIds.length > 0 
                    ? `Exibindo Anúncios de ${selectedProductIds.length} Produto(s) Selecionado(s)` 
                    : 'Exibindo Todos os Anúncios da Loja'}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedProductIds.length > 0 
                    ? 'A listagem está filtrada pelo contexto da seleção feita na aba Produtos.' 
                    : 'Nenhum produto selecionado na aba Produtos. Mostrando o catálogo completo de anúncios.'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {selectedProductIds.length > 0 && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setSelectedProductIds([])}
                  className="text-xs"
                >
                  <X className="h-3.5 w-3.5 mr-1" /> Exibir Todos os Anúncios
                </Button>
              )}

              {selectedAdIds.length >= 1 && (
                <Button
                  size="sm"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5"
                  onClick={() => setShowAiModal(true)}
                >
                  <Sparkles className="h-3.5 w-3.5" /> Gerar Variações por IA ({selectedAdIds.length})
                </Button>
              )}
            </div>
          </div>

          <Card>
            <CardContent className="p-4 space-y-4">
              <div className="flex flex-col sm:flex-row gap-4 justify-between items-center">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nome interno, título, produto..."
                    value={adSearch}
                    onChange={(e) => setAdSearch(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex flex-wrap gap-2 items-center">
                  <Select value={adMarketplaceFilter} onValueChange={setAdMarketplaceFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Marketplace" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos os Canais</SelectItem>
                      <SelectItem value="mercadolivre">Mercado Livre</SelectItem>
                      <SelectItem value="shopee">Shopee</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={adOriginFilter} onValueChange={setAdOriginFilter}>
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="Origem" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas Origens</SelectItem>
                      <SelectItem value="super_admin">Superadmin</SelectItem>
                      <SelectItem value="supplier">Fornecedor</SelectItem>
                      <SelectItem value="reseller">Vendedor</SelectItem>
                      <SelectItem value="ai_generated">Gerado por IA</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={adStatusFilter} onValueChange={setAdStatusFilter}>
                    <SelectTrigger className="w-32">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todos Status</SelectItem>
                      <SelectItem value="published">Ativo</SelectItem>
                      <SelectItem value="paused">Pausado</SelectItem>
                      <SelectItem value="draft">Rascunho</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Tabela Gerencial Densa de Anúncios */}
              <div className="border rounded-lg overflow-x-auto">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead className="w-10 text-center">
                        <Checkbox
                          checked={selectedAdIds.length > 0 && selectedAdIds.length === filteredAds.length}
                          onCheckedChange={toggleSelectAllAds}
                        />
                      </TableHead>
                      <TableHead className="w-14 text-center">Ativo</TableHead>
                      <TableHead>Nome Interno do Anúncio</TableHead>
                      <TableHead>Produto Vinculado</TableHead>
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
                        <TableCell colSpan={11} className="text-center py-8">
                          <div className="animate-spin h-6 w-6 border-2 border-primary border-t-transparent rounded-full mx-auto" />
                          <p className="text-sm text-muted-foreground mt-2">Carregando anúncios vinculados...</p>
                        </TableCell>
                      </TableRow>
                    ) : filteredAds.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12 text-muted-foreground">
                          Nenhum anúncio encontrado com os filtros selecionados.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAds.map((ad: any) => {
                        const isSelected = selectedAdIds.includes(ad.id);
                        const parentProductActive = ad.product ? ad.product.active !== false : true;
                        const originInfo = ORIGIN_BADGES[ad.origin_type || 'reseller'] || ORIGIN_BADGES.reseller;
                        const statusInfo = STATUS_BADGES[ad.status || 'draft'] || STATUS_BADGES.draft;

                        return (
                          <TableRow key={ad.id} className={isSelected ? 'bg-muted/60' : ''}>
                            {/* Checkbox */}
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectAd(ad.id)}
                              />
                            </TableCell>

                            {/* Toggle Ativo/Pausado (Filho) */}
                            <TableCell className="text-center">
                              <Switch
                                disabled={!parentProductActive}
                                checked={ad.status === 'published'}
                                onCheckedChange={(checked) => 
                                  toggleAdStatusMutation.mutate({ adId: ad.id, newStatus: checked ? 'published' : 'paused' })
                                }
                              />
                            </TableCell>

                            {/* Nome Interno do Anúncio */}
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

                            {/* Produto Vinculado */}
                            <TableCell>
                              <div className="flex items-center gap-2 text-xs">
                                <img
                                  src={ad.product?.main_image_url || ad.product?.image_url || '/placeholder.svg'}
                                  alt=""
                                  className="w-7 h-7 rounded object-cover border"
                                />
                                <span className="max-w-[140px] truncate font-medium">{ad.product?.name || 'Produto Base'}</span>
                              </div>
                            </TableCell>

                            {/* Origem */}
                            <TableCell>
                              <Badge className={originInfo.className}>
                                {originInfo.label}
                              </Badge>
                            </TableCell>

                            {/* Marketplace */}
                            <TableCell className="text-xs font-medium">
                              Mercado Livre
                            </TableCell>

                            {/* Título Público */}
                            <TableCell className="max-w-xs truncate text-xs text-muted-foreground" title={ad.variant_title}>
                              {ad.variant_title}
                            </TableCell>

                            {/* Preço de Venda */}
                            <TableCell className="text-right font-bold text-foreground">
                              {formatPrice(ad.price)}
                            </TableCell>

                            {/* Performance */}
                            <TableCell className="text-center text-xs">
                              <div>👁️ {ad.visits || 0} visitas</div>
                              <strong className="text-emerald-600">🛒 {ad.sales || 0} vendas</strong>
                            </TableCell>

                            {/* Status (Herdado do Pai se produto inativo!) */}
                            <TableCell className="text-center">
                              {!parentProductActive ? (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  Pausado (Produto Inativo)
                                </Badge>
                              ) : (
                                <Badge variant="outline" className={statusInfo.className}>
                                  {statusInfo.label}
                                </Badge>
                              )}
                            </TableCell>

                            {/* Ações */}
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
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
        </TabsContent>
      </Tabs>

      {/* MODAL DE ANÚNCIO VINCULADO */}
      <Dialog open={showAdFormModal} onOpenChange={setShowAdFormModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editingAd ? 'Editar Anúncio' : 'Novo Anúncio Vinculado'}</DialogTitle>
            <DialogDescription>
              Preencha os detalhes do anúncio diretamente vinculado ao produto.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {!editingAd && (
              <div>
                <label className="text-xs font-semibold block mb-1">Selecione o Produto Pai</label>
                <Select value={targetProductIdForNewAd} onValueChange={setTargetProductIdForNewAd}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o Produto" />
                  </SelectTrigger>
                  <SelectContent>
                    {products.map((p: any) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.sku || 'Sem SKU'})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-xs font-semibold block mb-1">Nome Interno do Anúncio (Obrigatório / Lojafy)</label>
              <Input
                placeholder="Ex: Anúncio Teste Imagem 2"
                value={adFormName}
                onChange={(e) => setAdFormName(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Título Público do Anúncio (Máx 60 chars ML)</label>
              <Input
                maxLength={60}
                placeholder="Ex: Mini Impressora Bluetooth"
                value={adFormTitle}
                onChange={(e) => setAdFormTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-semibold block mb-1">Preço de Venda (R$)</label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={adFormPrice}
                onChange={(e) => setAdFormPrice(e.target.value)}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAdFormModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveAdForm}>Salvar Anúncio</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* MODAL IA E HISTÓRICO */}
      <AiVariationModal
        open={showAiModal}
        onOpenChange={setShowAiModal}
        productId={selectedProductIds[0] || (products[0]?.id || '')}
        selectedAds={ads.filter((a: any) => selectedAdIds.includes(a.id))}
        onSuccess={() => {
          setSelectedAdIds([]);
          refetchAds();
        }}
      />

      <AdHistoryModal
        open={showHistoryModal}
        onOpenChange={setShowHistoryModal}
        adId={historyTargetId}
      />
    </div>
  );
};
