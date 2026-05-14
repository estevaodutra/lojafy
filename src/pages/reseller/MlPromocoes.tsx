import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  Tag, Plus, RefreshCw, Play, Pause, X,
  ChevronDown, ChevronRight, ShoppingBag, Percent
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useMlPromotions, type MlPromotion, type MlPromotionItem } from '@/hooks/useMlPromotions';
import { useMlListings } from '@/hooks/useMlListings';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  started:   { label: 'Ativa',      color: 'bg-green-100 text-green-700' },
  paused:    { label: 'Pausada',    color: 'bg-amber-100 text-amber-700' },
  finished:  { label: 'Encerrada', color: 'bg-gray-100 text-gray-600' },
  candidate: { label: 'Pendente',  color: 'bg-blue-100 text-blue-700' },
};

// ── Modal criar promoção ──────────────────────────────────────────────────────

function CreatePromotionModal({
  open, onClose, onCreate,
}: {
  open: boolean; onClose: () => void;
  onCreate: (data: any) => Promise<void>;
}) {
  const [form, setForm] = useState({
    name: '',
    discount_value: '10',
    status: 'started',
    start_date: new Date().toISOString().split('T')[0],
    finish_date: new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(false);

  async function handleCreate() {
    if (!form.name.trim() || !form.discount_value) return;
    setLoading(true);
    await onCreate({
      name: form.name.trim(),
      type: 'PRICE_DISCOUNT',
      status: form.status as 'started' | 'paused',
      start_date: `${form.start_date}T00:00:00.000-03:00`,
      finish_date: `${form.finish_date}T23:59:59.000-03:00`,
      discount_type: 'PERCENTAGE',
      discount_value: parseFloat(form.discount_value),
    });
    setLoading(false);
    onClose();
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Nova Promoção</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Nome da promoção</Label>
            <Input placeholder="Ex: Liquidação de Maio" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Desconto (%)</Label>
              <Select value={form.discount_value} onValueChange={v => setForm(f => ({ ...f, discount_value: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {[5, 10, 15, 20, 25, 30, 40, 50].map(v => (
                    <SelectItem key={v} value={String(v)}>{v}%</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Status inicial</Label>
              <Select value={form.status} onValueChange={v => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="started">Ativar imediatamente</SelectItem>
                  <SelectItem value="paused">Salvar pausada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Data início</Label>
              <Input type="date" value={form.start_date}
                onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
            </div>
            <div className="space-y-1">
              <Label>Data fim</Label>
              <Input type="date" value={form.finish_date}
                onChange={e => setForm(f => ({ ...f, finish_date: e.target.value }))} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!form.name.trim() || loading} onClick={handleCreate}>
            {loading ? 'Criando...' : 'Criar Promoção'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Card de promoção expandível ───────────────────────────────────────────────

function PromotionCard({
  promotion, onStart, onPause, onFinish, addItem, removeItem, getItems, listings,
}: {
  promotion: MlPromotion;
  onStart: () => void;
  onPause: () => void;
  onFinish: () => void;
  addItem: (mlItemId: string, discount?: number) => Promise<void>;
  removeItem: (mlItemId: string) => Promise<void>;
  getItems: () => Promise<MlPromotionItem[]>;
  listings: any[];
}) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<MlPromotionItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [addingItem, setAddingItem] = useState(false);

  const st = STATUS_CONFIG[promotion.status] ?? { label: promotion.status, color: 'bg-gray-100 text-gray-600' };

  async function toggleOpen() {
    if (!open && items.length === 0) {
      setLoadingItems(true);
      const fetched = await getItems();
      setItems(fetched);
      setLoadingItems(false);
    }
    setOpen(o => !o);
  }

  async function handleAddItem(mlItemId: string) {
    setAddingItem(true);
    await addItem(mlItemId);
    const updated = await getItems();
    setItems(updated);
    setAddingItem(false);
  }

  async function handleRemoveItem(mlItemId: string) {
    await removeItem(mlItemId);
    setItems(prev => prev.filter(i => i.id !== mlItemId));
  }

  const startStr = promotion.start_date ? format(new Date(promotion.start_date), "dd/MM/yy", { locale: ptBR }) : '—';
  const endStr = promotion.finish_date ? format(new Date(promotion.finish_date), "dd/MM/yy", { locale: ptBR }) : '—';
  const itemIds = new Set(items.map(i => i.id));

  return (
    <Card>
      <Collapsible open={open} onOpenChange={toggleOpen}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer hover:bg-muted/30 rounded-t-lg transition-colors">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                {open ? <ChevronDown className="h-4 w-4 flex-shrink-0" /> : <ChevronRight className="h-4 w-4 flex-shrink-0" />}
                <div className="min-w-0">
                  <CardTitle className="text-base truncate">{promotion.name}</CardTitle>
                  <CardDescription className="text-xs">
                    {promotion.discount_value ? `${promotion.discount_value}% OFF` : 'Promoção'} · {startStr} → {endStr}
                  </CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0 ml-2" onClick={e => e.stopPropagation()}>
                <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
                {promotion.status === 'paused' && (
                  <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={onStart}>
                    <Play className="h-3 w-3" />Iniciar
                  </Button>
                )}
                {promotion.status === 'started' && (
                  <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onPause}>
                    <Pause className="h-3 w-3" />Pausar
                  </Button>
                )}
                {(promotion.status === 'started' || promotion.status === 'paused') && (
                  <Button size="sm" variant="outline" className="h-7 text-xs text-destructive" onClick={onFinish}>
                    <X className="h-3 w-3" />Encerrar
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-4">
            {loadingItems ? (
              <div className="space-y-2">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm font-medium text-muted-foreground">
                  Produtos na promoção ({items.length})
                </p>

                {/* Itens existentes */}
                {items.map(item => (
                  <div key={item.id} className="flex items-center gap-3 p-2 rounded-lg bg-muted/50">
                    {item.thumbnail && <img src={item.thumbnail} className="w-10 h-10 object-cover rounded" alt="" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{item.title}</p>
                      <p className="text-xs text-muted-foreground">
                        De R$ {Number(item.price ?? 0).toFixed(2)}
                        {item.new_price ? ` → R$ ${Number(item.new_price).toFixed(2)}` : ''}
                      </p>
                    </div>
                    <Button size="sm" variant="ghost" className="h-7 w-7 p-0 text-destructive"
                      onClick={() => handleRemoveItem(item.id)}>
                      <X className="h-3 w-3" />
                    </Button>
                  </div>
                ))}

                {/* Adicionar anúncios */}
                {promotion.status !== 'finished' && listings.length > 0 && (
                  <div>
                    <p className="text-xs text-muted-foreground mb-2">Adicionar anúncios da sua loja:</p>
                    <div className="space-y-1 max-h-48 overflow-y-auto">
                      {listings
                        .filter(l => !itemIds.has(l.id) && l.status === 'active')
                        .slice(0, 20)
                        .map(listing => (
                          <button
                            key={listing.id}
                            className="w-full flex items-center gap-2 p-2 rounded hover:bg-muted text-left disabled:opacity-50"
                            disabled={addingItem}
                            onClick={() => handleAddItem(listing.id)}
                          >
                            {listing.thumbnail && (
                              <img src={listing.thumbnail} className="w-8 h-8 object-cover rounded flex-shrink-0" alt="" />
                            )}
                            <span className="text-xs truncate flex-1">{listing.title}</span>
                            <Plus className="h-3 w-3 text-primary flex-shrink-0" />
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </CollapsibleContent>
      </Collapsible>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlPromocoes({ resellerUserId }: { resellerUserId?: string }) {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const {
    promotions, isLoading, refetch, createPromotion,
    startPromotion, pausePromotion, finishPromotion,
    addItem, removeItem, getPromotionItems, isCreating,
  } = useMlPromotions(resellerUserId);

  const { listings } = useMlListings(resellerUserId);
  const [showCreate, setShowCreate] = useState(false);

  if (!hasActiveIntegration && !resellerUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Tag className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para gerenciar promoções.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>Conectar ML</Button>
      </div>
    );
  }

  const active = promotions.filter(p => p.status === 'started').length;
  const paused = promotions.filter(p => p.status === 'paused').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Tag className="h-6 w-6 text-yellow-500" />
            Promoções ML
          </h1>
          <p className="text-muted-foreground text-sm">
            {active} ativa(s) · {paused} pausada(s) · {promotions.length} total
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
          <Button className="gap-1" onClick={() => setShowCreate(true)}>
            <Plus className="h-4 w-4" />Nova Promoção
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ativas', value: active, color: 'text-green-600' },
          { label: 'Pausadas', value: paused, color: 'text-amber-600' },
          { label: 'Total', value: promotions.length, color: 'text-primary' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3 flex items-center gap-3">
              <Percent className={`h-6 w-6 ${s.color}`} />
              <div>
                <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>
      ) : promotions.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Tag className="h-10 w-10 mx-auto mb-2 opacity-40" />
            <p>Nenhuma promoção criada ainda.</p>
            <Button size="sm" variant="outline" className="mt-3 gap-1" onClick={() => setShowCreate(true)}>
              <Plus className="h-3 w-3" />Criar primeira promoção
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {promotions.map(promo => (
            <PromotionCard
              key={promo.id}
              promotion={promo}
              listings={listings}
              onStart={() => startPromotion(promo.id)}
              onPause={() => pausePromotion(promo.id)}
              onFinish={() => finishPromotion(promo.id)}
              addItem={(itemId, discount) => addItem(promo.id, itemId, discount)}
              removeItem={itemId => removeItem(promo.id, itemId)}
              getItems={() => getPromotionItems(promo.id)}
            />
          ))}
        </div>
      )}

      <CreatePromotionModal
        open={showCreate}
        onClose={() => setShowCreate(false)}
        onCreate={createPromotion}
      />
    </div>
  );
}
