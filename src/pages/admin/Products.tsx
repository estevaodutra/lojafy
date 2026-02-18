import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertTriangle, TrendingUp, Download, Upload, ArrowUp, ArrowDown, Edit, Trash2, Loader2, Star } from 'lucide-react';
import ProductTable from '@/components/admin/ProductTable';
import ProductForm from '@/components/admin/ProductForm';
import StockAlert from '@/components/admin/StockAlert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';

const Products = () => {
  const [showProductForm, setShowProductForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  // Fetch products data
  const { data: products = [], isLoading: productsLoading, refetch: refetchProducts } = useQuery({
    queryKey: ['admin-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select(`
          *,
          categories(name),
          product_marketplace_data(id, marketplace, listing_status)
        `)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch categories for metrics
  const { data: categories = [] } = useQuery({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true);
      
      if (error) throw error;
      return data;
    },
  });

  // Calculate metrics
  const totalProducts = products.length;
  const activeProducts = products.filter(p => p.active).length;
  const lowStockProducts = products.filter(p => p.stock_quantity <= p.min_stock_level);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setShowProductForm(true);
  };

  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setShowProductForm(true);
  };

  const handleDuplicateProduct = (product) => {
    const duplicatedProduct = {
      ...product,
      id: undefined,
      name: `${product.name} (Cópia)`,
      sku: `${product.sku}-COPY-${Date.now()}`,
      stock_quantity: 0,
    };
    setEditingProduct(duplicatedProduct);
    setShowProductForm(true);
  };

  const handleFormSuccess = () => {
    setShowProductForm(false);
    setEditingProduct(null);
    refetchProducts();
  };

  const handleExportProducts = () => {
    const csvContent = [
      ['ID', 'Nome', 'SKU', 'Preço', 'Categoria', 'Estoque', 'Status'].join(','),
      ...products.map(p => [
        p.id,
        `"${p.name}"`,
        p.sku || '',
        p.price,
        p.categories?.name || '',
        p.stock_quantity,
        p.active ? 'Ativo' : 'Inativo'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `produtos_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Gestão de Produtos</h1>
          <p className="text-muted-foreground mt-2">
            Gerencie o catálogo de produtos, controle estoque e acompanhe relatórios
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportProducts}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
          <Button onClick={handleCreateProduct}>
            <Plus className="h-4 w-4 mr-2" />
            Novo Produto
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              {activeProducts} ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className="h-4 w-4 text-warning" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-warning">{lowStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Precisam reposição
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{outOfStockProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Indisponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Categorias</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{categories.length}</div>
            <p className="text-xs text-muted-foreground">
              Disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alta Rotatividade</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {products.filter(p => p.high_rotation).length}
            </div>
            <p className="text-xs text-muted-foreground">
              Produtos em destaque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Alerts */}
      {lowStockProducts.length > 0 && (
        <StockAlert products={lowStockProducts} onRefresh={refetchProducts} />
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="all">Todos os Produtos</TabsTrigger>
          <TabsTrigger value="low-stock">Estoque Baixo</TabsTrigger>
          <TabsTrigger value="out-of-stock">Sem Estoque</TabsTrigger>
          <TabsTrigger value="featured">Produtos em Destaque</TabsTrigger>
          <TabsTrigger value="reports">Relatórios</TabsTrigger>
        </TabsList>

        <TabsContent value="all" className="space-y-4">
          <ProductTable 
            products={products}
            loading={productsLoading}
            onEdit={handleEditProduct}
            onDuplicate={handleDuplicateProduct}
            onRefresh={refetchProducts}
          />
        </TabsContent>

        <TabsContent value="low-stock" className="space-y-4">
          <ProductTable 
            products={lowStockProducts}
            loading={productsLoading}
            onEdit={handleEditProduct}
            onDuplicate={handleDuplicateProduct}
            onRefresh={refetchProducts}
            emptyMessage="Nenhum produto com estoque baixo encontrado."
          />
        </TabsContent>

        <TabsContent value="out-of-stock" className="space-y-4">
          <ProductTable 
            products={outOfStockProducts}
            loading={productsLoading}
            onEdit={handleEditProduct}
            onDuplicate={handleDuplicateProduct}
            onRefresh={refetchProducts}
            emptyMessage="Nenhum produto sem estoque encontrado."
          />
        </TabsContent>

        <TabsContent value="featured" className="space-y-4">
          <FeaturedProductsTab />
        </TabsContent>

        <TabsContent value="reports" className="space-y-4">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Relatório de Giro de Produtos</CardTitle>
                <CardDescription>
                  Análise de movimentação e performance de produtos
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">
                    Relatórios detalhados estarão disponíveis em breve
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      <Dialog open={showProductForm} onOpenChange={setShowProductForm}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct?.id ? 'Editar Produto' : 'Novo Produto'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct?.id 
                ? 'Atualize as informações do produto'
                : 'Cadastre um novo produto no catálogo'
              }
            </DialogDescription>
          </DialogHeader>
          <ProductForm 
            product={editingProduct}
            onSuccess={handleFormSuccess}
            onCancel={() => setShowProductForm(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Featured Products Tab Component
const FeaturedProductsTab = () => {
  const [showAddModal, setShowAddModal] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch featured products
  const { data: featuredProducts = [], isLoading: featuredLoading } = useQuery({
    queryKey: ['featured-products'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('featured_products')
        .select(`
          *,
          products!inner(*)
        `)
        .order('position');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch available products
  const { data: availableProducts = [] } = useQuery({
    queryKey: ['available-products-for-featured'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
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
        .from('featured_products')
        .update({ position })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      toast({
        title: "Posição atualizada",
        description: "A ordem dos produtos foi alterada.",
      });
    },
  });

  // Toggle active mutation
  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('featured_products')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('featured_products')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      toast({
        title: "Produto removido",
        description: "O produto foi removido dos destaques.",
      });
    },
  });

  // Add mutation
  const addMutation = useMutation({
    mutationFn: async (productId: string) => {
      const maxPosition = Math.max(...featuredProducts.map(p => p.position), 0);
      const { error } = await supabase
        .from('featured_products')
        .insert({
          product_id: productId,
          position: maxPosition + 1,
        });
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['featured-products'] });
      setShowAddModal(false);
      toast({
        title: "Produto adicionado",
        description: "O produto foi adicionado aos destaques.",
      });
    },
  });

  const movePosition = (product: any, direction: 'up' | 'down') => {
    const currentPosition = product.position;
    const targetPosition = direction === 'up' ? currentPosition - 1 : currentPosition + 1;
    
    const targetProduct = featuredProducts.find(p => p.position === targetPosition);
    if (!targetProduct) return;

    updatePositionMutation.mutate({ id: product.id, position: targetPosition });
    updatePositionMutation.mutate({ id: targetProduct.id, position: currentPosition });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Produtos em Destaque</h2>
          <p className="text-muted-foreground">Gerencie os produtos exibidos na página inicial</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Produto
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
        ) : featuredProducts.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Star className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium mb-2">Nenhum produto em destaque</h3>
              <p className="text-muted-foreground mb-4">
                Adicione produtos para exibir na página inicial
              </p>
              <Button onClick={() => setShowAddModal(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Adicionar Primeiro Produto
              </Button>
            </CardContent>
          </Card>
        ) : (
          featuredProducts.map((featured) => (
            <Card key={featured.id}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 bg-muted rounded flex items-center justify-center">
                    {(featured.products as any)?.main_image_url || (featured.products as any)?.image_url ? (
                      <img 
                        src={(featured.products as any)?.main_image_url || (featured.products as any)?.image_url} 
                        alt={(featured.products as any)?.name}
                        className="w-full h-full object-cover rounded"
                      />
                    ) : (
                      <Package className="h-8 w-8 text-muted-foreground" />
                    )}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium">{(featured.products as any)?.name}</h3>
                      <Badge variant={featured.active ? "default" : "secondary"}>
                        {featured.active ? "Ativo" : "Inativo"}
                      </Badge>
                      {(featured.products as any)?.featured && (
                        <Badge variant="outline">Produto em Destaque</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      R$ {(featured.products as any)?.price} • Estoque: {(featured.products as any)?.stock_quantity}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(featured, 'up')}
                      disabled={featured.position === 1}
                    >
                      <ArrowUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => movePosition(featured, 'down')}
                      disabled={featured.position === featuredProducts.length}
                    >
                      <ArrowDown className="h-4 w-4" />
                    </Button>
                    <Switch
                      checked={featured.active}
                      onCheckedChange={(checked) =>
                        toggleActiveMutation.mutate({ id: featured.id, active: checked })
                      }
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => deleteMutation.mutate(featured.id)}
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

      {/* Add Product Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adicionar Produto em Destaque</DialogTitle>
            <DialogDescription>
              Selecione um produto para adicionar aos destaques da página inicial
            </DialogDescription>
          </DialogHeader>
          <AddProductForm
            availableProducts={availableProducts}
            featuredProducts={featuredProducts}
            onSubmit={(productId) => addMutation.mutate(productId)}
            isLoading={addMutation.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Add Product Form Component
const AddProductForm = ({ 
  availableProducts, 
  featuredProducts, 
  onSubmit, 
  isLoading 
}: {
  availableProducts: any[];
  featuredProducts: any[];
  onSubmit: (productId: string) => void;
  isLoading: boolean;
}) => {
  const [selectedProduct, setSelectedProduct] = useState('');

  const featuredProductIds = featuredProducts.map(fp => fp.product_id);
  const availableOptions = availableProducts.filter(product => !featuredProductIds.includes(product.id));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedProduct) {
      onSubmit(selectedProduct);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="product">Produto</Label>
        <Select value={selectedProduct} onValueChange={setSelectedProduct} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione um produto" />
          </SelectTrigger>
          <SelectContent>
            {availableOptions.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.name} - R$ {product.price}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={!selectedProduct || isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Adicionar
        </Button>
      </div>
    </form>
  );
};

export default Products;