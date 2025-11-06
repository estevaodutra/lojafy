import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, Plus, AlertCircle, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ProductTable from "@/components/admin/ProductTable";
import ProductForm from "@/components/admin/ProductForm";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useSupplierProducts, useSupplierProductStats } from "@/hooks/useSupplierProducts";
import { useAuth } from "@/contexts/AuthContext";

const SupplierProductManagement = () => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: products = [], isLoading, refetch } = useSupplierProducts();
  const { data: stats } = useSupplierProductStats();

  const handleCreateProduct = () => {
    setEditingProduct(null);
    setIsDialogOpen(true);
  };

  const handleEditProduct = (product: any) => {
    setEditingProduct(product);
    setIsDialogOpen(true);
  };

  const handleSuccess = () => {
    refetch();
    setIsDialogOpen(false);
    setEditingProduct(null);
  };

  const handleDuplicate = (product: any) => {
    setEditingProduct({ ...product, id: undefined, name: `${product.name} (Cópia)` });
    setIsDialogOpen(true);
  };

  const lowStockProducts = products.filter(p => p.stock_quantity <= 5 && p.stock_quantity > 0);
  const outOfStockProducts = products.filter(p => p.stock_quantity === 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Meus Produtos</h1>
          <p className="text-muted-foreground">Gerencie seu catálogo de produtos</p>
        </div>
        <Button onClick={handleCreateProduct}>
          <Plus className="w-4 h-4 mr-2" />
          Novo Produto
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.total || 0}</div>
            <p className="text-xs text-muted-foreground">
              no seu catálogo
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.active || 0}</div>
            <p className="text-xs text-muted-foreground">
              disponíveis para venda
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats?.lowStock || 0}</div>
            <p className="text-xs text-muted-foreground">
              precisam de atenção
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem Estoque</CardTitle>
            <PackageX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats?.outOfStock || 0}</div>
            <p className="text-xs text-muted-foreground">
              produtos esgotados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Products Table */}
      <Tabs defaultValue="all" className="space-y-4">
        <TabsList>
          <TabsTrigger value="all">
            Todos ({products.length})
          </TabsTrigger>
          <TabsTrigger value="low-stock">
            Estoque Baixo ({lowStockProducts.length})
          </TabsTrigger>
          <TabsTrigger value="out-of-stock">
            Sem Estoque ({outOfStockProducts.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="all">
          <Card>
            <CardHeader>
              <CardTitle>Todos os Produtos</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductTable
                products={products}
                loading={isLoading}
                onEdit={handleEditProduct}
                onDuplicate={handleDuplicate}
                onRefresh={refetch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="low-stock">
          <Card>
            <CardHeader>
              <CardTitle>Produtos com Estoque Baixo</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductTable
                products={lowStockProducts}
                loading={isLoading}
                onEdit={handleEditProduct}
                onDuplicate={handleDuplicate}
                onRefresh={refetch}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="out-of-stock">
          <Card>
            <CardHeader>
              <CardTitle>Produtos Sem Estoque</CardTitle>
            </CardHeader>
            <CardContent>
              <ProductTable
                products={outOfStockProducts}
                loading={isLoading}
                onEdit={handleEditProduct}
                onDuplicate={handleDuplicate}
                onRefresh={refetch}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Product Form Dialog */}
      {isDialogOpen && (
        <ProductForm
          product={editingProduct}
          onSuccess={handleSuccess}
          onCancel={() => {
            setIsDialogOpen(false);
            setEditingProduct(null);
          }}
        />
      )}
    </div>
  );
};

export default SupplierProductManagement;
