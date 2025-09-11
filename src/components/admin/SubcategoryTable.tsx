import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, MoreHorizontal, Trash2, Eye, EyeOff, ArrowLeft, Folder } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubcategoryCreationModal } from './SubcategoryCreationModal';

interface SubcategoryTableProps {
  category: any;
  onBack: () => void;
  onEdit: (subcategory: any) => void;
}

const SubcategoryTable: React.FC<SubcategoryTableProps> = ({
  category,
  onBack,
  onEdit
}) => {
  const [deleteSubcategory, setDeleteSubcategory] = useState<any>(null);
  const queryClient = useQueryClient();

  const { data: subcategories = [], isLoading } = useQuery({
    queryKey: ['subcategories', category.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subcategories')
        .select(`
          *,
          products:products(count)
        `)
        .eq('category_id', category.id)
        .order('name');
      
      if (error) throw error;
      return data.map(sub => ({
        ...sub,
        product_count: sub.products?.[0]?.count || 0
      }));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (subcategoryId: string) => {
      const { error } = await supabase
        .from('subcategories')
        .delete()
        .eq('id', subcategoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Subcategoria excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['subcategories', category.id] });
      setDeleteSubcategory(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir subcategoria: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('subcategories')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      toast.success(`Subcategoria ${active ? 'ativada' : 'desativada'} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['subcategories', category.id] });
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <div>
            <h2 className="text-2xl font-bold">Subcategorias de {category.name}</h2>
            <p className="text-muted-foreground">
              Gerencie as subcategorias desta categoria
            </p>
          </div>
        </div>
        <SubcategoryCreationModal
          categoryId={category.id}
          onSubcategoryCreated={() => {
            queryClient.invalidateQueries({ queryKey: ['subcategories', category.id] });
          }}
        />
      </div>

      {/* Subcategories Table */}
      {subcategories.length === 0 ? (
        <div className="text-center py-8">
          <Folder className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">
            Nenhuma subcategoria encontrada para esta categoria.
          </p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Slug</TableHead>
                <TableHead>Produtos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subcategories.map((subcategory) => (
                <TableRow key={subcategory.id}>
                  <TableCell className="font-medium">{subcategory.name}</TableCell>
                  <TableCell className="text-muted-foreground">{subcategory.slug}</TableCell>
                  <TableCell>
                    <Badge variant="secondary">
                      {subcategory.product_count || 0}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={subcategory.active ? "default" : "secondary"}>
                      {subcategory.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(subcategory)}>
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => toggleActiveMutation.mutate({ 
                            id: subcategory.id, 
                            active: !subcategory.active 
                          })}
                        >
                          {subcategory.active ? (
                            <>
                              <EyeOff className="mr-2 h-4 w-4" />
                              Desativar
                            </>
                          ) : (
                            <>
                              <Eye className="mr-2 h-4 w-4" />
                              Ativar
                            </>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => setDeleteSubcategory(subcategory)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <AlertDialog open={!!deleteSubcategory} onOpenChange={() => setDeleteSubcategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Subcategoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a subcategoria "{deleteSubcategory?.name}"? 
              Esta ação não pode ser desfeita.
              {deleteSubcategory?.product_count > 0 && (
                <div className="mt-2 p-2 bg-warning/10 rounded-md">
                  <strong>Atenção:</strong> Esta subcategoria possui {deleteSubcategory.product_count} produto(s) vinculado(s).
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteSubcategory?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SubcategoryTable;