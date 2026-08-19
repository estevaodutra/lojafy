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
  TrendingUp, DollarSign, ShoppingBag, X, RefreshCw, Layers, CheckCircle2, ArrowRight,
  Send, Loader2, ChevronDown
} from 'lucide-react';
import { AiVariationModal } from './AiVariationModal';
import { AdHistoryModal } from './AdHistoryModal';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

interface MetaAdsManagerViewProps {
  roleMode?: 'admin' | 'supplier' | 'reseller';
  onNavigateToCreateProduct?: () => void;
  onEditProduct?: (product: any) => void;
}

const ORIGIN_BADGES: Record<string, { label: string; className: string }> = {
  official: { label: 'Modelo Oficial', className: 'bg-indigo-600 text-white font-semibold' },
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

  // Filtros e Paginação da Aba Produtos
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState('all');
  const [productPage, setProductPage] = useState(1);
  const [productItemsPerPage, setProductItemsPerPage] = useState(25);

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

  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization?.id;

  const { isProductPublished, publishProduct, publishProductAsync } = useMercadoLivreIntegration();
  const [isBatchPublishing, setIsBatchPublishing] = useState(false);
  const [batchPublishProgress, setBatchPublishProgress] = useState({ current: 0, total: 0 });

  const handleBatchPublishMl = async (onlyUnpublished = true) => {
    if (selectedProductIds.length === 0) {
      toast({ title: 'Selecione pelo menos um produto para publicar.' });
      return;
    }
    
    const targetProducts = products.filter((p: any) => selectedProductIds.includes(p.id));
    const toPublish = onlyUnpublished 
      ? targetProducts.filter((p: any) => !isProductPublished(p.id))
      : targetProducts;

    if (toPublish.length === 0) {
      toast({ title: 'Todos os produtos selecionados já estão publicados no Mercado Livre!' });
      return;
    }

    setIsBatchPublishing(true);
    setBatchPublishProgress({ current: 0, total: toPublish.length });

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < toPublish.length; i++) {
      const prod = toPublish[i];
      setBatchPublishProgress({ current: i + 1, total: toPublish.length });
      try {
        await publishProductAsync(prod.id);
        successCount++;
      } catch (err: any) {
        console.error(`Erro ao publicar produto ${prod.name}:`, err);
        failCount++;
      }
    }

    setIsBatchPublishing(false);
    refetchProducts();
    refetchAds();

    if (failCount === 0) {
      toast({ title: `🚀 ${successCount} produto(s) publicado(s) com sucesso no Mercado Livre!` });
    } else {
      toast({ 
        variant: failCount === toPublish.length ? 'destructive' : 'default',
        title: `Publicação em lote concluída`, 
        description: `${successCount} publicado(s) com sucesso, ${failCount} falhou.` 
      });
    }
  };

  const handleSinglePublishMl = async (productId: string) => {
    if (!productId) {
      toast({ variant: 'destructive', title: 'ID do produto não encontrado.' });
      return;
    }
    try {
      toast({ title: 'Publicando produto no Mercado Livre...' });
      await publishProductAsync(productId);
      toast({ title: '🚀 Produto publicado com sucesso no Mercado Livre!' });
      refetchProducts();
      refetchAds();
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Erro ao publicar no Mercado Livre', description: err.message });
    }
  };

  const formatPrice = (val: number | null | undefined) => {
    if (val === null || val === undefined) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(val));
  };

  // ── MUTAÇÕES ───────────────────────────────────────────────────────────
  const bulkUpdateCategory = useMutation({
    mutationFn: async (categoryId: string) => {
      if (selectedProductIds.length === 0) return;
      const { error } = await supabase.from('products').update({ category_id: categoryId }).in('id', selectedProductIds);
      if (error) throw error;
      return selectedProductIds.length;
    },
    onSuccess: (count) => {
      toast({ title: 'Sucesso!', description: `${count} produtos atualizados.` });
      refetchProducts();
      setSelectedProductIds([]);
    },
    onError: (err: any) => {
      toast({ title: 'Erro ao atualizar', description: err.message, variant: 'destructive' });
    }
  });

  // ── BUSCA DE DADOS: Produtos ───────────────────────────────────────────
  const { data: categories = [] } = useQuery({
    queryKey: ['meta-ads-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (error) throw error;
      return data;
    }
  });

  // 1. QUERY DE PRODUTOS
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['meta-ads-products', roleMode, user?.id, orgId],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories!category_id (
            id,
            name,
            slug
          )
        `)
        .order('created_at', { ascending: false });

      if (roleMode === 'supplier' && orgId) {
        query = query.eq('supplier_organization_id', orgId);
      } else if (roleMode === 'reseller') {
        query = query.eq('active', true);
      }

      const { data, error } = await query;
      if (error) {
        console.error('Erro na busca de produtos:', error);
        throw error;
      }
      return data ?? [];
    },
    enabled: !!user?.id && (roleMode !== 'supplier' || !!orgId),
  });

  // 2. QUERY DE ANÚNCIOS
  const { data: ads = [], isLoading: adsLoading, refetch: refetchAds } = useQuery({
    queryKey: ['meta-ads-ads', roleMode, user?.id, orgId],
    queryFn: async () => {
      try {
        const { data, error } = await supabase
          .from('ml_listing_variants')
          .select(`
            *,
            product:products(*)
          `)
          .order('created_at', { ascending: false });

        if (error) {
          console.warn('Erro na busca de anúncios em ml_listing_variants:', error);
          return [];
        }

        let result = data ?? [];

        // Filtro em memória seguro por perfil
        if (roleMode === 'reseller' && user?.id) {
          result = result.filter((item: any) => item.is_official_model || item.user_id === user.id);
        } else if (roleMode === 'supplier' && user?.id) {
          const prodIds = new Set(products.map((p: any) => p.id));
          result = result.filter((item: any) => 
            item.is_official_model || 
            item.user_id === user.id || 
            (item.product_id && prodIds.has(item.product_id))
          );
        }

        return result;
      } catch (e) {
        console.warn('Exceção na busca de anúncios:', e);
        return [];
      }
    },
    enabled: !!user?.id,
  });

  // COMBINAÇÃO DE ANÚNCIOS: Cada produto gera por padrão o seu 1º Anúncio Principal (Modelo Oficial) + variações de ml_listing_variants!
  const effectiveAds = React.useMemo(() => {
    const combined: any[] = [...ads];

    // Para cada produto cadastrado, garante que existe pelo menos o 1º Anúncio Principal (Modelo Oficial)
    products.forEach((prod: any) => {
      const hasBaseAd = ads.some((ad: any) => ad.product_id === prod.id && (ad.is_official_model || ad.origin_type === 'official'));
      if (!hasBaseAd) {
        combined.unshift({
          id: `official-base-${prod.id}`,
          product_id: prod.id,
          product: prod,
          internal_name: `${prod.name} (Anúncio Principal)`,
          variant_title: prod.name,
          price: prod.price || prod.cost_price || 0,
          status: prod.active !== false ? 'published' : 'paused',
          origin_type: 'official',
          is_official_model: true,
          marketplace: 'mercadolivre',
          visits: 0,
          sales: 0,
          created_at: prod.created_at || new Date().toISOString(),
          is_synthesized: true
        });
      }
    });

    return combined;
  }, [products, ads]);

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
    mutationFn: async ({ ad, newStatus }: { ad: any; newStatus: string }) => {
      if (ad.is_synthesized) {
        const { error } = await supabase
          .from('ml_listing_variants')
          .insert({
            product_id: ad.product_id,
            user_id: user?.id,
            internal_name: ad.internal_name,
            variant_title: ad.variant_title,
            price: ad.price,
            status: newStatus,
            origin_type: 'official',
            is_official_model: true,
            marketplace: ad.marketplace || 'mercadolivre',
          });
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('ml_listing_variants')
          .update({ status: newStatus })
          .eq('id', ad.id);
        if (error) throw error;
      }
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

  // PAGINAÇÃO DA TABELA PRODUTOS
  const productTotalPages = Math.ceil(filteredProducts.length / productItemsPerPage);
  const productStartIndex = (productPage - 1) * productItemsPerPage;
  const paginatedProducts = filteredProducts.slice(productStartIndex, productStartIndex + productItemsPerPage);

  // FILTRAGEM DA TABELA ANÚNCIOS (Com base nos produtos selecionados ou GLOBAL!)
  const filteredAds = effectiveAds.filter((ad: any) => {
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
    const matchesOrigin = adOriginFilter === 'all' || (ad.origin_type || 'official') === adOriginFilter;
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

  const [isSyncingMl, setIsSyncingMl] = useState(false);

  const handleSyncMlPerformance = async () => {
    setIsSyncingMl(true);
    try {
      let syncedCount = 0;
      for (const ad of effectiveAds) {
        if (!ad.ml_item_id) continue;
        
        try {
          // 1. Vendas e status
          const { data: itemRes } = await supabase.functions.invoke('ml-proxy', {
            body: { ml_path: `/items/${ad.ml_item_id}`, method: 'GET' }
          });
          
          // 2. Visitas reais usando a API oficial do Mercado Livre (/visits/items?ids=MLB...)
          const { data: visitsRes } = await supabase.functions.invoke('ml-proxy', {
            body: { ml_path: `/visits/items?ids=${ad.ml_item_id}`, method: 'GET' }
          });

          let realVisits = 0;
          if (visitsRes?.data && visitsRes.data[ad.ml_item_id] !== undefined) {
            realVisits = Number(visitsRes.data[ad.ml_item_id]) || 0;
          }

          const soldQuantity = itemRes?.data?.sold_quantity ?? 0;
          const status = itemRes?.data?.status === 'active' ? 'published' : itemRes?.data?.status === 'paused' ? 'paused' : 'closed';

          if (!ad.is_synthesized && ad.id) {
            await supabase
              .from('ml_listing_variants')
              .update({
                visits: realVisits,
                sales: soldQuantity,
                status,
                last_synced_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .eq('id', ad.id);
          }

          syncedCount++;
        } catch (err) {
          console.warn(`Erro ao sincronizar anúncio ${ad.ml_item_id}:`, err);
        }
      }
      refetchAds();
      toast({ title: `Estatísticas reais do ML sincronizadas para ${syncedCount} anúncio(s)!` });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Erro na sincronização', description: e.message });
    } finally {
      setIsSyncingMl(false);
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

        <div className="flex items-center gap-2 flex-wrap">
          {activeTab === 'products' ? (
            <Button onClick={() => onNavigateToCreateProduct?.()} className="gap-2">
              <Plus className="h-4 w-4" />
              Novo Produto
            </Button>
          ) : (
            <>
              <Button
                variant="outline"
                onClick={handleSyncMlPerformance}
                disabled={isSyncingMl}
                className="gap-2 text-emerald-700 border-emerald-300 hover:bg-emerald-50 shadow-sm"
              >
                <RefreshCw className={`h-4 w-4 ${isSyncingMl ? 'animate-spin' : ''}`} />
                {isSyncingMl ? 'Sincronizando ML...' : 'Sincronizar Performance ML'}
              </Button>
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
            </>
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="gap-2">
                            <Layers className="h-4 w-4" />
                            Atribuir Categoria
                            <ChevronDown className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-y-auto">
                          <DropdownMenuLabel>Selecione a Categoria</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {categories.length === 0 && (
                            <div className="p-2 text-sm text-muted-foreground text-center">Nenhuma categoria criada</div>
                          )}
                          {categories.map((cat: any) => (
                            <DropdownMenuItem key={cat.id} onClick={() => bulkUpdateCategory.mutate(cat.id)}>
                              {cat.name}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            disabled={isBatchPublishing}
                            className="gap-2 bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold shadow-sm"
                          >
                            {isBatchPublishing ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" />
                                Publicando ({batchPublishProgress.current}/{batchPublishProgress.total})...
                              </>
                            ) : (
                              <>
                                <img 
                                  src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" 
                                  alt="" 
                                  className="h-4 w-auto object-contain" 
                                />
                                Publicar no Mercado Livre ({selectedProductIds.length})
                                <ChevronDown className="h-4 w-4" />
                              </>
                            )}
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-64">
                          <DropdownMenuLabel>Ações no Mercado Livre</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => handleBatchPublishMl(true)}>
                            <Send className="h-4 w-4 mr-2 text-amber-600" />
                            Publicar produtos não integrados
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleBatchPublishMl(false)}>
                            <Sparkles className="h-4 w-4 mr-2 text-amber-600" />
                            Publicar todos os selecionados
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>

                      <Button 
                        variant="outline" 
                        onClick={() => setActiveTab('ads')}
                        className="gap-2 border-primary text-primary hover:bg-primary/5"
                      >
                        Ver Anúncios dos Selecionados ({selectedProductIds.length}) <ArrowRight className="h-4 w-4" />
                      </Button>
                    </div>
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
                      paginatedProducts.map((product: any) => {
                        const isSelected = selectedProductIds.includes(product.id);
                        const adsCount = ads.filter((ad: any) => ad.product_id === product.id || ad.product?.id === product.id).length;

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

                            {/* Produto (Foto + Nome) */}
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <img
                                  src={product.main_image_url || product.image_url || '/placeholder.svg'}
                                  alt={product.name}
                                  className="w-10 h-10 rounded-md object-cover border bg-muted"
                                />
                                <div>
                                  <p className="font-semibold text-sm max-w-[200px] truncate" title={product.name}>
                                    {product.name}
                                  </p>
                                  <span className="text-xs text-muted-foreground">{product.categories?.name || 'Geral'}</span>
                                </div>
                              </div>
                            </TableCell>

                            {/* SKU */}
                            <TableCell className="text-xs text-muted-foreground">{product.sku || '-'}</TableCell>

                            {/* Marketplace */}
                            <TableCell>
                              <img src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png" alt="ML" className="h-4 object-contain" />
                            </TableCell>

                            {/* Preço-base (Custo) */}
                            <TableCell className="text-right font-medium text-xs">
                              {formatPrice(product.cost_price || product.price)}
                            </TableCell>

                            {/* Preço Sugerido */}
                            <TableCell className="text-right font-semibold text-xs text-emerald-600">
                              {formatPrice(product.suggested_price || product.price)}
                            </TableCell>

                            {/* Seu Preço */}
                            <TableCell className="text-right font-bold text-sm">
                              {formatPrice(product.price)}
                            </TableCell>

                            {/* Estoque */}
                            <TableCell className="text-center font-medium">
                              {product.stock_quantity ?? 0}
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
                            <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                              <Select
                                value={product.approval_status === 'draft' ? 'draft' : (product.active ? 'active' : 'inactive')}
                                onValueChange={async (val) => {
                                  try {
                                    let active = product.active;
                                    let approval_status = product.approval_status;

                                    if (val === 'active') {
                                      active = true;
                                      approval_status = 'approved';
                                    } else if (val === 'inactive') {
                                      active = false;
                                      approval_status = 'approved'; 
                                    } else if (val === 'draft') {
                                      active = false;
                                      approval_status = 'draft';
                                    }

                                    const { error } = await supabase
                                      .from('products')
                                      .update({ active, approval_status, updated_at: new Date().toISOString() })
                                      .eq('id', product.id);

                                    if (error) throw error;
                                    
                                    toast({ title: `Status alterado com sucesso!` });
                                    refetchProducts();

                                    if (val === 'active' && roleMode !== 'supplier') {
                                      handleSinglePublishMl(product.id);
                                    }
                                  } catch (e: any) {
                                    toast({ variant: 'destructive', title: 'Erro ao alterar status', description: e.message });
                                  }
                                }}
                              >
                                <SelectTrigger className="w-[110px] h-8 text-xs mx-auto">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="active">Ativo</SelectItem>
                                  <SelectItem value="inactive">Inativos</SelectItem>
                                  <SelectItem value="draft">Rascunho</SelectItem>
                                </SelectContent>
                              </Select>
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
                                  <DropdownMenuItem onClick={() => handleSinglePublishMl(product.id)}>
                                    <Send className="h-4 w-4 mr-2 text-amber-600" /> 
                                    {isProductPublished(product.id) ? 'Republicar no Mercado Livre' : 'Publicar no Mercado Livre'}
                                  </DropdownMenuItem>
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

              {/* FOOTER DE PAGINAÇÃO */}
              {!productsLoading && filteredProducts.length > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Itens por página:</span>
                    <Select 
                      value={productItemsPerPage.toString()} 
                      onValueChange={(val) => { 
                        setProductItemsPerPage(Number(val)); 
                        setProductPage(1); 
                      }}
                    >
                      <SelectTrigger className="w-[80px]">
                        <SelectValue placeholder="25" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="25">25</SelectItem>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-muted-foreground">
                      Página {productPage} de {productTotalPages || 1}
                    </span>
                    <div className="flex gap-1">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setProductPage(prev => Math.max(1, prev - 1))} 
                        disabled={productPage === 1}
                      >
                        Anterior
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setProductPage(prev => Math.min(productTotalPages, prev + 1))} 
                        disabled={productPage === productTotalPages || productTotalPages === 0}
                      >
                        Próxima
                      </Button>
                    </div>
                  </div>
                </div>
              )}
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
                      <TableHead className="w-12 text-center">Foto</TableHead>
                      <TableHead>Nome Interno do Anúncio</TableHead>
                      <TableHead>SKU</TableHead>
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
                          <div className="flex flex-col items-center justify-center space-y-3">
                            <p className="text-sm font-medium">Nenhum anúncio encontrado para o filtro atual.</p>
                            {selectedProductIds.length > 0 ? (
                              <Button
                                size="sm"
                                onClick={() => setShowAiModal(true)}
                                className="gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow"
                              >
                                <Sparkles className="h-4 w-4" />
                                Gerar Anúncios com IA para os {selectedProductIds.length} produto(s) selecionado(s)
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingAd(null);
                                  setTargetProductIdForNewAd('');
                                  setAdFormName('');
                                  setAdFormTitle('');
                                  setAdFormPrice('');
                                  setAdFormDesc('');
                                  setShowAdFormModal(true);
                                }}
                                className="gap-2"
                              >
                                <Plus className="h-4 w-4" />
                                Criar Novo Anúncio
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAds.map((ad: any) => {
                        const isSelected = selectedAdIds.includes(ad.id);
                        const parentProductActive = ad.product ? ad.product.active !== false : true;
                        const statusInfo = STATUS_BADGES[ad.status || 'draft'] || STATUS_BADGES.draft || { label: 'Pausado', className: 'bg-amber-100 text-amber-800' };

                        return (
                          <TableRow key={ad.id} className={isSelected ? 'bg-muted/60' : ''}>
                            {/* 1. Checkbox */}
                            <TableCell className="text-center">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => toggleSelectAd(ad.id)}
                              />
                            </TableCell>

                            {/* 2. Toggle Ativo/Pausado (Filho) */}
                            <TableCell className="text-center">
                              <Switch
                                disabled={!parentProductActive}
                                checked={ad.status === 'published'}
                                onCheckedChange={(checked) => 
                                  toggleAdStatusMutation.mutate({ ad, newStatus: checked ? 'published' : 'paused' })
                                }
                              />
                            </TableCell>

                            {/* 3. Miniatura entre Ativo e Nome Interno */}
                            <TableCell className="text-center">
                              {ad.product?.main_image_url || ad.product?.image_url ? (
                                <img
                                  src={ad.product.main_image_url || ad.product.image_url}
                                  alt=""
                                  className="w-9 h-9 rounded object-cover border mx-auto"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Sem+Foto';
                                  }}
                                />
                              ) : (
                                <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-[9px] text-muted-foreground select-none mx-auto border">
                                  Sem Foto
                                </div>
                              )}
                            </TableCell>

                            {/* 4. Nome Interno do Anúncio (Com ícone discreto de Estrela ⭐ para Modelo Oficial) */}
                            <TableCell className="font-semibold text-foreground">
                              <div className="flex items-center gap-1.5">
                                <span>{ad.internal_name || ad.variant_title}</span>
                                {ad.is_official_model && (
                                  <span title="Modelo Oficial ⭐" className="text-amber-500 text-sm select-none" role="img" aria-label="Modelo Oficial">⭐</span>
                                )}
                              </div>
                            </TableCell>

                            {/* 5. SKU do Produto */}
                            <TableCell className="font-mono text-xs text-foreground font-semibold">
                              {ad.product?.sku || '—'}
                            </TableCell>

                            {/* Marketplace */}
                            <TableCell className="text-center">
                              {ad.ml_item_id || ad.permalink || isProductPublished(ad.product_id || ad.product?.id) ? (
                                <img
                                  src="https://http2.mlstatic.com/static/org-img/homesnw/mercado-libre.png"
                                  alt="Mercado Livre"
                                  className="h-5 w-auto object-contain mx-auto"
                                  title="Integrado com Mercado Livre"
                                />
                              ) : null}
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
                                  <DropdownMenuItem onClick={() => handleSinglePublishMl(ad.product_id || ad.product?.id)}>
                                    <Send className="h-4 w-4 mr-2 text-amber-600" /> Publicar Anúncio no Mercado Livre
                                  </DropdownMenuItem>
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
