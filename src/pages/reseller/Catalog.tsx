import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Search, Filter, Plus, Calculator, Package, Star, TrendingUp, Check } from 'lucide-react';
import { useResellerCatalog } from '@/hooks/useResellerCatalog';
import { useCategories } from '@/hooks/useCategories';
import { useResellerStore } from '@/hooks/useResellerStore';

const ResellerCatalog = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [marginCost, setMarginCost] = useState('');
  const [marginPercent, setMarginPercent] = useState('');
  const [finalPrice, setFinalPrice] = useState('');

  const { toast } = useToast();
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  
  const {
    products,
    isLoading,
    error,
    applyFilters,
    calculateMargin,
    calculatePrice,
    getSuggestedPrice,
    getProductStats
  } = useResellerCatalog();

  const { addProduct, removeProduct } = useResellerStore();

  const stats = getProductStats();
  const priceRanges = [
    { value: "all", label: "Todos os preços" },
    { value: "0-500", label: "Até R$ 500" },
    { value: "500-1000", label: "R$ 500 - R$ 1.000" },
    { value: "1000-2000", label: "R$ 1.000 - R$ 2.000" },
    { value: "2000+", label: "Acima de R$ 2.000" }
  ];

  const getMarginColor = (margin: number) => {
    if (margin >= 50) return "text-green-600 bg-green-50";
    if (margin >= 30) return "text-blue-600 bg-blue-50";
    return "text-orange-600 bg-orange-50";
  };

  const getStockColor = (stock: number) => {
    if (stock > 20) return "text-green-600";
    if (stock > 5) return "text-orange-600";
    return "text-red-600";
  };

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    applyFilters({
      search: value,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      ...parsePriceRange(priceRange)
    });
  };

  const handleCategoryChange = (value: string) => {
    setSelectedCategory(value);
    applyFilters({
      search: searchTerm,
      category: value === 'all' ? undefined : value,
      ...parsePriceRange(priceRange)
    });
  };

  const handlePriceRangeChange = (value: string) => {
    setPriceRange(value);
    applyFilters({
      search: searchTerm,
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      ...parsePriceRange(value)
    });
  };

  const parsePriceRange = (range: string) => {
    switch (range) {
      case '0-500':
        return { priceMin: 0, priceMax: 500 };
      case '500-1000':
        return { priceMin: 500, priceMax: 1000 };
      case '1000-2000':
        return { priceMin: 1000, priceMax: 2000 };
      case '2000+':
        return { priceMin: 2000 };
      default:
        return {};
    }
  };

  const handleAddToStore = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const suggestedPrice = getSuggestedPrice(product);
      await addProduct(productId, suggestedPrice);
      
      toast({
        title: "Produto adicionado",
        description: `${product.name} foi adicionado à sua loja`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o produto à loja",
        variant: "destructive"
      });
    }
  };

  const handleRemoveFromStore = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      await removeProduct(productId);
      
      toast({
        title: "Produto removido",
        description: `${product.name} foi removido da sua loja`
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o produto da loja",
        variant: "destructive"
      });
    }
  };

  const calculateMarginPrice = () => {
    const cost = parseFloat(marginCost);
    const percent = parseFloat(marginPercent);
    
    if (cost && percent) {
      const calculatedPrice = calculatePrice(cost, percent);
      setFinalPrice(calculatedPrice.toFixed(2));
    } else {
      setFinalPrice('');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Catálogo de Produtos</h1>
        <p className="text-muted-foreground">
          Explore produtos disponíveis para revenda e adicione à sua loja
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Produtos</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalProducts}</div>
            <p className="text-xs text-muted-foreground">
              produtos disponíveis
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Na Minha Loja</CardTitle>
            <Plus className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inMyStore}</div>
            <p className="text-xs text-muted-foreground">
              produtos ativos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageMargin)}%</div>
            <p className="text-xs text-muted-foreground">
              margem média
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Alto Giro</CardTitle>
            <Star className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.highRotation}</div>
            <p className="text-xs text-muted-foreground">
              produtos em destaque
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos por nome ou SKU..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={selectedCategory} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as categorias</SelectItem>
                {categories.map(category => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priceRange} onValueChange={handlePriceRangeChange}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Faixa de Preço" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os preços</SelectItem>
                <SelectItem value="0-500">Até R$ 500</SelectItem>
                <SelectItem value="500-1000">R$ 500 - R$ 1.000</SelectItem>
                <SelectItem value="1000-2000">R$ 1.000 - R$ 2.000</SelectItem>
                <SelectItem value="2000+">Acima de R$ 2.000</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <Skeleton className="w-full h-48 rounded-lg" />
              </CardHeader>
              <CardContent className="space-y-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <div className="grid grid-cols-2 gap-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-full" />
                </div>
                <Skeleton className="h-8 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : error ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Erro ao carregar produtos: {error}</p>
          </CardContent>
        </Card>
      ) : products.length === 0 ? (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-muted-foreground">Nenhum produto encontrado</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {products.map((product) => {
            const suggestedPrice = getSuggestedPrice(product);
            const margin = product.cost_price ? calculateMargin(product.cost_price, suggestedPrice) : 0;
            
            return (
            <Card key={product.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-2">
                <div className="relative">
                  <img 
                    src={product.main_image_url || product.image_url || "/api/placeholder/300/300"} 
                    alt={product.name}
                    className="w-full h-48 object-cover rounded-lg"
                  />
                  {product.high_rotation && (
                    <Badge className="absolute top-2 left-2 bg-orange-500 hover:bg-orange-600">
                      <Star className="h-3 w-3 mr-1" />
                      Alto Giro
                    </Badge>
                  )}
                  {product.isInMyStore && (
                    <Badge className="absolute top-2 right-2 bg-green-500 hover:bg-green-600">
                      <Check className="h-3 w-3 mr-1" />
                      Na Loja
                    </Badge>
                  )}
                  <Badge 
                    variant="secondary" 
                    className="absolute bottom-2 right-2"
                  >
                    {product.category?.name || 'Sem categoria'}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <CardTitle className="text-lg line-clamp-2">{product.name}</CardTitle>
                  <CardDescription>
                    {product.brand} • SKU: {product.sku}
                  </CardDescription>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Custo</p>
                    <p className="font-medium">
                      {product.cost_price ? `R$ ${product.cost_price.toLocaleString()}` : 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">
                      {product.isInMyStore ? 'Meu Preço' : 'Preço Sugerido'}
                    </p>
                    <p className="font-medium">
                      R$ {(product.isInMyStore && product.myStorePrice ? product.myStorePrice : suggestedPrice).toLocaleString()}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Badge className={getMarginColor(margin)}>
                      {Math.round(margin)}% margem
                    </Badge>
                    <span className={`text-sm ${getStockColor(product.stock_quantity)}`}>
                      {product.stock_quantity} em estoque
                    </span>
                  </div>
                  {product.rating && (
                    <div className="flex items-center space-x-1">
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm">{product.rating}</span>
                    </div>
                  )}
                </div>

                <div className="flex space-x-2">
                  {product.isInMyStore ? (
                    <Button 
                      variant="outline"
                      className="flex-1"
                      onClick={() => handleRemoveFromStore(product.id)}
                    >
                      Remover da Loja
                    </Button>
                  ) : (
                     <Button 
                       className="flex-1"
                       onClick={() => handleAddToStore(product.id)}
                     >
                       <Plus className="h-4 w-4 mr-2" />
                       Adicionar à Loja
                     </Button>
                   )}
                   <Button variant="outline" size="icon">
                     <Calculator className="h-4 w-4" />
                   </Button>
                 </div>
               </CardContent>
             </Card>
           );
         })}
         </div>
       )}

       {/* Margin Calculator */}
      <Card>
        <CardHeader>
          <CardTitle>Calculadora de Margem</CardTitle>
          <CardDescription>
            Calcule sua margem de lucro e preço final
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium">Preço de Custo</label>
              <Input 
                type="number" 
                placeholder="R$ 0,00" 
                value={marginCost}
                onChange={(e) => setMarginCost(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Margem Desejada (%)</label>
              <Input 
                type="number" 
                placeholder="30%" 
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Preço Final</label>
              <Input 
                type="number" 
                placeholder="R$ 0,00" 
                value={finalPrice}
                disabled 
              />
            </div>
            <div className="flex items-end">
              <Button className="w-full" onClick={calculateMarginPrice}>
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ResellerCatalog;