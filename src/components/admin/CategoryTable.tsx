import React, { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Edit, MoreHorizontal, Trash2, Copy, FolderOpen, Eye, EyeOff, Star, StarOff } from 'lucide-react';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import * as LucideIcons from 'lucide-react';

interface CategoryTableProps {
  categories: any[];
  loading: boolean;
  onEdit: (category: any) => void;
  onDuplicate: (category: any) => void;
  onManageSubcategories: (category: any) => void;
  onRefresh: () => void;
  emptyMessage?: string;
}

const CategoryTable: React.FC<CategoryTableProps> = ({
  categories,
  loading,
  onEdit,
  onDuplicate,
  onManageSubcategories,
  onRefresh,
  emptyMessage = "Nenhuma categoria encontrada."
}) => {
  const [deleteCategory, setDeleteCategory] = useState<any>(null);
  const queryClient = useQueryClient();

  // Fetch homepage categories
  const { data: homepageCategories = [] } = useQuery({
    queryKey: ['homepage-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_categories')
        .select('category_id');
      
      if (error) throw error;
      return data.map(hc => hc.category_id);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (categoryId: string) => {
      const { error } = await supabase
        .from('categories')
        .delete()
        .eq('id', categoryId);
      
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoria excluída com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      onRefresh();
      setDeleteCategory(null);
    },
    onError: (error: any) => {
      toast.error('Erro ao excluir categoria: ' + error.message);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('categories')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: (_, { active }) => {
      toast.success(`Categoria ${active ? 'ativada' : 'desativada'} com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      onRefresh();
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status: ' + error.message);
    },
  });

  const toggleHomepageMutation = useMutation({
    mutationFn: async ({ categoryId, isOnHomepage }: { categoryId: string; isOnHomepage: boolean }) => {
      if (isOnHomepage) {
        // Remove from homepage
        const { error } = await supabase
          .from('homepage_categories')
          .delete()
          .eq('category_id', categoryId);
        
        if (error) throw error;
      } else {
        // Add to homepage
        const { error } = await supabase
          .from('homepage_categories')
          .insert([{
            category_id: categoryId,
            position: 1,
            active: true
          }]);
        
        if (error) throw error;
      }
    },
    onSuccess: (_, { isOnHomepage }) => {
      toast.success(`Categoria ${isOnHomepage ? 'removida da' : 'adicionada à'} homepage com sucesso`);
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
    },
    onError: (error: any) => {
      toast.error('Erro ao alterar status da homepage: ' + error.message);
    },
  });

  const getIconComponent = (iconName: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const getColorPreview = (color: string) => {
    if (!color) return null;
    return (
      <div 
        className="w-4 h-4 rounded-full border border-border"
        style={{ backgroundColor: color }}
      />
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(5)].map((_, i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  if (categories.length === 0) {
    return (
      <div className="text-center py-8">
        <FolderOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Ícone</TableHead>
              <TableHead>Nome</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Cor</TableHead>
              <TableHead>Produtos</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Homepage</TableHead>
              <TableHead className="text-right">Ações</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell>
                  <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-muted">
                    {getIconComponent(category.icon)}
                  </div>
                </TableCell>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell className="text-muted-foreground">{category.slug}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    {getColorPreview(category.color)}
                    <span className="text-xs text-muted-foreground">
                      {category.color}
                    </span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">
                    {category.product_count || 0}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge variant={category.active ? "default" : "secondary"}>
                    {category.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </TableCell>
                <TableCell>
                  {homepageCategories.includes(category.id) ? (
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3" />
                      Na Homepage
                    </Badge>
                  ) : (
                    <Badge variant="outline">
                      Não exibida
                    </Badge>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0">
                        <MoreHorizontal className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => onEdit(category)}>
                        <Edit className="mr-2 h-4 w-4" />
                        Editar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onDuplicate(category)}>
                        <Copy className="mr-2 h-4 w-4" />
                        Duplicar
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => onManageSubcategories(category)}>
                        <FolderOpen className="mr-2 h-4 w-4" />
                        Subcategorias
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => toggleActiveMutation.mutate({ 
                          id: category.id, 
                          active: !category.active 
                        })}
                      >
                        {category.active ? (
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
                        onClick={() => toggleHomepageMutation.mutate({ 
                          categoryId: category.id, 
                          isOnHomepage: homepageCategories.includes(category.id)
                        })}
                      >
                        {homepageCategories.includes(category.id) ? (
                          <>
                            <StarOff className="mr-2 h-4 w-4" />
                            Remover da Homepage
                          </>
                        ) : (
                          <>
                            <Star className="mr-2 h-4 w-4" />
                            Adicionar à Homepage
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setDeleteCategory(category)}
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

      <AlertDialog open={!!deleteCategory} onOpenChange={() => setDeleteCategory(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir Categoria</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a categoria "{deleteCategory?.name}"? 
              Esta ação não pode ser desfeita.
              {deleteCategory?.product_count > 0 && (
                <div className="mt-2 p-2 bg-warning/10 rounded-md">
                  <strong>Atenção:</strong> Esta categoria possui {deleteCategory.product_count} produto(s) vinculado(s).
                </div>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteCategory?.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default CategoryTable;