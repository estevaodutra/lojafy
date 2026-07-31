import { useState } from 'react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useSupplierPaginatedQuery } from '@/hooks/supplier/useSupplierPaginatedQuery';
import { MOVEMENT_TYPE_LABELS, type MovementType } from '@/services/inventoryService';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';

interface MovementRow {
  id: string;
  movement_type: string;
  quantity: number;
  previous_quantity: number;
  new_quantity: number;
  reason: string | null;
  created_at: string;
  products: { name: string; sku: string | null } | null;
}

const INBOUND_TYPES = ['entry', 'return_entry', 'import_load', 'reservation_release'];

const SupplierMovements = () => {
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;
  const [page, setPage] = useState(1);
  const [typeFilter, setTypeFilter] = useState('all');

  const { data, isLoading } = useSupplierPaginatedQuery<MovementRow>({
    queryKey: orgId
      ? supplierKeys.movements(orgId, { page, type: typeFilter })
      : ['supplier', 'movements', 'pending'],
    page,
    pageSize: 30,
    enabled: !!orgId,
    fetcher: async (from, to) => {
      let query = supabase
        .from('supplier_inventory_movements')
        .select(
          'id, movement_type, quantity, previous_quantity, new_quantity, reason, created_at, products ( name, sku )',
          { count: 'exact' },
        )
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (typeFilter !== 'all') {
        query = query.eq('movement_type', typeFilter);
      }
      const { data: rows, count, error } = await query;
      return { data: (rows ?? []) as unknown as MovementRow[], count, error };
    },
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Movimentações de Estoque</h1>
          <p className="text-muted-foreground">Ledger imutável de todas as mudanças</p>
        </div>
        <Select value={typeFilter} onValueChange={(v) => { setTypeFilter(v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            {Object.entries(MOVEMENT_TYPE_LABELS).map(([value, label]) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-12 text-center text-muted-foreground">Nenhuma movimentação registrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Produto</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead className="text-right">Antes → Depois</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id}>
                      <TableCell className="whitespace-nowrap">
                        {format(new Date(row.created_at), 'dd/MM/yyyy HH:mm')}
                      </TableCell>
                      <TableCell>
                        <p className="max-w-[220px] truncate font-medium">{row.products?.name ?? '—'}</p>
                        {row.products?.sku && (
                          <p className="font-mono text-xs text-muted-foreground">{row.products.sku}</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={INBOUND_TYPES.includes(row.movement_type) ? 'default' : 'secondary'}>
                          {MOVEMENT_TYPE_LABELS[row.movement_type as MovementType] ?? row.movement_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">{row.quantity}</TableCell>
                      <TableCell className="text-right">
                        {row.previous_quantity} → {row.new_quantity}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate text-muted-foreground">
                        {row.reason ?? '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {data && data.pageCount > 1 && (
            <Pagination className="mt-4">
              <PaginationContent>
                <PaginationItem>
                  <PaginationPrevious
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    className={page === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
                <PaginationItem>
                  <span className="px-3 text-sm">{page} de {data.pageCount}</span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(data.pageCount, p + 1))}
                    className={page >= data.pageCount ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierMovements;
