import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { useResellerStore } from '@/hooks/useResellerStore';
import { useToast } from '@/hooks/use-toast';
import { 
  Package, 
  Edit,
  Check,
  X,
  Pencil,
  Plus,
  Search,
  Filter,
  TrendingUp,
  Eye,
  Trash2
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const ResellerProducts = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const { 
    products, 
    isLoading, 
    updateProductStatus, 
    updateProductPrice,
    removeProduct 
  } = useResellerStore();

  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [newPrice, setNewPrice] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  const toggleProductActive = async (productId: string, newStatus: boolean) => {
    try {
      await updateProductStatus(productId, newStatus);
      toast({
        title: newStatus ? "Produto ativado" : "Produto desativado",
        description: `Produto foi ${newStatus ? 'adicionado à' : 'removido da'} loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o produto.",
        variant: "destructive",
      });
    }
  };

  const handlePriceEdit = (productId: string, currentPrice: string) => {
    setEditingPrice(productId);
    setNewPrice(currentPrice);
  };

  const handlePriceSave = async (productId: string) => {
    try {
      const price = parseFloat(newPrice);
      if (isNaN(price) || price <= 0) {
        toast({
          title: "Erro",
          description: "Preço inválido",
          variant: "destructive",
        });
        return;
      }

      await updateProductPrice(productId, price);
      setEditingPrice(null);
      setNewPrice('');
      
      toast({
        title: "Preço atualizado!",
        description: "O preço do produto foi atualizado com sucesso.",
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível atualizar o preço.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveProduct = async (productId: string, productName: string) => {
    try {
      await removeProduct(productId);
      toast({
        title: "Produto removido",
        description: `${productName} foi removido da sua loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o produto.",
        variant: "destructive",
      });
    }
  };

  // Filter products based on search term
  const filteredProducts = products.filter(product =>
    product.product?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.product?.sku?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Calculate stats
  const activeProducts = products.filter(p => p.active).length;
  const totalProducts = products.length;
  const totalRevenue = products
    .filter(p => p.active)
    .reduce((sum, p) => sum + (p.custom_price || 0), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Meus Produtos</h1>
          <p className="text-muted-foreground">
            Gerencie os produtos da sua loja e defina preços personalizados
          </p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={() => navigate('/reseller/catalogo')}>
            <Plus className="h-4 w-4 mr-2" />
            Adicionar Produtos
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              produtos em sua loja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Produtos Ativos</CardTitle>
            <Eye className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeProducts}</div>
            <p className="text-xs text-muted-foreground">
              visíveis na loja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Valor Total</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
            </div>
            <p className="text-xs text-muted-foreground">
              em produtos ativos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Buscar produtos..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Products List */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Produtos</CardTitle>
          <CardDescription>
            {filteredProducts.length} produto{filteredProducts.length !== 1 ? 's' : ''} encontrado{filteredProducts.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {products.length === 0 ? (
                  <>
                    <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium mb-2">Nenhum produto adicionado ainda</p>
                    <p className="text-sm mb-4">Vá para o Catálogo para adicionar produtos à sua loja.</p>
                    <Button onClick={() => navigate('/reseller/catalogo')}>
                      <Plus className="h-4 w-4 mr-2" />
                      Explorar Catálogo
                    </Button>
                  </>
                ) : (
                  <>
                    <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum produto encontrado com "{searchTerm}"</p>
                  </>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {filteredProducts.map((product) => (
                  <Card key={product.id} className="p-4">
                    <div className="flex items-start gap-4">
                      <div className="w-20 h-20 flex-shrink-0 overflow-hidden rounded-lg bg-muted">
                        {product.product?.main_image_url ? (
                          <img 
                            src={product.product.main_image_url} 
                            alt={product.product.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                            <span className="text-xs text-muted-foreground">Sem foto</span>
                          </div>
                        )}
                      </div>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <h4 className="font-semibold text-base line-clamp-2">
                            {product.product?.name}
                          </h4>
                        <Badge 
                          variant={product.active ? "default" : "secondary"}
                          className={product.active ? "bg-green-100 text-green-800 hover:bg-green-100 border-green-200" : ""}
                        >
                          {product.active ? "Ativo" : "Inativo"}
                        </Badge>
                        </div>
                        
                        {product.product?.sku && (
                          <p className="text-sm text-muted-foreground mb-3">
                            SKU: {product.product.sku}
                          </p>
                        )}
                        
                        <div className="grid grid-cols-2 gap-4 text-sm mb-3">
                          <div>
                            <span className="text-muted-foreground">Preço Original:</span>
                            <p className="font-medium">
                              {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.product?.price || 0)}
                            </p>
                          </div>
                          <div>
                            <span className="text-muted-foreground">Seu Preço:</span>
                            {editingPrice === product.id ? (
                              <div className="flex gap-1 mt-1">
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={newPrice}
                                  onChange={(e) => setNewPrice(e.target.value)}
                                  className="h-8 text-sm"
                                  placeholder="0,00"
                                />
                                <Button
                                  size="sm"
                                  onClick={() => handlePriceSave(product.id)}
                                  className="h-8 px-2"
                                >
                                  <Check className="h-3 w-3" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => setEditingPrice(null)}
                                  className="h-8 px-2"
                                >
                                  <X className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 mt-1">
                                <p className="font-bold text-primary">
                                  {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.custom_price || 0)}
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => handlePriceEdit(product.id, product.custom_price?.toString() || '')}
                                  className="h-6 w-6 p-0"
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col gap-2">
                        <Button
                          size="sm"
                          variant={product.active ? "default" : "outline"}
                          onClick={() => toggleProductActive(product.id, !product.active)}
                          className="text-xs px-3"
                        >
                          {product.active ? "Desativar" : "Ativar"}
                        </Button>
                        
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              className="text-xs px-3"
                            >
                              <Trash2 className="h-3 w-3 mr-1" />
                              Remover
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Remover produto da loja</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja remover "{product.product?.name}" da sua loja? 
                                Esta ação não pode ser desfeita, mas você pode adicionar o produto novamente depois.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRemoveProduct(product.product_id, product.product?.name || "este produto")}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                Remover
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerProducts;