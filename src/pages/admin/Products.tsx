import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Plus, Package, AlertTriangle, TrendingUp, Download, Upload } from 'lucide-react';
import ProductTable from '@/components/admin/ProductTable';
import ProductForm from '@/components/admin/ProductForm';
import StockAlert from '@/components/admin/StockAlert';
import CategoryManagement from '@/components/admin/CategoryManagement';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

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
          categories(name)
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
          <TabsTrigger value="categories">Categorias</TabsTrigger>
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

        <TabsContent value="categories" className="space-y-4">
          <CategoryManagement />
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

export default Products;