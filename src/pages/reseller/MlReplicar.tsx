import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Plus, Trash2, Send, RefreshCw, ExternalLink,
  Copy, TrendingUp, Eye, ShoppingBag, Pause, Play,
  Search, ChevronDown
} from 'lucide-react';
import { useMlVariants, type MlVariant } from '@/hooks/useMlVariants';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const STATUS_CONFIG = {
  draft:     { label: 'Rascunho',  color: 'bg-gray-100 text-gray-600' },
  published: { label: 'Publicado', color: 'bg-green-100 text-green-700' },
  paused:    { label: 'Pausado',   color: 'bg-amber-100 text-amber-700' },
  closed:    { label: 'Encerrado', color: 'bg-red-100 text-red-700' },
};

// ── Busca de produto ──────────────────────────────────────────────────────────

function ProductPicker({ onSelect }: { onSelect: (p: any) => void }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const { data: products = [], isLoading } = useQuery({
    queryKey: ['reseller-products-for-replicate', user?.id, search],
    queryFn: async () => {
      if (!user?.id) return [];
      let q = supabase
        .from('reseller_products')
        .select('product_id, custom_price, product:products(id, name, main_image_url, price, description)')
        .eq('reseller_id', user.id)
        .eq('active', true)
        .limit(20);

      if (search) q = q.ilike('product.name', `%${search}%`);

      const { data } = await q;
      return (data ?? []).filter(d => d.product);
    },
    enabled: open,
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Selecionar produto
          <ChevronDown className="h-4 w-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <Input
          placeholder="Buscar produto..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="mb-2"
          autoFocus
        />
        {isLoading ? (
          <div className="space-y-1">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
        ) : products.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">Nenhum produto encontrado</p>
        ) : (
          <div className="space-y-1 max-h-60 overflow-y-auto">
            {products.map((p: any) => (
              <button
                key={p.product_id}
                className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left"
                onClick={() => { onSelect(p); setOpen(false); setSearch(''); }}
              >
                {p.product?.main_image_url ? (
                  <img src={p.product.main_image_url} className="w-10 h-10 object-cover rounded flex-shrink-0" alt="" />
                ) : (
                  <div className="w-10 h-10 bg-muted rounded flex-shrink-0 flex items-center justify-center">
                    <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                  </div>
                )}
                <div className="min-w-0">
                  <p className="text-sm font-medium line-clamp-1">{p.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    R$ {Number(p.custom_price ?? p.product?.price ?? 0).toFixed(2)}
                  </p>
                </div>
              </button>
            ))}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}

// ── Card de variante ──────────────────────────────────────────────────────────

function VariantCard({
  variant, baseTitle, baseDescription, basePrice,
  onPublish, onPause, onActivate, onDelete, onSync, isPublishing,
}: {
  variant: MlVariant;
  baseTitle: string;
  baseDescription: string;
  basePrice: number;
  onPublish: () => void;
  onPause: () => void;
  onActivate: () => void;
  onDelete: () => void;
  onSync: () => void;
  isPublishing: boolean;
}) {
  const st = STATUS_CONFIG[variant.status];
  const convRate = variant.visits > 0
    ? ((variant.sales / variant.visits) * 100).toFixed(1)
    : '—';

  return (
    <Card className={variant.status === 'published' ? 'border-green-300' : variant.status === 'draft' ? 'border-dashed' : ''}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-3">
          <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
          <div className="flex gap-1">
            {variant.status === 'published' && (
              <>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onSync}>
                  <RefreshCw className="h-3 w-3 mr-1" />Sync
                </Button>
                <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onPause}>
                  <Pause className="h-3 w-3 mr-1" />Pausar
                </Button>
              </>
            )}
            {variant.status === 'paused' && (
              <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={onActivate}>
                <Play className="h-3 w-3 mr-1" />Ativar
              </Button>
            )}
            {variant.permalink && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
                onClick={() => window.open(variant.permalink!, '_blank')}>
                <ExternalLink className="h-3 w-3" />
              </Button>
            )}
            {variant.status !== 'published' && (
              <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                onClick={onDelete}>
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {variant.status === 'published' && (
          <div className="flex gap-4 mb-3 text-sm">
            <div className="flex items-center gap-1 text-muted-foreground">
              <Eye className="h-3 w-3" />
              <span>{variant.visits} visitas</span>
            </div>
            <div className="flex items-center gap-1 text-muted-foreground">
              <ShoppingBag className="h-3 w-3" />
              <span>{variant.sales} vendas</span>
            </div>
            <div className="flex items-center gap-1 text-blue-600">
              <TrendingUp className="h-3 w-3" />
              <span>{convRate}% conv.</span>
            </div>
          </div>
        )}

        {/* Info da variante */}
        <p className="font-medium text-sm mb-1">{variant.variant_title}</p>
        {variant.variant_description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mb-1">{variant.variant_description}</p>
        )}
        {variant.price && (
          <p className="text-sm font-bold text-primary">R$ {variant.price.toFixed(2)}</p>
        )}

        {/* Botão publicar para draft */}
        {variant.status === 'draft' && (
          <Button size="sm" className="w-full mt-2 gap-1" onClick={onPublish} disabled={isPublishing}>
            <Send className="h-3 w-3" />
            {isPublishing ? 'Publicando...' : 'Publicar no ML'}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

// ── Formulário de nova variante ───────────────────────────────────────────────

function NewVariantForm({
  baseTitle, baseDescription, basePrice, productId,
  onCreated, onCancel,
}: {
  baseTitle: string;
  baseDescription: string;
  basePrice: number;
  productId: string;
  onCreated: () => void;
  onCancel: () => void;
}) {
  const { createVariant } = useMlVariants(productId);
  const [title, setTitle] = useState(baseTitle);
  const [description, setDescription] = useState(baseDescription);
  const [price, setPrice] = useState(String(basePrice));
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    if (!title.trim()) return;
    setSaving(true);
    await createVariant({
      product_id: productId,
      variant_title: title.trim().substring(0, 60),
      variant_description: description.trim() || undefined,
      price: parseFloat(price) || undefined,
    });
    setSaving(false);
    onCreated();
  }

  return (
    <Card className="border-primary/30 bg-primary/5">
      <CardContent className="p-4 space-y-3">
        <p className="text-sm font-medium">Nova variação</p>
        <div className="space-y-1">
          <Label className="text-xs">Título <span className="text-muted-foreground">({title.length}/60)</span></Label>
          <Input
            value={title}
            onChange={e => setTitle(e.target.value.slice(0, 60))}
            placeholder="Título do anúncio no ML"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Descrição</Label>
          <Textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Descrição customizada..."
            className="min-h-[80px] text-sm"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Preço (R$)</Label>
          <Input
            type="number"
            step="0.01"
            value={price}
            onChange={e => setPrice(e.target.value)}
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button size="sm" variant="outline" onClick={onCancel}>Cancelar</Button>
          <Button size="sm" disabled={!title.trim() || saving} onClick={handleSave}>
            {saving ? 'Salvando...' : 'Salvar variação'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlReplicar() {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const [selectedProduct, setSelectedProduct] = useState<any | null>(null);
  const [showNewForm, setShowNewForm] = useState(false);

  const { variants, isLoading, publishVariant, pauseVariant, activateVariant, deleteVariant, syncStats, publishAllDrafts, isPublishing, isPublishingAll } = useMlVariants(selectedProduct?.product_id);

  const draftVariants = variants.filter(v => v.status === 'draft');
  const publishedVariants = variants.filter(v => v.status === 'published');
  const pausedVariants = variants.filter(v => v.status === 'paused');

  if (!hasActiveIntegration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Copy className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para replicar anúncios.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>Conectar ML</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Copy className="h-6 w-6 text-yellow-500" />
          Replicar Anúncios ML
        </h1>
        <p className="text-muted-foreground text-sm">
          Crie múltiplas versões do mesmo produto com títulos diferentes e compare o desempenho
        </p>
      </div>

      {/* Selecionar produto */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Produto base</CardTitle>
          <CardDescription>Selecione o produto que deseja replicar</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <ProductPicker onSelect={setSelectedProduct} />
            {selectedProduct && (
              <div className="flex items-center gap-3 flex-1">
                {selectedProduct.product?.main_image_url && (
                  <img src={selectedProduct.product.main_image_url} className="w-12 h-12 rounded object-cover" alt="" />
                )}
                <div>
                  <p className="font-medium text-sm line-clamp-1">{selectedProduct.product?.name}</p>
                  <p className="text-xs text-muted-foreground">
                    Preço base: R$ {Number(selectedProduct.custom_price ?? selectedProduct.product?.price ?? 0).toFixed(2)}
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Variantes */}
      {selectedProduct && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-semibold">Variações</h2>
              <p className="text-xs text-muted-foreground">
                {publishedVariants.length} publicadas · {pausedVariants.length} pausadas · {draftVariants.length} rascunhos
              </p>
            </div>
            <div className="flex gap-2">
              {draftVariants.length > 0 && (
                <Button
                  size="sm"
                  variant="default"
                  className="gap-1"
                  disabled={isPublishingAll}
                  onClick={() => publishAllDrafts(draftVariants.map(v => v.id))}
                >
                  <Send className="h-3 w-3" />
                  {isPublishingAll ? 'Publicando...' : `Publicar ${draftVariants.length} rascunho(s)`}
                </Button>
              )}
              <Button size="sm" variant="outline" className="gap-1" onClick={() => setShowNewForm(true)}>
                <Plus className="h-3 w-3" />
                Nova variação
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-48 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Formulário de nova variante */}
              {showNewForm && (
                <NewVariantForm
                  baseTitle={selectedProduct.product?.name ?? ''}
                  baseDescription={selectedProduct.product?.description ?? ''}
                  basePrice={selectedProduct.custom_price ?? selectedProduct.product?.price ?? 0}
                  productId={selectedProduct.product_id}
                  onCreated={() => setShowNewForm(false)}
                  onCancel={() => setShowNewForm(false)}
                />
              )}

              {/* Cards existentes */}
              {variants.map(variant => (
                <VariantCard
                  key={variant.id}
                  variant={variant}
                  baseTitle={selectedProduct.product?.name ?? ''}
                  baseDescription={selectedProduct.product?.description ?? ''}
                  basePrice={selectedProduct.custom_price ?? selectedProduct.product?.price ?? 0}
                  isPublishing={isPublishing}
                  onPublish={() => publishVariant(variant.id)}
                  onPause={() => pauseVariant(variant.id)}
                  onActivate={() => activateVariant(variant.id)}
                  onDelete={() => deleteVariant(variant.id)}
                  onSync={() => syncStats(variant.id)}
                />
              ))}

              {/* Estado vazio */}
              {variants.length === 0 && !showNewForm && (
                <div className="col-span-full flex flex-col items-center justify-center py-12 text-muted-foreground border-2 border-dashed rounded-lg">
                  <Copy className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">Nenhuma variação criada ainda.</p>
                  <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => setShowNewForm(true)}>
                    <Plus className="h-3 w-3" />Criar primeira variação
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Comparação de performance */}
          {publishedVariants.length > 1 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  Comparação de Desempenho
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {[...publishedVariants]
                    .sort((a, b) => b.visits - a.visits)
                    .map((v, i) => {
                      const convRate = v.visits > 0 ? (v.sales / v.visits) * 100 : 0;
                      const maxVisits = Math.max(...publishedVariants.map(x => x.visits), 1);
                      return (
                        <div key={v.id} className="space-y-1">
                          <div className="flex items-center justify-between text-sm">
                            <span className="flex items-center gap-1">
                              {i === 0 && <span className="text-yellow-500 text-xs">🏆</span>}
                              <span className="line-clamp-1 max-w-xs">{v.variant_title}</span>
                            </span>
                            <span className="text-muted-foreground text-xs">
                              {v.visits} visitas · {v.sales} vendas · {convRate.toFixed(1)}%
                            </span>
                          </div>
                          <div className="h-2 bg-muted rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary rounded-full transition-all"
                              style={{ width: `${(v.visits / maxVisits) * 100}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
