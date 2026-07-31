import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Loader2, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useSupplierPaginatedQuery } from '@/hooks/supplier/useSupplierPaginatedQuery';
import { OccurrenceForm, OCCURRENCE_TYPE_LABELS } from '@/components/supplier/occurrences/OccurrenceForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import type { Database } from '@/integrations/supabase/types';

type Occurrence = Database['public']['Tables']['supplier_occurrences']['Row'];

const STATUS_LABELS: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  open: { label: 'Aberta', variant: 'destructive' },
  in_progress: { label: 'Em andamento', variant: 'default' },
  resolved: { label: 'Resolvida', variant: 'secondary' },
  cancelled: { label: 'Cancelada', variant: 'outline' },
};

const ResolveDialog = ({
  occurrence,
  onClose,
}: {
  occurrence: Occurrence | null;
  onClose: () => void;
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getEffectiveUserId } = useAuth();
  const { data: orgData } = useSupplierOrganization();
  const [notes, setNotes] = useState('');

  const mutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('supplier_occurrences')
        .update({
          status: 'resolved',
          resolution_notes: notes.trim() || null,
          resolved_by: getEffectiveUserId(),
          resolved_at: new Date().toISOString(),
        })
        .eq('id', occurrence!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      if (orgData) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgData.organization.id) });
      toast({ title: 'Ocorrência resolvida' });
      setNotes('');
      onClose();
    },
    onError: (error: Error) =>
      toast({ title: 'Erro ao resolver', description: error.message, variant: 'destructive' }),
  });

  return (
    <Dialog open={!!occurrence} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolver ocorrência</DialogTitle>
        </DialogHeader>
        <Textarea
          placeholder="Notas de resolução (opcional)"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
        />
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Resolver
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const SupplierOccurrences = () => {
  const [statusFilter, setStatusFilter] = useState<string>('open');
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(false);
  const [resolveTarget, setResolveTarget] = useState<Occurrence | null>(null);

  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const { data, isLoading } = useSupplierPaginatedQuery<Occurrence>({
    queryKey: orgId
      ? supplierKeys.occurrences(orgId, { status: statusFilter, page })
      : ['supplier', 'occurrences', 'pending'],
    page,
    pageSize: 20,
    enabled: !!orgId,
    fetcher: async (from, to) => {
      let query = supabase
        .from('supplier_occurrences')
        .select('*', { count: 'exact' })
        .eq('organization_id', orgId!)
        .order('created_at', { ascending: false })
        .range(from, to);
      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }
      const { data: rows, count, error } = await query;
      return { data: rows, count, error };
    },
  });

  const rows = data?.rows ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Ocorrências</h1>
          <p className="text-muted-foreground">Problemas operacionais em acompanhamento</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas</SelectItem>
              <SelectItem value="open">Abertas</SelectItem>
              <SelectItem value="in_progress">Em andamento</SelectItem>
              <SelectItem value="resolved">Resolvidas</SelectItem>
              <SelectItem value="cancelled">Canceladas</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => setFormOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova ocorrência
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <Skeleton className="h-40 w-full" />
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">Nenhuma ocorrência encontrada.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Título</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aberta em</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const statusConfig = STATUS_LABELS[row.status] ?? STATUS_LABELS.open;
                    return (
                      <TableRow key={row.id}>
                        <TableCell className="font-medium max-w-[280px]">
                          <p className="truncate">{row.title}</p>
                          {row.description && (
                            <p className="truncate text-xs text-muted-foreground">{row.description}</p>
                          )}
                        </TableCell>
                        <TableCell>{OCCURRENCE_TYPE_LABELS[row.occurrence_type] ?? row.occurrence_type}</TableCell>
                        <TableCell>
                          <Badge variant={statusConfig.variant}>{statusConfig.label}</Badge>
                        </TableCell>
                        <TableCell>{format(new Date(row.created_at), 'dd/MM/yyyy HH:mm')}</TableCell>
                        <TableCell className="text-right">
                          {(row.status === 'open' || row.status === 'in_progress') && (
                            <Button size="sm" variant="outline" onClick={() => setResolveTarget(row)}>
                              Resolver
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <OccurrenceForm isOpen={formOpen} onClose={() => setFormOpen(false)} />
      <ResolveDialog occurrence={resolveTarget} onClose={() => setResolveTarget(null)} />
    </div>
  );
};

export default SupplierOccurrences;
