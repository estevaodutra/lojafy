import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
  PaginationEllipsis,
} from '@/components/ui/pagination';
import { TooltipProvider } from '@/components/ui/tooltip';
import { useToast } from '@/hooks/use-toast';
import { 
  Search, 
  Filter, 
  Package, 
  Calculator, 
  Plus, 
  Minus,
  TrendingUp,
  DollarSign,
  Star,
  ShoppingCart,
  ArrowUpDown,
  Check
} from 'lucide-react';
import { useCategories } from '@/hooks/useCategories';
import { useResellerCatalog } from '@/hooks/useResellerCatalog';
import { useResellerStore } from '@/hooks/useResellerStore';
import { ProductCalculatorModal } from '@/components/reseller/ProductCalculatorModal';
import { useSubscriptionCheck } from '@/hooks/useSubscriptionCheck';
import { PremiumRequiredModal } from '@/components/premium/PremiumRequiredModal';

const ResellerCatalog = () => {
  const { toast } = useToast();
  
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [costPrice, setCostPrice] = useState('');
  const [marginPercent, setMarginPercent] = useState('30');
  const [calculatedPrice, setCalculatedPrice] = useState<number | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);
  const [showPremiumModal, setShowPremiumModal] = useState(false);
  const { requiresPremium, paymentUrl } = useSubscriptionCheck();

  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  
  const {
    products,
    isLoading,
    error,
    filters,
    currentPage,
    totalPages,
    totalCount,
    applyFilters,
    goToPage,
    calculateMargin,
    calculatePrice,
    getSuggestedPrice,
    getProductStats,
    ITEMS_PER_PAGE
  } = useResellerCatalog();

  const { addProduct, removeProduct } = useResellerStore();
  

  const stats = getProductStats();

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getStockColor = (stock: number) => {
    if (stock > 20) return 'text-green-600';
    if (stock > 5) return 'text-yellow-600';
    return 'text-red-600';
  };

  const handleSearch = (value: string) => {
    setSearch(value);
    applyFilters({
      ...filters,
      search: value
    });
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    applyFilters({
      ...filters,
      category: value === 'all' ? undefined : value
    });
  };

  const parsePriceRange = (range: string) => {
    switch (range) {
      case '0-100':
        return { min: 0, max: 100 };
      case '100-500':
        return { min: 100, max: 500 };
      case '500-1000':
        return { min: 500, max: 1000 };
      case '1000+':
        return { min: 1000, max: undefined };
      default:
        return { min: undefined, max: undefined };
    }
  };

  const handlePriceRangeChange = (range: string) => {
    setPriceRange(range);
    const { min, max } = parsePriceRange(range);
    applyFilters({
      ...filters,
      priceMin: min,
      priceMax: max
    });
  };

  const handleSortChange = (sort: string) => {
    setSortBy(sort);
    applyFilters({
      ...filters,
      sortBy: sort
    });
  };

  const handleAddToStore = async (productId: string, customPrice?: number) => {
    if (!requiresPremium('Importar Produtos')) {
      setShowPremiumModal(true);
      return;
    }
    
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      const price = customPrice || getSuggestedPrice(product);
      await addProduct(productId, price);
      toast({
        title: "Produto adicionado!",
        description: `${product.name} foi adicionado à sua loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar o produto à loja.",
        variant: "destructive",
      });
    }
  };

  const handleRemoveFromStore = async (productId: string) => {
    try {
      const product = products.find(p => p.id === productId);
      if (!product) return;
      
      await removeProduct(productId);
      toast({
        title: "Produto removido!",
        description: `${product.name} foi removido da sua loja.`,
      });
    } catch (error) {
      toast({
        title: "Erro",
        description: "Não foi possível remover o produto da loja.",
        variant: "destructive",
      });
    }
  };

  const handleOpenCalculator = (product: any) => {
    setSelectedProduct(product);
    setIsCalculatorOpen(true);
  };

  const calculateMarginPrice = () => {
    const cost = parseFloat(costPrice);
    const margin = parseFloat(marginPercent);
    
    if (cost && margin) {
      const calculated = calculatePrice(cost, margin);
      setCalculatedPrice(calculated);
    } else {
      setCalculatedPrice(null);
    }
  };

  return (
    <TooltipProvider>
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
            <ShoppingCart className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.inMyStore}</div>
            <p className="text-xs text-muted-foreground">
              produtos na loja
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Margem Média</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.averageMargin || 0)}%</div>
            <p className="text-xs text-muted-foreground">
              dos produtos
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
              produtos destacados
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtros e Ordenação
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar produtos por nome ou SKU..."
                  value={search}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="categoryFilter">Categoria</Label>
              <Select value={category} onValueChange={handleCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as categorias" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as categorias</SelectItem>
                  {categories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="priceFilter">Faixa de Preço</Label>
              <Select value={priceRange} onValueChange={handlePriceRangeChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Todas as faixas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as faixas</SelectItem>
                  <SelectItem value="0-100">Até R$ 100</SelectItem>
                  <SelectItem value="100-500">R$ 100 - R$ 500</SelectItem>
                  <SelectItem value="500-1000">R$ 500 - R$ 1.000</SelectItem>
                  <SelectItem value="1000+">Acima de R$ 1.000</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="sortFilter">Ordenar por</Label>
              <Select value={sortBy} onValueChange={handleSortChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Nome A-Z" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="name">Nome A-Z</SelectItem>
                  <SelectItem value="price_asc">Menor preço</SelectItem>
                  <SelectItem value="price_desc">Maior preço</SelectItem>
                  <SelectItem value="recent">Mais recentes</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results Info */}
      {!isLoading && products.length > 0 && (
        <div className="flex justify-between items-center mb-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {((currentPage - 1) * ITEMS_PER_PAGE) + 1} - {Math.min(currentPage * ITEMS_PER_PAGE, totalCount)} de {totalCount} produtos
          </p>
        </div>
      )}

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Card key={i}>
              <CardHeader className="pb-2">
                <div className="w-full h-48 bg-muted rounded-lg animate-pulse" />
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-4 bg-muted rounded animate-pulse w-1/2" />
                <div className="grid grid-cols-2 gap-4">
                  <div className="h-4 bg-muted rounded animate-pulse" />
                  <div className="h-4 bg-muted rounded animate-pulse" />
                </div>
                <div className="h-8 bg-muted rounded animate-pulse" />
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
            <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-medium mb-2">Nenhum produto encontrado</h3>
            <p className="text-sm text-muted-foreground">
              Tente ajustar os filtros para encontrar produtos
            </p>
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
                    {product.featured && (
                      <Badge className="absolute top-2 left-2 bg-purple-500 hover:bg-purple-600">
                        <Star className="h-3 w-3 mr-1" />
                        Destaque
                      </Badge>
                    )}
                    {product.high_rotation && (
                      <Badge className="absolute top-2 right-2 bg-orange-500 hover:bg-orange-600">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Alto Giro
                      </Badge>
                    )}
                    {product.isInMyStore && (
                      <Badge className="absolute bottom-2 right-2 bg-green-500 hover:bg-green-600">
                        <Check className="h-3 w-3 mr-1" />
                        Na Loja
                      </Badge>
                    )}
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
                        {product.cost_price ? `R$ ${product.cost_price.toFixed(2)}` : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">
                        {product.isInMyStore ? 'Meu Preço' : 'Preço Sugerido'}
                      </p>
                      <p className="font-medium">
                        R$ {(product.isInMyStore && product.myStorePrice ? product.myStorePrice : suggestedPrice).toFixed(2)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Badge variant="outline" className={getMarginColor(margin)}>
                        {Math.round(margin)}% margem
                      </Badge>
                    </div>
                    <span className={`text-sm ${getStockColor(product.stock_quantity)}`}>
                      {product.stock_quantity} em estoque
                    </span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex space-x-2">
                      {product.isInMyStore ? (
                        <Button 
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleRemoveFromStore(product.id)}
                        >
                          <Minus className="h-4 w-4 mr-1" />
                          Remover
                        </Button>
                      ) : (
                        <Button 
                          className="flex-1"
                          onClick={() => handleAddToStore(product.id)}
                        >
                          <Plus className="h-4 w-4 mr-1" />
                          Adicionar
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleOpenCalculator(product)}
                      >
                        <Calculator className="h-4 w-4 mr-1" />
                        Calcular
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex justify-center mt-8">
          <Pagination>
            <PaginationContent>
              <PaginationItem>
                <PaginationPrevious 
                  onClick={() => goToPage(currentPage - 1)}
                  className={currentPage === 1 ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
              
              {Array.from({ length: totalPages }, (_, i) => i + 1)
                .filter(page => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1)
                .map((page, index, arr) => (
                  <React.Fragment key={page}>
                    {index > 0 && arr[index - 1] !== page - 1 && (
                      <PaginationItem>
                        <PaginationEllipsis />
                      </PaginationItem>
                    )}
                    <PaginationItem>
                      <PaginationLink
                        onClick={() => goToPage(page)}
                        isActive={currentPage === page}
                        className="cursor-pointer"
                      >
                        {page}
                      </PaginationLink>
                    </PaginationItem>
                  </React.Fragment>
                ))}
              
              <PaginationItem>
                <PaginationNext 
                  onClick={() => goToPage(currentPage + 1)}
                  className={currentPage === totalPages ? 'pointer-events-none opacity-50' : 'cursor-pointer'}
                />
              </PaginationItem>
            </PaginationContent>
          </Pagination>
        </div>
      )}

      {/* Global Margin Calculator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Margem Global
          </CardTitle>
          <CardDescription>
            Calcule sua margem de lucro e preço final
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="costPrice">Preço de Custo (R$)</Label>
              <Input 
                id="costPrice"
                type="number" 
                step="0.01"
                placeholder="0.00" 
                value={costPrice}
                onChange={(e) => setCostPrice(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="marginPercent">Margem Desejada (%)</Label>
              <Input 
                id="marginPercent"
                type="number" 
                step="1"
                placeholder="30" 
                value={marginPercent}
                onChange={(e) => setMarginPercent(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="finalPrice">Preço Final (R$)</Label>
              <Input 
                id="finalPrice"
                type="number" 
                placeholder="0.00" 
                value={calculatedPrice?.toFixed(2) || ''}
                disabled 
              />
            </div>
            <div className="flex items-end">
              <Button 
                className="w-full" 
                onClick={calculateMarginPrice}
                disabled={!costPrice || !marginPercent}
              >
                <Calculator className="h-4 w-4 mr-2" />
                Calcular
              </Button>
            </div>
          </div>
          {calculatedPrice && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Lucro:</span>
                <span className="text-lg font-bold text-green-600">
                  R$ {(calculatedPrice - parseFloat(costPrice)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      <ProductCalculatorModal
        product={selectedProduct}
        isOpen={isCalculatorOpen}
        onClose={() => {
          setIsCalculatorOpen(false);
          setSelectedProduct(null);
        }}
        onAddToStore={handleAddToStore}
      />
    </div>
    </TooltipProvider>
  );
};

export default ResellerCatalog;