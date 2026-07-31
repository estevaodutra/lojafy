import { useMemo, useState } from 'react';
import { format, isPast, isToday } from 'date-fns';
import { AlertTriangle, ChevronRight, Eye, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Pagination, PaginationContent, PaginationItem, PaginationNext, PaginationPrevious,
} from '@/components/ui/pagination';
import {
  useSupplierFulfillments,
  useFulfillmentMutations,
  type FulfillmentRow,
} from '@/hooks/supplier/useSupplierFulfillments';
import type { FulfillmentStatus } from '@/constants/fulfillmentStatus';
import { FulfillmentStatusBadge } from './FulfillmentStatusBadge';
import { FulfillmentDetailsDrawer } from './FulfillmentDetailsDrawer';
import { OccurrenceForm } from '@/components/supplier/occurrences/OccurrenceForm';

interface OperationQueueProps {
  title: string;
  description: string;
  /** Status exibidos nesta fila. */
  statuses: FulfillmentStatus[];
  /** Ação principal por status atual → próximo status. */
  primaryAction: Partial<Record<FulfillmentStatus, { label: string; to: FulfillmentStatus }>>;
  /** Rótulo da ação em lote (aplica primaryAction a cada selecionado). */
  batchLabel?: string;
  emptyMessage: string;
  /** Filtros extras repassados ao hook (visão geral de pedidos). */
  sla?: 'late' | 'due_today' | null;
  search?: string;
}

const SlaCell = ({ deadline }: { deadline: string | null }) => {
  if (!deadline) return <span className="text-muted-foreground">—</span>;
  const date = new Date(deadline);
  const late = isPast(date);
  const today = isToday(date);
  return (
    <span className={late ? 'text-destructive font-medium' : today ? 'text-amber-600 font-medium' : ''}>
      {format(date, 'dd/MM HH:mm')}
      {late && ' (atrasado)'}
    </span>
  );
};

/**
 * Fila operacional compartilhada por Separação/Embalagem/Expedição:
 * lista fulfillments nos status da etapa, avança individualmente ou em lote.
 */
export const OperationQueue = ({
  title,
  description,
  statuses,
  primaryAction,
  batchLabel,
  emptyMessage,
  sla,
  search,
}: OperationQueueProps) => {
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [details, setDetails] = useState<FulfillmentRow | null>(null);
  const [occurrenceFor, setOccurrenceFor] = useState<FulfillmentRow | null>(null);

  const { data, isLoading, isError, refetch } = useSupplierFulfillments({ statuses, page, sla, search });
  const { transition, batch } = useFulfillmentMutations();

  const rows = data?.rows ?? [];

  const selectableRows = useMemo(
    () => rows.filter((row) => primaryAction[row.status]),
    [rows, primaryAction],
  );

  const toggleAll = (checked: boolean) => {
    setSelected(checked ? new Set(selectableRows.map((r) => r.id)) : new Set());
  };

  const toggleOne = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const runBatch = () => {
    // agrupa por próximo status (filas com 2 status podem ter destinos diferentes)
    const byTarget = new Map<FulfillmentStatus, string[]>();
    rows
      .filter((row) => selected.has(row.id) && primaryAction[row.status])
      .forEach((row) => {
        const target = primaryAction[row.status]!.to;
        byTarget.set(target, [...(byTarget.get(target) ?? []), row.id]);
      });
    byTarget.forEach((ids, toStatus) => batch.mutate({ ids, toStatus }));
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      {(title || (batchLabel && selected.size > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            {title && <h1 className="text-2xl font-bold">{title}</h1>}
            {description && <p className="text-muted-foreground">{description}</p>}
          </div>
          {batchLabel && selected.size > 0 && (
            <Button onClick={runBatch} disabled={batch.isPending}>
              {batch.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {batchLabel} ({selected.size})
            </Button>
          )}
        </div>
      )}

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : isError ? (
            <div className="py-8 text-center space-y-2">
              <p className="text-destructive">Erro ao carregar a fila.</p>
              <Button variant="outline" onClick={() => refetch()}>
                Tentar novamente
              </Button>
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">{emptyMessage}</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {batchLabel && (
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selected.size > 0 && selected.size === selectableRows.length}
                          onCheckedChange={(c) => toggleAll(!!c)}
                        />
                      </TableHead>
                    )}
                    <TableHead>Pedido</TableHead>
                    <TableHead>Itens</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>SLA de envio</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const action = primaryAction[row.status];
                    const itemCount = row.supplier_fulfillment_items.reduce(
                      (sum, item) => sum + item.quantity,
                      0,
                    );
                    return (
                      <TableRow key={row.id}>
                        {batchLabel && (
                          <TableCell>
                            {action ? (
                              <Checkbox
                                checked={selected.has(row.id)}
                                onCheckedChange={(c) => toggleOne(row.id, !!c)}
                              />
                            ) : null}
                          </TableCell>
                        )}
                        <TableCell className="font-medium">
                          #{row.orders?.order_number}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{itemCount} item{itemCount !== 1 ? 's' : ''}</Badge>
                        </TableCell>
                        <TableCell>
                          <FulfillmentStatusBadge status={row.status} />
                        </TableCell>
                        <TableCell>
                          <SlaCell deadline={row.sla_shipping_deadline} />
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => setDetails(row)}>
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              title="Registrar ocorrência"
                              onClick={() => setOccurrenceFor(row)}
                            >
                              <AlertTriangle className="h-4 w-4" />
                            </Button>
                            {action && (
                              <Button
                                size="sm"
                                onClick={() =>
                                  transition.mutate({ fulfillmentId: row.id, toStatus: action.to })
                                }
                                disabled={transition.isPending}
                              >
                                {action.label}
                                <ChevronRight className="ml-1 h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
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
                  <span className="px-3 text-sm">
                    {page} de {data.pageCount}
                  </span>
                </PaginationItem>
                <PaginationItem>
                  <PaginationNext
                    onClick={() => setPage((p) => Math.min(data.pageCount, p + 1))}
                    className={
                      page >= data.pageCount ? 'pointer-events-none opacity-50' : 'cursor-pointer'
                    }
                  />
                </PaginationItem>
              </PaginationContent>
            </Pagination>
          )}
        </CardContent>
      </Card>

      <FulfillmentDetailsDrawer fulfillment={details} onClose={() => setDetails(null)} />
      <OccurrenceForm
        isOpen={!!occurrenceFor}
        onClose={() => setOccurrenceFor(null)}
        fulfillmentId={occurrenceFor?.id}
        orderId={occurrenceFor?.order_id}
      />
    </div>
  );
};
