import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Edit, Trash2, Star, ArrowUp, ArrowDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface HomepageCategory {
  id: string;
  category_id: string;
  position: number;
  is_featured: boolean;
  active: boolean;
  custom_title: string | null;
  custom_description: string | null;
  custom_icon: string | null;
  custom_color: string | null;
  custom_image_url: string | null;
  categories: {
    id: string;
    name: string;
    slug: string;
    icon: string | null;
    color: string | null;
    image_url: string | null;
  };
}

const CategoriasDestaque = () => {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<HomepageCategory | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: homepageCategories, isLoading } = useQuery({
    queryKey: ["admin-homepage-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("homepage_categories")
        .select(`
          *,
          categories (
            id,
            name,
            slug,
            icon,
            color,
            image_url
          )
        `)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: availableCategories } = useQuery({
    queryKey: ["available-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("categories")
        .select("*")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: string; newPosition: number }) => {
      const { error } = await supabase
        .from("homepage_categories")
        .update({ position: newPosition })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-categories"] });
      toast({ title: "Posição atualizada com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar posição",
        variant: "destructive",
      });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from("homepage_categories")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-categories"] });
      toast({ title: "Status atualizado com sucesso!" });
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar status",
        variant: "destructive",
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("homepage_categories")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-categories"] });
      toast({ title: "Categoria removida da homepage!" });
    },
    onError: () => {
      toast({
        title: "Erro ao remover categoria",
        variant: "destructive",
      });
    },
  });

  const movePosition = (id: string, direction: "up" | "down") => {
    if (!homepageCategories) return;

    const currentCategory = homepageCategories.find(c => c.id === id);
    if (!currentCategory) return;

    const newPosition = direction === "up" 
      ? Math.max(1, currentCategory.position - 1)
      : currentCategory.position + 1;

    updatePositionMutation.mutate({ id, newPosition });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <Skeleton className="h-8 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <Skeleton className="h-10 w-32" />
        </div>
        <div className="grid gap-4">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-32 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Categorias em Destaque
          </h1>
          <p className="text-muted-foreground">
            Gerenciar categorias exibidas na homepage
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Categoria
        </Button>
      </div>

      <div className="grid gap-4">
        {homepageCategories?.map((category) => (
          <Card key={category.id} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(category.id, "up")}
                      disabled={category.position === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(category.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      Posição {category.position}
                    </Badge>
                    
                    {category.is_featured && (
                      <Badge variant="default" className="gap-1">
                        <Star className="h-3 w-3" />
                        Destaque Principal
                      </Badge>
                    )}
                  </div>

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {category.custom_title || category.categories.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {category.custom_description || `Categoria: ${category.categories.name}`}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${category.id}`}>Ativo</Label>
                    <Switch
                      id={`active-${category.id}`}
                      checked={category.active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: category.id, active: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingCategory(category);
                      setIsEditModalOpen(true);
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
        ))}

        {(!homepageCategories || homepageCategories.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Nenhuma categoria configurada</CardTitle>
              <CardDescription>
                Adicione categorias para personalizar a exibição na homepage
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Add Category Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Categoria à Homepage</DialogTitle>
          </DialogHeader>
          <AddCategoryForm 
            availableCategories={availableCategories || []}
            onClose={() => setIsAddModalOpen(false)}
            existingCategories={homepageCategories || []}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Category Modal */}
      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Categoria da Homepage</DialogTitle>
          </DialogHeader>
          {editingCategory && (
            <EditCategoryForm 
              category={editingCategory}
              onClose={() => {
                setIsEditModalOpen(false);
                setEditingCategory(null);
              }}
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
  onClose, 
  existingCategories 
}: { 
  availableCategories: any[]; 
  onClose: () => void;
  existingCategories: HomepageCategory[];
}) => {
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [isFeatured, setIsFeatured] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (data: any) => {
      const maxPosition = Math.max(...existingCategories.map(c => c.position), 0) + 1;
      
      const { error } = await supabase
        .from("homepage_categories")
        .insert({
          category_id: data.categoryId,
          position: maxPosition,
          is_featured: data.isFeatured,
          active: true
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-categories"] });
      toast({ title: "Categoria adicionada à homepage!" });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar categoria",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategoryId) return;

    addMutation.mutate({
      categoryId: selectedCategoryId,
      isFeatured
    });
  };

  const usedCategoryIds = existingCategories.map(c => c.category_id);
  const availableOptions = availableCategories.filter(c => !usedCategoryIds.includes(c.id));

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="category">Categoria</Label>
        <Select value={selectedCategoryId} onValueChange={setSelectedCategoryId}>
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

      <div className="flex items-center gap-2">
        <Switch
          id="featured"
          checked={isFeatured}
          onCheckedChange={setIsFeatured}
        />
        <Label htmlFor="featured">Destaque Principal</Label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!selectedCategoryId}>
          Adicionar
        </Button>
      </div>
    </form>
  );
};

// Edit Category Form Component
const EditCategoryForm = ({ 
  category, 
  onClose 
}: { 
  category: HomepageCategory; 
  onClose: () => void;
}) => {
  const [customTitle, setCustomTitle] = useState(category.custom_title || "");
  const [customDescription, setCustomDescription] = useState(category.custom_description || "");
  const [customIcon, setCustomIcon] = useState(category.custom_icon || "");
  const [customColor, setCustomColor] = useState(category.custom_color || "");
  const [isFeatured, setIsFeatured] = useState(category.is_featured);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: async (data: any) => {
      const { error } = await supabase
        .from("homepage_categories")
        .update({
          custom_title: data.customTitle || null,
          custom_description: data.customDescription || null,
          custom_icon: data.customIcon || null,
          custom_color: data.customColor || null,
          is_featured: data.isFeatured
        })
        .eq("id", category.id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-homepage-categories"] });
      toast({ title: "Categoria atualizada!" });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao atualizar categoria",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      customTitle,
      customDescription,
      customIcon,
      customColor,
      isFeatured
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="custom-title">Título Personalizado</Label>
        <Input
          id="custom-title"
          value={customTitle}
          onChange={(e) => setCustomTitle(e.target.value)}
          placeholder={category.categories.name}
        />
      </div>

      <div>
        <Label htmlFor="custom-description">Descrição Personalizada</Label>
        <Textarea
          id="custom-description"
          value={customDescription}
          onChange={(e) => setCustomDescription(e.target.value)}
          placeholder="Descrição da categoria"
        />
      </div>

      <div>
        <Label htmlFor="custom-icon">Ícone Personalizado</Label>
        <Input
          id="custom-icon"
          value={customIcon}
          onChange={(e) => setCustomIcon(e.target.value)}
          placeholder="Nome do ícone Lucide (ex: Smartphone)"
        />
      </div>

      <div>
        <Label htmlFor="custom-color">Cor Personalizada</Label>
        <Input
          id="custom-color"
          value={customColor}
          onChange={(e) => setCustomColor(e.target.value)}
          placeholder="Classe Tailwind (ex: bg-blue-500)"
        />
      </div>

      <div className="flex items-center gap-2">
        <Switch
          id="featured"
          checked={isFeatured}
          onCheckedChange={setIsFeatured}
        />
        <Label htmlFor="featured">Destaque Principal</Label>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit">
          Atualizar
        </Button>
      </div>
    </form>
  );
};

export default CategoriasDestaque;