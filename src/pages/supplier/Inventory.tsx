import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, SlidersHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { StockAdjustDialog } from '@/components/supplier/inventory/StockAdjustDialog';
import { StockImportExport } from '@/components/supplier/inventory/StockImportExport';
import type { StockOverviewRow } from '@/services/inventoryService';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';

/** Estoque sobre a view supplier_stock_overview: físico, reservado, disponível. */
const SupplierInventory = () => {
  const [searchParams] = useSearchParams();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const [search, setSearch] = useState('');
  const [onlyCritical, setOnlyCritical] = useState(searchParams.get('filtro') === 'critico');
  const [adjustTarget, setAdjustTarget] = useState<{ id: string; name: string; stock: number } | null>(null);

  const { data: rows, isLoading } = useQuery<StockOverviewRow[]>({
    queryKey: orgId ? supplierKeys.stock(orgId) : ['supplier', 'stock', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_stock_overview')
        .select('*')
        .eq('organization_id', orgId!)
        .order('name');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!orgId,
  });

  const filtered = (rows ?? []).filter((row) => {
    if (onlyCritical && !row.is_below_minimum) return false;
    if (search) {
      const term = search.toLowerCase();
      return (
        (row.name ?? '').toLowerCase().includes(term) ||
        (row.sku ?? '').toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Estoque</h1>
          <p className="text-muted-foreground">Físico, reservado por pedidos e disponível</p>
        </div>
        <StockImportExport rows={filtered} />
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome ou SKU"
            className="w-56 pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Checkbox
            id="only-critical"
            checked={onlyCritical}
            onCheckedChange={(c) => setOnlyCritical(!!c)}
          />
          <Label htmlFor="only-critical" className="text-sm">
            Só estoque crítico
          </Label>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : filtered.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">
              {onlyCritical ? 'Nenhum produto com estoque crítico. 🎉' : 'Nenhum produto encontrado.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead className="text-right">Físico</TableHead>
                    <TableHead className="text-right">Reservado</TableHead>
                    <TableHead className="text-right">Disponível</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((row) => (
                    <TableRow key={row.product_id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {row.main_image_url && (
                            <img src={row.main_image_url} alt="" className="h-9 w-9 rounded object-cover" />
                          )}
                          <span className="max-w-[260px] truncate font-medium">{row.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.sku ?? '—'}</TableCell>
                      <TableCell className="text-right">{row.stock_quantity}</TableCell>
                      <TableCell className="text-right">{row.reserved_quantity}</TableCell>
                      <TableCell className="text-right font-medium">{row.available_quantity}</TableCell>
                      <TableCell>
                        {row.is_below_minimum ? (
                          <Badge variant="destructive">Crítico</Badge>
                        ) : (
                          <Badge variant="outline">OK</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            setAdjustTarget({
                              id: row.product_id!,
                              name: row.name ?? '',
                              stock: row.stock_quantity ?? 0,
                            })
                          }
                        >
                          <SlidersHorizontal className="mr-1 h-3 w-3" />
                          Movimentar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <StockAdjustDialog product={adjustTarget} onClose={() => setAdjustTarget(null)} />
    </div>
  );
};

export default SupplierInventory;
