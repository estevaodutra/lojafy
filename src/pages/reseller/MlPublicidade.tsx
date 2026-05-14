import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Megaphone, RefreshCw, Pause, Play, Plus,
  MousePointer, Eye, TrendingUp, DollarSign, Percent, ShoppingBag
} from 'lucide-react';
import { useMlAds } from '@/hooks/useMlAds';
import { useMlListings } from '@/hooks/useMlListings';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

function formatBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

// ── Configuração de orçamento ─────────────────────────────────────────────────

function BudgetSection({ budget, onUpdate, isUpdating }: {
  budget: any; onUpdate: (v: number) => void; isUpdating: boolean;
}) {
  const [value, setValue] = useState(String(budget?.daily_budget ?? 50));

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Orçamento Diário
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-end gap-3">
          <div className="space-y-1 flex-1">
            <Label className="text-xs">Valor por dia (R$)</Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">R$</span>
              <Input
                type="number"
                min="5"
                step="5"
                className="pl-9"
                value={value}
                onChange={e => setValue(e.target.value)}
              />
            </div>
          </div>
          <Button
            disabled={isUpdating || !value || parseFloat(value) <= 0}
            onClick={() => onUpdate(parseFloat(value))}
          >
            {isUpdating ? 'Salvando...' : 'Salvar'}
          </Button>
          {budget?.remaining !== undefined && (
            <div className="text-right">
              <p className="text-xs text-muted-foreground">Restante hoje</p>
              <p className="font-bold text-green-600">{formatBRL(budget.remaining)}</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlPublicidade({ resellerUserId }: { resellerUserId?: string }) {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const { ads, budget, dashboard, isLoading, refetch, createAd, pauseAd, activateAd, updateBudget, isCreating, isUpdatingBudget } = useMlAds(resellerUserId);
  const { listings } = useMlListings(resellerUserId);

  const sponsoredIds = new Set(ads.map(a => a.item_id));
  const availableToSponsor = listings.filter(l => l.status === 'active' && !sponsoredIds.has(l.id));

  if (!hasActiveIntegration && !resellerUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <Megaphone className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para gerenciar publicidade.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>Conectar ML</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6 text-yellow-500" />
            Publicidade ML
          </h1>
          <p className="text-muted-foreground text-sm">
            Product Ads — anúncios patrocinados no Mercado Livre
          </p>
        </div>
        <Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : (
        <>
          {/* Dashboard */}
          {dashboard && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Impressões', value: dashboard.impressions.toLocaleString('pt-BR'), icon: Eye, color: 'text-blue-600' },
                { label: 'Cliques', value: dashboard.clicks.toLocaleString('pt-BR'), icon: MousePointer, color: 'text-green-600' },
                { label: 'CTR', value: `${dashboard.ctr.toFixed(2)}%`, icon: Percent, color: 'text-amber-600' },
                { label: 'Gasto hoje', value: formatBRL(dashboard.spent), icon: DollarSign, color: 'text-destructive' },
              ].map(s => {
                const Icon = s.icon;
                return (
                  <Card key={s.label}>
                    <CardContent className="pt-5 pb-4">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={`h-4 w-4 ${s.color}`} />
                        <span className="text-xs text-muted-foreground">{s.label}</span>
                      </div>
                      <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}

          {/* Orçamento */}
          <BudgetSection budget={budget} onUpdate={updateBudget} isUpdating={isUpdatingBudget} />

          {/* Anúncios patrocinados */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Produtos Patrocinados ({ads.length})</CardTitle>
              <CardDescription>Anúncios que aparecem em destaque no ML</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {ads.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                  <Megaphone className="h-8 w-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Nenhum produto patrocinado ainda.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Impressões</TableHead>
                        <TableHead>Cliques</TableHead>
                        <TableHead>Conversões</TableHead>
                        <TableHead>Gasto</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ads.map(ad => (
                        <TableRow key={ad.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {ad.thumbnail && (
                                <img src={ad.thumbnail} className="w-8 h-8 object-cover rounded" alt="" />
                              )}
                              <span className="text-sm line-clamp-1 max-w-xs">{ad.title ?? ad.item_id}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{ad.impressions?.toLocaleString('pt-BR') ?? '—'}</TableCell>
                          <TableCell className="text-sm">{ad.clicks?.toLocaleString('pt-BR') ?? '—'}</TableCell>
                          <TableCell className="text-sm">{ad.conversions ?? '—'}</TableCell>
                          <TableCell className="text-sm">{ad.spent ? formatBRL(ad.spent) : '—'}</TableCell>
                          <TableCell>
                            <Badge className={ad.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}>
                              {ad.status === 'active' ? 'Ativo' : 'Pausado'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {ad.status === 'active' ? (
                              <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={() => pauseAd(ad.id)}>
                                <Pause className="h-3 w-3" />Pausar
                              </Button>
                            ) : (
                              <Button size="sm" variant="default" className="h-7 text-xs gap-1" onClick={() => activateAd(ad.id)}>
                                <Play className="h-3 w-3" />Ativar
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Disponíveis para patrocinar */}
          {availableToSponsor.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base">Patrocinar Anúncios</CardTitle>
                <CardDescription>Selecione anúncios ativos para incluir na publicidade paga</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Produto</TableHead>
                        <TableHead>Preço</TableHead>
                        <TableHead>Estoque</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {availableToSponsor.slice(0, 20).map(listing => (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {listing.thumbnail ? (
                                <img src={listing.thumbnail} className="w-8 h-8 object-cover rounded" alt="" />
                              ) : (
                                <div className="w-8 h-8 bg-muted rounded flex items-center justify-center">
                                  <ShoppingBag className="h-4 w-4 text-muted-foreground" />
                                </div>
                              )}
                              <span className="text-sm line-clamp-1 max-w-xs">{listing.title}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">{formatBRL(listing.price)}</TableCell>
                          <TableCell className="text-sm">{listing.available_quantity}</TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs gap-1"
                              disabled={isCreating}
                              onClick={() => createAd(listing.id)}
                            >
                              <Plus className="h-3 w-3" />Patrocinar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
