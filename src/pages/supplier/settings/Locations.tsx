import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Loader2, Plus, Star } from 'lucide-react';
import type { Database } from '@/integrations/supabase/types';

type SupplierLocation = Database['public']['Tables']['supplier_locations']['Row'];

const SupplierLocationsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData, isLoading: orgLoading } = useSupplierOrganization();
  const org = orgData?.organization;
  const [newName, setNewName] = useState('');

  const { data: locations, isLoading } = useQuery<SupplierLocation[]>({
    queryKey: org ? supplierKeys.locations(org.id) : ['supplier', 'locations', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('supplier_locations')
        .select('*')
        .eq('organization_id', org!.id)
        .eq('active', true)
        .order('created_at');
      if (error) throw error;
      return data ?? [];
    },
    enabled: !!org,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: supplierKeys.locations(org!.id) });

  const addMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from('supplier_locations').insert({
        organization_id: org!.id,
        name: newName.trim(),
        is_default: (locations?.length ?? 0) === 0,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setNewName('');
      invalidate();
      toast({ title: 'Depósito criado' });
    },
    onError: (error: Error) =>
      toast({ title: 'Erro ao criar depósito', description: error.message, variant: 'destructive' }),
  });

  const setDefaultMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const current = locations?.find((l) => l.is_default);
      if (current && current.id !== locationId) {
        const { error } = await supabase
          .from('supplier_locations')
          .update({ is_default: false })
          .eq('id', current.id);
        if (error) throw error;
      }
      const { error } = await supabase
        .from('supplier_locations')
        .update({ is_default: true })
        .eq('id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Depósito padrão atualizado' });
    },
    onError: (error: Error) =>
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }),
  });

  const deactivateMutation = useMutation({
    mutationFn: async (locationId: string) => {
      const { error } = await supabase
        .from('supplier_locations')
        .update({ active: false })
        .eq('id', locationId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Depósito desativado' });
    },
    onError: (error: Error) =>
      toast({ title: 'Erro ao desativar', description: error.message, variant: 'destructive' }),
  });

  if (orgLoading || isLoading) return <Skeleton className="h-64 w-full max-w-3xl" />;
  if (!org) return <p className="text-muted-foreground">Nenhuma organização encontrada.</p>;

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold">Depósitos</h1>
        <p className="text-muted-foreground">Locais de estoque da sua operação</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Novo depósito</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2">
          <Input
            placeholder="Nome do depósito"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
          />
          <Button
            onClick={() => addMutation.mutate()}
            disabled={!newName.trim() || addMutation.isPending}
          >
            {addMutation.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            Adicionar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {(locations?.length ?? 0) === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum depósito cadastrado.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Padrão</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {locations!.map((location) => (
                  <TableRow key={location.id}>
                    <TableCell className="font-medium">{location.name}</TableCell>
                    <TableCell>
                      {location.is_default ? (
                        <Badge className="gap-1">
                          <Star className="h-3 w-3" /> Padrão
                        </Badge>
                      ) : (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDefaultMutation.mutate(location.id)}
                          disabled={setDefaultMutation.isPending}
                        >
                          Tornar padrão
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => deactivateMutation.mutate(location.id)}
                        disabled={location.is_default || deactivateMutation.isPending}
                      >
                        Desativar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierLocationsSettings;
