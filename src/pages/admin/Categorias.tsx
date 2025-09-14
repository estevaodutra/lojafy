import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, Star, ArrowUp, ArrowDown, Edit, Trash2, Loader2 } from 'lucide-react';
import CategoryManagement from '@/components/admin/CategoryManagement';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { ColorPicker } from '@/components/admin/ColorPicker';

interface HomepageCategory {
  id: string;
  category_id: string;
  position: number;
  is_featured: boolean;
  active: boolean;
  custom_title?: string;
  custom_description?: string;
  custom_icon?: string;
  custom_color?: string;
  custom_image_url?: string;
  created_at: string;
  updated_at: string;
  categories: {
    id: string;
    name: string;
    slug: string;
    icon?: string;
    color?: string;
    image_url?: string;
  };
}

const Categorias = () => {
  const [activeTab, setActiveTab] = useState('management');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HomepageCategory | null>(null);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch featured categories
  const { data: featuredCategories = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['homepage-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('homepage_categories')
        .select(`
          *,
          categories(*)
        `)
        .order('position');
      
      if (error) throw error;
      return data as any;
    },
  });

  // Fetch available categories
  const { data: availableCategories = [] } = useQuery({
    queryKey: ['available-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Update position mutation
  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, position }: { id: string; position: number }) => {
      const { error } = await supabase
        .from('homepage_categories')
        .update({ position })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
      toast({
        title: "Posição atualizada",
        description: "A ordem das categorias foi alterada.",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('homepage_categories')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('homepage_categories')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
      toast({
        title: "Categoria removida",
        description: "A categoria foi removida da página inicial.",
      });
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (data: { category_id: string; is_featured: boolean }) => {
      const maxPosition = Math.max(...featuredCategories.map(c => c.position), 0);
      const { error } = await supabase
        .from('homepage_categories')
        .insert({
          category_id: data.category_id,
          position: maxPosition + 1,
          is_featured: data.is_featured,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
      setShowAddModal(false);
      toast({
        title: "Categoria adicionada",
        description: "A categoria foi adicionada à página inicial.",
      });
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<HomepageCategory> & { id: string }) => {
      const { error } = await supabase
        .from('homepage_categories')
        .update(data)
        .eq('id', data.id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
      setShowEditModal(false);
      setEditingCategory(null);
      toast({
        title: "Categoria atualizada",
        description: "As alterações foram salvas.",
      });
    },
  });

  const movePosition = (category: HomepageCategory, direction: 'up' | 'down') => {
    const currentPosition = category.position;
    const targetPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
    
    const targetCategory = featuredCategories.find(c => c.position === targetPosition);
    if (!targetCategory) return;

    updatePositionMutation.mutate({ id: category.id, position: targetPosition });
    updatePositionMutation.mutate({ id: targetCategory.id, position: currentPosition });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Categorias</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie categorias e sua exibição na página inicial
          </p>
        </div>
      </div>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="management">Todas as Categorias</TabsTrigger>
          <TabsTrigger value="featured">Categorias em Destaque</TabsTrigger>
        </TabsList>

        <TabsContent value="management" className="space-y-4">
          <CategoryManagement />
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Categorias em Destaque</h2>
              <p className="text-muted-foreground">Gerencie as categorias exibidas na página inicial</p>
            </div>
            <Button onClick={() => setShowAddModal(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Adicionar Categoria
            </Button>
          </div>

          <div className="grid gap-4">
            {featuredLoading ? (
              Array.from({ length: 3 }, (_, i) => (
                <Card key={i}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <Skeleton className="w-16 h-16 rounded" />
                      <div className="flex-1">
                        <Skeleton className="h-6 w-48 mb-2" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                      <div className="flex gap-2">
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                        <Skeleton className="h-8 w-8" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : featuredCategories.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium mb-2">Nenhuma categoria em destaque</h3>
                  <p className="text-muted-foreground mb-4">
                    Adicione categorias para exibir na página inicial
                  </p>
                  <Button onClick={() => setShowAddModal(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Primeira Categoria
                  </Button>
                </CardContent>
              </Card>
            ) : (
              featuredCategories
                .filter((category) => category.categories) // Filter out categories with missing data
                .map((category) => (
                <Card key={category.id}>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                        {category.custom_image_url || category.categories?.image_url ? (
                          <img 
                            src={category.custom_image_url || category.categories?.image_url} 
                            alt={category.custom_title || category.categories?.name || 'Categoria'}
                            className="w-full h-full object-cover rounded"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-muted-foreground" />
                        )}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium">
                            {category.custom_title || category.categories?.name || 'Categoria sem nome'}
                          </h3>
                          {category.is_featured && (
                            <Badge variant="secondary">Destaque Principal</Badge>
                          )}
                          <Badge variant={category.active ? "default" : "secondary"}>
                            {category.active ? "Ativo" : "Inativo"}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {category.custom_description || `Categoria: ${category.categories?.name || 'Indefinida'}`}
                        </p>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => movePosition(category, 'up')}
                          disabled={category.position === 1}
                        >
                          <ArrowUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => movePosition(category, 'down')}
                          disabled={category.position === featuredCategories.length}
                        >
                          <ArrowDown className="h-4 w-4" />
                        </Button>
                        <Switch
                          checked={category.active}
                          onCheckedChange={(checked) =>
                            toggleActiveMutation.mutate({ id: category.id, active: checked })
                          }
                        />
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setEditingCategory(category);
                            setShowEditModal(true);
                          }}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteMutation.mutate(category.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>
      </Tabs>

      {/* Add Category Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Categoria em Destaque</DialogTitle>
            <DialogDescription>
              Selecione uma categoria para adicionar à página inicial
            </DialogDescription>
          </DialogHeader>
          <AddCategoryForm
            availableCategories={availableCategories}
            featuredCategories={featuredCategories}
            onSubmit={(data) => addMutation.mutate(data)}
            isLoading={addMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria em Destaque</DialogTitle>
            <DialogDescription>
              Personalize a exibição da categoria na página inicial
            </DialogDescription>
          </DialogHeader>
          {editingCategory && (
            <EditCategoryForm
              category={editingCategory}
              onSubmit={(data) => updateMutation.mutate({ ...data, id: editingCategory.id })}
              isLoading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add Category Form Component
const AddCategoryForm = ({ 
  availableCategories, 
  featuredCategories, 
  onSubmit, 
  isLoading 
}: {
  availableCategories: any[];
  featuredCategories: HomepageCategory[];
  onSubmit: (data: { category_id: string; is_featured: boolean }) => void;
  isLoading: boolean;
}) => {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [isFeatured, setIsFeatured] = useState(false);

  const featuredCategoryIds = featuredCategories.map(fc => fc.category_id);
  const availableOptions = availableCategories.filter(cat => !featuredCategoryIds.includes(cat.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCategory) {
      onSubmit({ category_id: selectedCategory, is_featured: isFeatured });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="category">Categoria</Label>
        <Select value={selectedCategory} onValueChange={setSelectedCategory} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map((category) => (
              <SelectItem key={category.id} value={category.id}>
                {category.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={isFeatured}
          onCheckedChange={setIsFeatured}
        />
        <Label htmlFor="featured">Destaque Principal</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!selectedCategory || isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Adicionar
        </Button>
      </div>
    </form>
  );
};

// Edit Category Form Component
const EditCategoryForm = ({ 
  category, 
  onSubmit, 
  isLoading 
}: {
  category: HomepageCategory;
  onSubmit: (data: Partial<HomepageCategory>) => void;
  isLoading: boolean;
}) => {
  const [customTitle, setCustomTitle] = useState(category.custom_title || '');
  const [customDescription, setCustomDescription] = useState(category.custom_description || '');
  const [customIcon, setCustomIcon] = useState(category.custom_icon || '');
  const [customColor, setCustomColor] = useState(category.custom_color || '#000000');
  const [isFeatured, setIsFeatured] = useState(category.is_featured);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      custom_title: customTitle || null,
      custom_description: customDescription || null,
      custom_icon: customIcon || null,
      custom_color: customColor,
      is_featured: isFeatured,
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="customTitle">Título Personalizado</Label>
        <Input
          id="customTitle"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder={category.categories.name}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customDescription">Descrição Personalizada</Label>
        <Input
          id="customDescription"
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          placeholder="Descrição da categoria"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customIcon">Ícone Personalizado</Label>
        <Input
          id="customIcon"
          value={customIcon}
          onChange={(e) => setCustomIcon(e.target.value)}
          placeholder="Nome do ícone (ex: Package, Star)"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="customColor">Cor Personalizada</Label>
        <ColorPicker
          color={customColor}
          onChange={setCustomColor}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="featured"
          checked={isFeatured}
          onCheckedChange={setIsFeatured}
        />
        <Label htmlFor="featured">Destaque Principal</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Salvar
        </Button>
      </div>
    </form>
  );
};

export default Categorias;