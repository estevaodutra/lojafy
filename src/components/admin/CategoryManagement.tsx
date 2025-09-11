import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Plus, FolderOpen, Folder, Package, Eye } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import CategoryTable from './CategoryTable';
import CategoryForm from './CategoryForm';
import SubcategoryTable from './SubcategoryTable';
import { CategoryCreationModal } from './CategoryCreationModal';

const CategoryManagement = () => {
  const [showCategoryForm, setShowCategoryForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<any>(null);
  const [selectedCategoryForSubcategories, setSelectedCategoryForSubcategories] = useState<any>(null);

  // Fetch categories with product counts
  const { data: categories = [], isLoading: categoriesLoading, refetch: refetchCategories } = useQuery({
    queryKey: ['admin-categories-with-counts'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select(`
          *,
          products:products(count)
        `)
        .order('name');
      
      if (error) throw error;
      return data.map(cat => ({
        ...cat,
        product_count: cat.products?.[0]?.count || 0
      }));
    },
  });

  // Calculate metrics
  const totalCategories = categories.length;
  const activeCategories = categories.filter(c => c.active).length;
  const categoriesWithProducts = categories.filter(c => c.product_count > 0).length;
  const emptyCategories = categories.filter(c => c.product_count === 0).length;

  const handleCreateCategory = () => {
    setEditingCategory(null);
    setShowCategoryForm(true);
  };

  const handleEditCategory = (category: any) => {
    setEditingCategory(category);
    setShowCategoryForm(true);
  };

  const handleDuplicateCategory = (category: any) => {
    const duplicatedCategory = {
      ...category,
      id: undefined,
      name: `${category.name} (Cópia)`,
      slug: `${category.slug}-copy-${Date.now()}`,
    };
    setEditingCategory(duplicatedCategory);
    setShowCategoryForm(true);
  };

  const handleManageSubcategories = (category: any) => {
    setSelectedCategoryForSubcategories(category);
  };

  const handleFormSuccess = () => {
    setShowCategoryForm(false);
    setEditingCategory(null);
    refetchCategories();
  };

  // If viewing subcategories, show the subcategory table
  if (selectedCategoryForSubcategories) {
    return (
      <SubcategoryTable
        category={selectedCategoryForSubcategories}
        onBack={() => setSelectedCategoryForSubcategories(null)}
        onEdit={(subcategory) => {
          // TODO: Implement subcategory editing
          console.log('Edit subcategory:', subcategory);
        }}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Gestão de Categorias</h2>
          <p className="text-muted-foreground mt-1">
            Organize produtos em categorias e subcategorias
          </p>
        </div>
        <div className="flex gap-2">
          <CategoryCreationModal
            onCategoryCreated={() => refetchCategories()}
            trigger={
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Nova Categoria
              </Button>
            }
          />
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Categorias</CardTitle>
            <FolderOpen className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalCategories}</div>
            <p className="text-xs text-muted-foreground">
              {activeCategories} ativas
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Com Produtos</CardTitle>
            <Package className="h-4 w-4 text-success" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success">{categoriesWithProducts}</div>
            <p className="text-xs text-muted-foreground">
              Possuem produtos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vazias</CardTitle>
            <Folder className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{emptyCategories}</div>
            <p className="text-xs text-muted-foreground">
              Sem produtos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativas</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeCategories}</div>
            <p className="text-xs text-muted-foreground">
              Visíveis no site
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Categories Table */}
      <CategoryTable
        categories={categories}
        loading={categoriesLoading}
        onEdit={handleEditCategory}
        onDuplicate={handleDuplicateCategory}
        onManageSubcategories={handleManageSubcategories}
        onRefresh={refetchCategories}
      />

      {/* Category Form Dialog */}
      <Dialog open={showCategoryForm} onOpenChange={setShowCategoryForm}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingCategory?.id ? 'Editar Categoria' : 'Nova Categoria'}
            </DialogTitle>
            <DialogDescription>
              {editingCategory?.id 
                ? 'Atualize as informações da categoria'
                : 'Cadastre uma nova categoria para organizar produtos'
              }
            </DialogDescription>
          </DialogHeader>
          <CategoryForm 
            category={editingCategory}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowCategoryForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CategoryManagement;