import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CategoryCreationModalProps {
  onCategoryCreated?: (categoryId: string) => void;
  trigger?: React.ReactNode;
}

export const CategoryCreationModal: React.FC<CategoryCreationModalProps> = ({
  onCategoryCreated,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    icon: '',
    color: '#6366f1'
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createCategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: category, error } = await supabase
        .from('categories')
        .insert([{
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          icon: data.icon,
          color: data.color,
          active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return category;
    },
    onSuccess: (category) => {
      toast({
        title: "Categoria criada",
        description: `A categoria "${category.name}" foi criada com sucesso.`
      });
      
      // Refresh categories query
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      
      // Call callback if provided
      onCategoryCreated?.(category.id);
      
      // Reset form and close modal
      setFormData({ name: '', slug: '', icon: '', color: '#6366f1' });
      setOpen(false);
    },
    onError: (error) => {
      console.error('Error creating category:', error);
      toast({
        title: "Erro ao criar categoria",
        description: "Ocorreu um erro ao criar a categoria. Tente novamente.",
        variant: "destructive"
      });
    }
  });

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove accents
      .replace(/[^a-z0-9\s]/g, '') // Remove special chars
      .replace(/\s+/g, '-') // Replace spaces with hyphens
      .replace(/-+/g, '-') // Replace multiple hyphens with single
      .trim();
  };

  const handleNameChange = (name: string) => {
    setFormData({
      ...formData,
      name,
      slug: generateSlug(name)
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;
    
    createCategoryMutation.mutate(formData);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Nova Categoria
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Nova Categoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="category-name">Nome da Categoria *</Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Eletrônicos, Roupas, Casa e Jardim"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="category-slug">Slug (URL)</Label>
            <Input
              id="category-slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="eletronicos-smartphones"
            />
            <div className="text-xs text-muted-foreground">
              Será gerado automaticamente se deixado em branco
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="category-icon">Ícone (opcional)</Label>
              <Input
                id="category-icon"
                value={formData.icon}
                onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                placeholder="smartphone"
              />
              <div className="text-xs text-muted-foreground">
                Nome do ícone do Lucide React
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="category-color">Cor</Label>
              <div className="flex gap-2">
                <Input
                  id="category-color"
                  type="color"
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  className="w-16 h-10 p-1"
                />
                <Input
                  value={formData.color}
                  onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createCategoryMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name.trim() || createCategoryMutation.isPending}
            >
              {createCategoryMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Categoria
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};