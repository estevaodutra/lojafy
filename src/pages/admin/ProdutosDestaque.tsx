import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ArrowUp, ArrowDown, Star } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface FeaturedProduct {
  id: string;
  product_id: string;
  position: number;
  active: boolean;
  is_auto_selected: boolean;
  products: {
    id: string;
    name: string;
    price: number;
    image_url: string | null;
    main_image_url: string | null;
    stock_quantity: number;
  };
}

const ProdutosDestaque = () => {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: featuredProducts, isLoading } = useQuery({
    queryKey: ["admin-featured-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("featured_products")
        .select(`
          *,
          products (
            id,
            name,
            price,
            image_url,
            main_image_url,
            stock_quantity
          )
        `)
        .order("position", { ascending: true });

      if (error) throw error;
      return data as any[];
    },
  });

  const { data: availableProducts } = useQuery({
    queryKey: ["available-products"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("products")
        .select("id, name, price, image_url, main_image_url, stock_quantity")
        .eq("active", true)
        .order("name", { ascending: true });

      if (error) throw error;
      return data;
    },
  });

  const updatePositionMutation = useMutation({
    mutationFn: async ({ id, newPosition }: { id: string; newPosition: number }) => {
      const { error } = await supabase
        .from("featured_products")
        .update({ position: newPosition })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
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
        .from("featured_products")
        .update({ active })
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
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
        .from("featured_products")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
      toast({ title: "Produto removido dos destaques!" });
    },
    onError: () => {
      toast({
        title: "Erro ao remover produto",
        variant: "destructive",
      });
    },
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  const movePosition = (id: string, direction: "up" | "down") => {
    if (!featuredProducts) return;

    const currentProduct = featuredProducts.find(p => p.id === id);
    if (!currentProduct) return;

    const newPosition = direction === "up" 
      ? Math.max(1, currentProduct.position - 1)
      : currentProduct.position + 1;

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
            Produtos em Destaque
          </h1>
          <p className="text-muted-foreground">
            Gerenciar produtos exibidos na vitrine da homepage
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Adicionar Produto
        </Button>
      </div>

      <div className="grid gap-4">
        {featuredProducts?.map((featuredProduct) => (
          <Card key={featuredProduct.id} className="border-border">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex flex-col gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(featuredProduct.id, "up")}
                      disabled={featuredProduct.position === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(featuredProduct.id, "down")}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="flex items-center gap-3">
                    <Badge variant="outline">
                      Posição {featuredProduct.position}
                    </Badge>
                    
                    {featuredProduct.is_auto_selected && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" />
                        Automático
                      </Badge>
                    )}
                  </div>

                  {featuredProduct.products.image_url && (
                    <img 
                      src={featuredProduct.products.main_image_url || featuredProduct.products.image_url} 
                      alt={featuredProduct.products.name}
                      className="w-16 h-16 object-cover rounded-md"
                    />
                  )}

                  <div>
                    <h3 className="font-semibold text-foreground">
                      {featuredProduct.products.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {formatPrice(featuredProduct.products.price)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Estoque: {featuredProduct.products.stock_quantity}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Label htmlFor={`active-${featuredProduct.id}`}>Ativo</Label>
                    <Switch
                      id={`active-${featuredProduct.id}`}
                      checked={featuredProduct.active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: featuredProduct.id, active: checked })
                      }
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteMutation.mutate(featuredProduct.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {(!featuredProducts || featuredProducts.length === 0) && (
          <Card>
            <CardHeader>
              <CardTitle>Nenhum produto em destaque</CardTitle>
              <CardDescription>
                Adicione produtos para personalizar a vitrine da homepage
              </CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>

      {/* Add Product Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto aos Destaques</DialogTitle>
          </DialogHeader>
          <AddProductForm 
            availableProducts={availableProducts || []}
            onClose={() => setIsAddModalOpen(false)}
            existingProducts={featuredProducts || []}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add Product Form Component
const AddProductForm = ({ 
  availableProducts, 
  onClose, 
  existingProducts 
}: { 
  availableProducts: any[]; 
  onClose: () => void;
  existingProducts: FeaturedProduct[];
}) => {
  const [selectedProductId, setSelectedProductId] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const maxPosition = Math.max(...existingProducts.map(p => p.position), 0) + 1;
      
      const { error } = await supabase
        .from("featured_products")
        .insert({
          product_id: productId,
          position: maxPosition,
          active: true,
          is_auto_selected: false
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-featured-products"] });
      toast({ title: "Produto adicionado aos destaques!" });
      onClose();
    },
    onError: () => {
      toast({
        title: "Erro ao adicionar produto",
        variant: "destructive",
      });
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) return;

    addMutation.mutate(selectedProductId);
  };

  const usedProductIds = existingProducts.map(p => p.product_id);
  const availableOptions = availableProducts.filter(p => !usedProductIds.includes(p.id));

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat("pt-BR", {
      style: "currency",
      currency: "BRL",
    }).format(price);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="product">Produto</Label>
        <Select value={selectedProductId} onValueChange={setSelectedProductId}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} - {formatPrice(product.price)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex gap-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!selectedProductId}>
          Adicionar
        </Button>
      </div>
    </form>
  );
};

export default ProdutosDestaque;