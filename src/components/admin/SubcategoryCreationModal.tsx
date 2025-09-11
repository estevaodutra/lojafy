import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface SubcategoryCreationModalProps {
  categoryId: string;
  onSubcategoryCreated?: (subcategoryId: string) => void;
  trigger?: React.ReactNode;
}

export const SubcategoryCreationModal: React.FC<SubcategoryCreationModalProps> = ({
  categoryId,
  onSubcategoryCreated,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    slug: ''
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  const createSubcategoryMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const { data: subcategory, error } = await supabase
        .from('subcategories')
        .insert([{
          category_id: categoryId,
          name: data.name,
          slug: data.slug || data.name.toLowerCase().replace(/\s+/g, '-'),
          active: true
        }])
        .select()
        .single();

      if (error) throw error;
      return subcategory;
    },
    onSuccess: (subcategory) => {
      toast({
        title: "Subcategoria criada",
        description: `A subcategoria "${subcategory.name}" foi criada com sucesso.`
      });
      
      // Refresh subcategories query
      queryClient.invalidateQueries({ queryKey: ['subcategories', categoryId] });
      
      // Call callback if provided
      onSubcategoryCreated?.(subcategory.id);
      
      // Reset form and close modal
      setFormData({ name: '', slug: '' });
      setOpen(false);
    },
    onError: (error) => {
      console.error('Error creating subcategory:', error);
      toast({
        title: "Erro ao criar subcategoria",
        description: "Ocorreu um erro ao criar a subcategoria. Tente novamente.",
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
    
    createSubcategoryMutation.mutate(formData);
  };

  const defaultTrigger = (
    <Button variant="outline" size="sm">
      <Plus className="h-4 w-4 mr-2" />
      Nova Subcategoria
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Criar Nova Subcategoria</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subcategory-name">Nome da Subcategoria *</Label>
            <Input
              id="subcategory-name"
              value={formData.name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="Ex: Smartphones, Tablets, Acessórios"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="subcategory-slug">Slug (URL)</Label>
            <Input
              id="subcategory-slug"
              value={formData.slug}
              onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
              placeholder="smartphones"
            />
            <div className="text-xs text-muted-foreground">
              Será gerado automaticamente se deixado em branco
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)}
              disabled={createSubcategoryMutation.isPending}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={!formData.name.trim() || createSubcategoryMutation.isPending}
            >
              {createSubcategoryMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              Criar Subcategoria
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};