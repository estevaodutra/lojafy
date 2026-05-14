import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  RefreshCw, Search, Pause, Play, DollarSign, Package,
  ExternalLink, ShoppingBag, AlertCircle
} from 'lucide-react';
import { useMlListings, type MlListing } from '@/hooks/useMlListings';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

const STATUS_CONFIG = {
  active:       { label: 'Ativo',       color: 'bg-green-100 text-green-800' },
  paused:       { label: 'Pausado',     color: 'bg-gray-100 text-gray-700' },
  closed:       { label: 'Encerrado',   color: 'bg-red-100 text-red-700' },
  under_review: { label: 'Em análise',  color: 'bg-amber-100 text-amber-800' },
};

// ── Modal de bulk price ───────────────────────────────────────────────────────

function BulkPriceModal({
  open, onClose, selectedIds, listings, onApply,
}: {
  open: boolean; onClose: () => void;
  selectedIds: string[]; listings: MlListing[];
  onApply: (type: 'fixed' | 'pct', value: number) => Promise<void>;
}) {
  const [type, setType] = useState<'fixed' | 'pct'>('fixed');
  const [value, setValue] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    const num = parseFloat(value.replace(',', '.'));
    if (isNaN(num) || num <= 0) return;
    setLoading(true);
    await onApply(type, num);
    setLoading(false);
    onClose();
    setValue('');
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar preço — {selectedIds.length} anúncio(s)</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>Tipo de ajuste</Label>
            <Select value={type} onValueChange={(v: 'fixed' | 'pct') => setType(v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                <SelectItem value="pct">Percentual (%) — positivo = aumento, negativo = desconto</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>{type === 'fixed' ? 'Novo preço (R$)' : 'Variação (%)'}</Label>
            <Input
              type="number"
              step="0.01"
              value={value}
              onChange={e => setValue(e.target.value)}
              placeholder={type === 'fixed' ? 'Ex: 49.90' : 'Ex: -10 para -10%'}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!value || loading} onClick={handleApply}>
            {loading ? 'Atualizando...' : 'Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Modal de bulk stock ───────────────────────────────────────────────────────

function BulkStockModal({
  open, onClose, selectedIds, onApply,
}: {
  open: boolean; onClose: () => void;
  selectedIds: string[];
  onApply: (qty: number) => Promise<void>;
}) {
  const [qty, setQty] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleApply() {
    const num = parseInt(qty);
    if (isNaN(num) || num < 0) return;
    setLoading(true);
    await onApply(num);
    setLoading(false);
    onClose();
    setQty('');
  }

  return (
    <Dialog open={open} onOpenChange={o => { if (!o) onClose(); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Atualizar estoque — {selectedIds.length} anúncio(s)</DialogTitle></DialogHeader>
        <div className="space-y-1">
          <Label>Nova quantidade</Label>
          <Input type="number" min="0" value={qty} onChange={e => setQty(e.target.value)} placeholder="Ex: 10" />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button disabled={!qty || loading} onClick={handleApply}>
            {loading ? 'Atualizando...' : 'Aplicar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Linha editável ────────────────────────────────────────────────────────────

function ListingRow({
  item, selected, onToggle, onPause, onActivate, onUpdatePrice, onUpdateStock,
}: {
  item: MlListing;
  selected: boolean;
  onToggle: () => void;
  onPause: () => void;
  onActivate: () => void;
  onUpdatePrice: (p: number) => void;
  onUpdateStock: (q: number) => void;
}) {
  const [editPrice, setEditPrice] = useState(false);
  const [editStock, setEditStock] = useState(false);
  const [priceVal, setPriceVal] = useState(String(item.price));
  const [stockVal, setStockVal] = useState(String(item.available_quantity));
  const st = STATUS_CONFIG[item.status] ?? { label: item.status, color: 'bg-gray-100 text-gray-700' };
  const isLowStock = item.available_quantity <= 2;

  return (
    <tr className={`border-b hover:bg-muted/30 transition-colors ${selected ? 'bg-primary/5' : ''}`}>
      <td className="p-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} />
      </td>
      <td className="p-3">
        {item.thumbnail ? (
          <img src={item.thumbnail} alt="" className="w-12 h-12 object-cover rounded" />
        ) : (
          <div className="w-12 h-12 bg-muted rounded flex items-center justify-center">
            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
          </div>
        )}
      </td>
      <td className="p-3 max-w-xs">
        <p className="text-sm font-medium line-clamp-2">{item.title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{item.sold_quantity} vendas</p>
      </td>
      <td className="p-3">
        {editPrice ? (
          <div className="flex gap-1 items-center">
            <Input
              className="h-8 w-24 text-sm"
              type="number"
              step="0.01"
              value={priceVal}
              onChange={e => setPriceVal(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { onUpdatePrice(parseFloat(priceVal)); setEditPrice(false); }
                if (e.key === 'Escape') setEditPrice(false);
              }}
              autoFocus
            />
          </div>
        ) : (
          <button
            className="text-sm font-medium hover:underline cursor-pointer text-left"
            onClick={() => { setPriceVal(String(item.price)); setEditPrice(true); }}
          >
            {formatBRL(item.price)}
          </button>
        )}
      </td>
      <td className="p-3">
        {editStock ? (
          <Input
            className="h-8 w-16 text-sm"
            type="number"
            min="0"
            value={stockVal}
            onChange={e => setStockVal(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') { onUpdateStock(parseInt(stockVal)); setEditStock(false); }
              if (e.key === 'Escape') setEditStock(false);
            }}
            autoFocus
          />
        ) : (
          <button
            className={`text-sm font-medium hover:underline cursor-pointer flex items-center gap-1 ${isLowStock ? 'text-destructive' : ''}`}
            onClick={() => { setStockVal(String(item.available_quantity)); setEditStock(true); }}
          >
            {isLowStock && <AlertCircle className="h-3 w-3" />}
            {item.available_quantity}
          </button>
        )}
      </td>
      <td className="p-3">
        <Badge className={`text-xs ${st.color}`}>{st.label}</Badge>
      </td>
      <td className="p-3">
        <div className="flex gap-1">
          {item.status === 'active' && (
            <Button size="sm" variant="outline" className="h-7 text-xs" onClick={onPause}>
              <Pause className="h-3 w-3 mr-1" />Pausar
            </Button>
          )}
          {item.status === 'paused' && (
            <Button size="sm" variant="default" className="h-7 text-xs" onClick={onActivate}>
              <Play className="h-3 w-3 mr-1" />Ativar
            </Button>
          )}
          <Button size="sm" variant="ghost" className="h-7 w-7 p-0"
            onClick={() => window.open(item.permalink, '_blank')}>
            <ExternalLink className="h-3 w-3" />
          </Button>
        </div>
      </td>
    </tr>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlAnuncios() {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const {
    listings, isLoading, error, refetch,
    pauseListing, activateListing, updatePrice, updateStock,
    bulkPause, bulkActivate, bulkUpdatePrice, bulkUpdatePricePct, bulkUpdateStock,
  } = useMlListings();

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);

  const PAGE_SIZE = 50;

  const filtered = useMemo(() => {
    let result = listings;
    if (statusFilter !== 'all') result = result.filter(l => l.status === statusFilter);
    if (search) result = result.filter(l => l.title.toLowerCase().includes(search.toLowerCase()));
    return result;
  }, [listings, statusFilter, search]);

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectedIds = [...selected];
  const allPageSelected = paginated.length > 0 && paginated.every(l => selected.has(l.id));

  function toggleSelectAll() {
    const next = new Set(selected);
    if (allPageSelected) paginated.forEach(l => next.delete(l.id));
    else paginated.forEach(l => next.add(l.id));
    setSelected(next);
  }

  function toggleItem(id: string) {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  }

  const stats = {
    active: listings.filter(l => l.status === 'active').length,
    paused: listings.filter(l => l.status === 'paused').length,
    sold: listings.reduce((s, l) => s + l.sold_quantity, 0),
  };

  if (!hasActiveIntegration) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <ShoppingBag className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground text-center">
          Conecte sua conta do Mercado Livre para gerenciar seus anúncios.
        </p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>
          Conectar Mercado Livre
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <ShoppingBag className="h-6 w-6 text-yellow-500" />
            Meus Anúncios ML
          </h1>
          <p className="text-muted-foreground text-sm">Gerencie seus anúncios no Mercado Livre</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Ativos', value: stats.active, color: 'text-green-600' },
          { label: 'Pausados', value: stats.paused, color: 'text-gray-500' },
          { label: 'Total vendas', value: stats.sold, color: 'text-blue-600' },
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="pt-4 pb-3">
              <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
              <p className="text-sm text-muted-foreground">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por título..."
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={statusFilter} onValueChange={v => { setStatusFilter(v); setPage(1); }}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="paused">Pausados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk action bar */}
      {selectedIds.length > 0 && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-primary/5 border border-primary/20 flex-wrap">
          <span className="text-sm font-medium">{selectedIds.length} selecionado(s)</span>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
              onClick={() => { bulkPause(selectedIds); setSelected(new Set()); }}>
              <Pause className="h-3 w-3" />Pausar todos
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
              onClick={() => { bulkActivate(selectedIds); setSelected(new Set()); }}>
              <Play className="h-3 w-3" />Ativar todos
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
              onClick={() => setShowPriceModal(true)}>
              <DollarSign className="h-3 w-3" />Preço
            </Button>
            <Button size="sm" variant="outline" className="h-8 text-xs gap-1"
              onClick={() => setShowStockModal(true)}>
              <Package className="h-3 w-3" />Estoque
            </Button>
            <Button size="sm" variant="ghost" className="h-8 text-xs"
              onClick={() => setSelected(new Set())}>
              Limpar seleção
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : error ? (
            <div className="p-12 text-center text-muted-foreground">
              <AlertCircle className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p>Erro ao carregar anúncios. Verifique se sua conta ML está conectada.</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-muted-foreground">
              <ShoppingBag className="h-8 w-8 mx-auto mb-2" />
              <p>Nenhum anúncio encontrado.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="p-3 w-10">
                      <Checkbox checked={allPageSelected} onCheckedChange={toggleSelectAll} />
                    </th>
                    <th className="p-3 w-16 text-left text-xs font-medium text-muted-foreground">Foto</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Título</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Preço</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Estoque</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                    <th className="p-3 text-left text-xs font-medium text-muted-foreground">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map(item => (
                    <ListingRow
                      key={item.id}
                      item={item}
                      selected={selected.has(item.id)}
                      onToggle={() => toggleItem(item.id)}
                      onPause={() => pauseListing(item.id)}
                      onActivate={() => activateListing(item.id)}
                      onUpdatePrice={p => updatePrice(item.id, p)}
                      onUpdateStock={q => updateStock(item.id, q)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>Anterior</Button>
          <span className="text-sm text-muted-foreground">Página {page} de {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>Próxima</Button>
        </div>
      )}

      {/* Modals */}
      <BulkPriceModal
        open={showPriceModal}
        onClose={() => setShowPriceModal(false)}
        selectedIds={selectedIds}
        listings={listings}
        onApply={async (type, value) => {
          if (type === 'fixed') {
            await bulkUpdatePrice(selectedIds, value);
          } else {
            const prices = Object.fromEntries(listings.map(l => [l.id, l.price]));
            await bulkUpdatePricePct(selectedIds, value, prices);
          }
          setSelected(new Set());
        }}
      />
      <BulkStockModal
        open={showStockModal}
        onClose={() => setShowStockModal(false)}
        selectedIds={selectedIds}
        onApply={async qty => { await bulkUpdateStock(selectedIds, qty); setSelected(new Set()); }}
      />
    </div>
  );
}
