import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Loader2, Star } from 'lucide-react';
import * as LucideIcons from 'lucide-react';

interface CategoryFormProps {
  category?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

const PREDEFINED_COLORS = [
  '#3b82f6', '#ef4444', '#10b981', '#f59e0b', 
  '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16',
  '#f97316', '#6366f1', '#14b8a6', '#eab308'
];

const POPULAR_ICONS = [
  'Package', 'Laptop', 'Smartphone', 'Headphones', 'Watch',
  'Camera', 'Gamepad2', 'Book', 'Shirt', 'Home',
  'Car', 'Plane', 'Music', 'Video', 'Palette'
];

const CategoryForm: React.FC<CategoryFormProps> = ({
  category,
  onSuccess,
  onCancel
}) => {
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    color: '#3b82f6',
    active: true
  });
  
  const [showOnHomepage, setShowOnHomepage] = useState(false);

  const queryClient = useQueryClient();

  // Check if category is on homepage
  const { data: homepageCategory } = useQuery({
    queryKey: ['homepage-category', category?.id],
    queryFn: async () => {
      if (!category?.id) return null;
      const { data, error } = await supabase
        .from('homepage_categories')
        .select('*')
        .eq('category_id', category.id)
        .single();
      
      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!category?.id,
  });

  useEffect(() => {
    if (category) {
      setFormData({
        name: category.name || '',
        slug: category.slug || '',
        icon: category.icon || '',
        color: category.color || '#3b82f6',
        active: category.active ?? true
      });
    }
  }, [category]);

  useEffect(() => {
    setShowOnHomepage(!!homepageCategory);
  }, [homepageCategory]);

  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
  };

  const handleNameChange = (name: string) => {
    setFormData(prev => ({
      ...prev,
      name,
      slug: generateSlug(name)
    }));
  };

  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      let categoryId = category?.id;
      
      if (category?.id) {
        const { error } = await supabase
          .from('categories')
          .update(data)
          .eq('id', category.id);
        
        if (error) throw error;
      } else {
        const { data: newCategory, error } = await supabase
          .from('categories')
          .insert([data])
          .select()
          .single();
        
        if (error) throw error;
        categoryId = newCategory.id;
      }

      // Handle homepage category
      if (showOnHomepage && !homepageCategory) {
        // Add to homepage
        const { error } = await supabase
          .from('homepage_categories')
          .insert([{
            category_id: categoryId,
            position: 1,
            active: true
          }]);
        
        if (error) throw error;
      } else if (!showOnHomepage && homepageCategory) {
        // Remove from homepage
        const { error } = await supabase
          .from('homepage_categories')
          .delete()
          .eq('id', homepageCategory.id);
        
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(category?.id ? 'Categoria atualizada com sucesso' : 'Categoria criada com sucesso');
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-categories'] });
      queryClient.invalidateQueries({ queryKey: ['homepage-categories-with-count'] });
      onSuccess();
    },
    onError: (error: any) => {
      toast.error('Erro ao salvar categoria: ' + error.message);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error('Nome é obrigatório');
      return;
    }
    
    if (!formData.slug.trim()) {
      toast.error('Slug é obrigatório');
      return;
    }

    saveMutation.mutate(formData);
  };

  const getIconComponent = (iconName: string) => {
    if (!iconName) return null;
    const IconComponent = (LucideIcons as any)[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Nome da Categoria *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Ex: Eletrônicos"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input
            id="slug"
            value={formData.slug}
            onChange={(e) => setFormData(prev => ({ ...prev, slug: e.target.value }))}
            placeholder="eletronicos"
            required
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="icon">Ícone</Label>
          <Select
            value={formData.icon}
            onValueChange={(value) => setFormData(prev => ({ ...prev, icon: value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Selecione um ícone">
                <div className="flex items-center gap-2">
                  {getIconComponent(formData.icon)}
                  <span>{formData.icon || 'Selecione um ícone'}</span>
                </div>
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {POPULAR_ICONS.map((iconName) => {
                const IconComponent = (LucideIcons as any)[iconName];
                return (
                  <SelectItem key={iconName} value={iconName}>
                    <div className="flex items-center gap-2">
                      {IconComponent && <IconComponent className="h-4 w-4" />}
                      <span>{iconName}</span>
                    </div>
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="color">Cor</Label>
          <div className="flex gap-2">
            <Input
              id="color"
              type="color"
              value={formData.color}
              onChange={(e) => setFormData(prev => ({ ...prev, color: e.target.value }))}
              className="w-16 h-10 p-1 border rounded cursor-pointer"
            />
            <div className="flex-1">
              <Select
                value={formData.color}
                onValueChange={(value) => setFormData(prev => ({ ...prev, color: value }))}
              >
                <SelectTrigger>
                  <SelectValue>
                    <div className="flex items-center gap-2">
                      <div 
                        className="w-4 h-4 rounded-full border"
                        style={{ backgroundColor: formData.color }}
                      />
                      <span>{formData.color}</span>
                    </div>
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {PREDEFINED_COLORS.map((color) => (
                    <SelectItem key={color} value={color}>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: color }}
                        />
                        <span>{color}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="active"
            checked={formData.active}
            onCheckedChange={(checked) => setFormData(prev => ({ ...prev, active: checked }))}
          />
          <Label htmlFor="active">Categoria ativa</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="homepage"
            checked={showOnHomepage}
            onCheckedChange={setShowOnHomepage}
          />
          <Label htmlFor="homepage" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Mostrar na Homepage
          </Label>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={saveMutation.isPending}>
          {saveMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {category?.id ? 'Atualizar' : 'Criar'} Categoria
        </Button>
      </div>
    </form>
  );
};

export default CategoryForm;