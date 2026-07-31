import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Plus, Search, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useSupplierPaginatedQuery } from '@/hooks/supplier/useSupplierPaginatedQuery';
import { exportCatalogCsv, exportCatalogJson } from '@/services/supplierExportService';
import { GtinStatusBadge, StageBadge } from '@/components/supplier/products/GtinStatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import type { Database } from '@/integrations/supabase/types';

type ProductRow = Pick<
  Database['public']['Tables']['products']['Row'],
  | 'id' | 'name' | 'sku' | 'price' | 'stock_quantity' | 'stage' | 'gtin_status'
  | 'approval_status' | 'active' | 'main_image_url' | 'image_url' | 'created_at'
>;

const SupplierProductManagement = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [stageFilter, setStageFilter] = useState('all');

  const { data, isLoading } = useSupplierPaginatedQuery<ProductRow>({
    queryKey: orgId
      ? supplierKeys.products(orgId, { page, search, stage: stageFilter })
      : ['supplier', 'products', 'pending'],
    page,
    pageSize: 20,
    enabled: !!orgId,
    fetcher: async (from, to) => {
      let query = supabase
        .from('products')
        .select(
          'id, name, sku, price, stock_quantity, stage, gtin_status, approval_status, active, main_image_url, image_url, created_at',
          { count: 'exact' },
        )
        .eq('supplier_organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (search) {
        query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
      }
      if (stageFilter !== 'all') {
        query = query.eq('stage', stageFilter);
      }
      const { data: rows, count, error } = await query;
      return { data: rows, count, error };
    },
  });

  const submitApproval = useMutation({
    mutationFn: async (productId: string) => {
      const { error } = await supabase
        .from('products')
        .update({ approval_status: 'pending_approval' })
        .eq('id', productId);
      if (error) throw error;
    },
    onSuccess: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
      toast({ title: 'Produto enviado para aprovação' });
    },
    onError: (error: Error) =>
      toast({ title: 'Erro ao enviar', description: error.message, variant: 'destructive' }),
  });

  const handleExport = async (format: 'csv' | 'json') => {
    try {
      const count =
        format === 'csv' ? await exportCatalogCsv(orgId!) : await exportCatalogJson(orgId!);
      toast({ title: `${count} produtos exportados` });
    } catch (error) {
      toast({
        title: 'Erro no export',
        description: error instanceof Error ? error.message : String(error),
        variant: 'destructive',
      });
    }
  };

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Meus Produtos</h1>
          <p className="text-muted-foreground">Catálogo em dois estágios</p>
        </div>
        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Exportar
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem onClick={() => handleExport('csv')}>Planilha (CSV)</DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport('json')}>Backup completo (JSON)</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button onClick={() => navigate('/supplier/produtos/novo')}>
            <Plus className="mr-2 h-4 w-4" />
            Novo produto
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Nome ou SKU"
            className="w-56 pl-8"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        <Select value={stageFilter} onValueChange={(v) => { setStageFilter(v); setPage(1); }}>
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os estágios</SelectItem>
            <SelectItem value="stage_1_basic">Estágio 1 — Básico</SelectItem>
            <SelectItem value="stage_2_requires_review">Estágio 2 — Requer revisão</SelectItem>
            <SelectItem value="stage_2_enabled">Habilitados</SelectItem>
            <SelectItem value="stage_2_blocked">Bloqueados</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : rows.length === 0 ? (
            <div className="py-12 text-center space-y-3">
              <p className="text-muted-foreground">Nenhum produto encontrado.</p>
              <Button onClick={() => navigate('/supplier/produtos/novo')}>
                <Plus className="mr-2 h-4 w-4" />
                Cadastrar primeiro produto
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Produto</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Preço</TableHead>
                    <TableHead>Estoque</TableHead>
                    <TableHead>Estágio</TableHead>
                    <TableHead>GTIN</TableHead>
                    <TableHead>Aprovação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((product) => (
                    <TableRow
                      key={product.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/supplier/produtos/${product.id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {product.main_image_url || product.image_url ? (
                            <img
                              src={product.main_image_url || product.image_url || ''}
                              alt=""
                              className="h-9 w-9 rounded object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = 'https://placehold.co/100x100/e2e8f0/64748b?text=Sem+Foto';
                              }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground select-none">Sem Foto</div>
                          )}
                          <span className="max-w-[240px] truncate font-medium">{product.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{product.sku ?? '—'}</TableCell>
                      <TableCell>
                        {product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </TableCell>
                      <TableCell>{product.stock_quantity ?? 0}</TableCell>
                      <TableCell>
                        <StageBadge stage={product.stage} />
                      </TableCell>
                      <TableCell>
                        <GtinStatusBadge status={product.gtin_status} />
                      </TableCell>
                      <TableCell>
                        <Badge variant={product.approval_status === 'approved' ? 'default' : 'secondary'}>
                          {product.approval_status === 'approved'
                            ? 'Aprovado'
                            : product.approval_status === 'pending_approval'
                              ? 'Em análise'
                              : product.approval_status === 'rejected'
                                ? 'Rejeitado'
                                : 'Rascunho'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        {product.stage === 'stage_2_enabled' && product.approval_status === 'draft' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => submitApproval.mutate(product.id)}
                            disabled={submitApproval.isPending}
                          >
                            <Send className="mr-1 h-3 w-3" />
                            Enviar p/ aprovação
                          </Button>
                        )}
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

export default SupplierProductManagement;
