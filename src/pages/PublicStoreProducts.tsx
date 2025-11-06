import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Grid3X3, List, Star, Filter, Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { usePublicStore } from "@/hooks/usePublicStore";
import { usePublicStoreProducts, usePublicStoreCategories } from "@/hooks/usePublicStoreProducts";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import PublicStoreProductCard from "@/components/PublicStoreProductCard";

const PublicStoreProducts = () => {
  const { slug } = useParams<{ slug: string }>();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

  // Get store data
  const { store, isLoading: storeLoading, error: storeError } = usePublicStore(slug);

  // Get products and categories for this store
  const { data: products = [], isLoading: productsLoading } = usePublicStoreProducts(store?.reseller_id || '');
  const { data: categories = [], isLoading: categoriesLoading } = usePublicStoreCategories(store?.reseller_id || '');

  if (storeLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="space-y-4 text-center">
          <Skeleton className="h-8 w-48 mx-auto" />
          <Skeleton className="h-4 w-32 mx-auto" />
        </div>
      </div>
    );
  }

  if (storeError || !store) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">A loja que você está procurando não existe ou foi desativada.</p>
        </div>
      </div>
    );
  }

  // Filter products by category, price and brand
  const filteredProducts = products.filter(resellerProduct => {
    if (!resellerProduct.product) return false;
    if (!resellerProduct.product.active) return false; // Only active products
    
    const product = resellerProduct.product;
    const displayPrice = resellerProduct.custom_price || product.price;
    
    const priceInRange = displayPrice >= priceRange[0] && displayPrice <= priceRange[1];
    const brandMatch = selectedBrand === "all"; // Brand filtering disabled since brand is not available
    const categoryMatch = selectedCategory === "all" || product.category_id === selectedCategory;
    
    return priceInRange && brandMatch && categoryMatch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    const priceA = a.custom_price || a.product.price;
    const priceB = b.custom_price || b.product.price;
    
    switch (sortBy) {
      case "price-low":
        return priceA - priceB;
      case "price-high":
        return priceB - priceA;
      case "rating":
        return (b.product.rating || 0) - (a.product.rating || 0);
      default:
        return 0;
    }
  });

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  // Get unique brands from products
  const brands: string[] = []; // Brand filtering disabled since brand is not available in product data

  const handleFavoriteToggle = (resellerProduct: any) => {
    const product = resellerProduct.product;
    const displayPrice = resellerProduct.custom_price || product.price;
    
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast({
        title: "Removido dos favoritos",
        description: `${product.name} foi removido dos seus favoritos.`,
      });
    } else {
      addToFavorites({
        id: product.id,
        name: product.name,
        price: displayPrice,
        originalPrice: product.price !== displayPrice ? product.price : undefined,
        image: product.main_image_url || product.image_url || (product.images?.[0]) || '/placeholder.svg',
        rating: product.rating || 0,
        badge: product.badge,
        description: product.description || '',
        specifications: product.specifications || {},
        category: '',
        brand: product.brand || '',
        inStock: true,
        images: product.images || [],
        reviews: []
      });
      toast({
        title: "Adicionado aos favoritos",
        description: `${product.name} foi adicionado aos seus favoritos.`,
      });
    }
  };

  return (
    <div 
      className="min-h-screen bg-background"
      style={{
        '--primary': store.primary_color,
        '--secondary': store.secondary_color,
        '--accent': store.accent_color,
      } as React.CSSProperties}
    >
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to={`/loja/${store.store_slug}`} className="hover:text-primary">Início</Link>
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">Todos os Produtos</span>
        </nav>

        <div className="flex gap-8">
          {/* Sidebar Filters */}
          <aside className="hidden lg:block w-64 space-y-6">
            <Card>
              <CardContent className="p-6">
                <h3 className="font-semibold mb-4 flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  Filtros
                </h3>

                {/* Categories */}
                <div className="space-y-3 mb-6">
                  <h4 className="font-medium text-sm">Categorias</h4>
                  <div className="space-y-2">
                    <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                      <SelectTrigger>
                        <SelectValue placeholder="Todas as categorias" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todas as categorias</SelectItem>
                        {categories.map((category) => (
                          <SelectItem key={category.id} value={category.id}>
                            {category.name} ({category.products?.length || 0})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Separator />

                {/* Price Range */}
                <div className="space-y-3 mb-6 mt-6">
                  <h4 className="font-medium text-sm">Faixa de Preço</h4>
                  <div className="px-2">
                    <Slider
                      value={priceRange}
                      onValueChange={setPriceRange}
                      max={10000}
                      step={100}
                      className="w-full"
                    />
                    <div className="flex justify-between text-xs text-muted-foreground mt-2">
                      <span>{formatPrice(priceRange[0])}</span>
                      <span>{formatPrice(priceRange[1])}</span>
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Brands */}
                <div className="space-y-3 mt-6">
                  <h4 className="font-medium text-sm">Marca</h4>
                  <Select value={selectedBrand} onValueChange={setSelectedBrand}>
                    <SelectTrigger>
                      <SelectValue placeholder="Todas as marcas" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas as marcas</SelectItem>
                      {brands.map((brand) => (
                        <SelectItem key={brand} value={brand}>{brand}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </aside>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header with title and controls */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-3xl font-bold">Todos os Produtos</h1>
                <p className="text-muted-foreground">
                  {sortedProducts.length} produtos encontrados
                </p>
              </div>

              <div className="flex items-center gap-4">
                {/* Sort */}
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="relevance">Relevância</SelectItem>
                    <SelectItem value="price-low">Menor preço</SelectItem>
                    <SelectItem value="price-high">Maior preço</SelectItem>
                    <SelectItem value="rating">Melhor avaliado</SelectItem>
                  </SelectContent>
                </Select>

                {/* View Mode */}
                <div className="flex border rounded-md">
                  <Button
                    variant={viewMode === "grid" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("grid")}
                  >
                    <Grid3X3 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                  >
                    <List className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Products Grid */}
            {productsLoading ? (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }>
                {Array.from({ length: 8 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="p-4">
                      <Skeleton className="w-full h-48 rounded-md mb-4" />
                      <Skeleton className="h-4 w-3/4 mb-2" />
                      <Skeleton className="h-4 w-1/2 mb-2" />
                      <Skeleton className="h-6 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : sortedProducts.length === 0 ? (
              <div className="text-center py-12">
                <h3 className="text-lg font-semibold mb-2">Nenhum produto encontrado</h3>
                <p className="text-muted-foreground">Tente ajustar os filtros para encontrar produtos.</p>
              </div>
            ) : (
              <div className={
                viewMode === "grid" 
                  ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                  : "space-y-4"
              }>
                {sortedProducts.map((resellerProduct) => {
                  const product = resellerProduct.product;
                  const displayPrice = resellerProduct.custom_price || product.price;
                  
                  return (
                    <PublicStoreProductCard
                      key={resellerProduct.id}
                      product={{
                        id: product.id,
                        name: product.name,
                        price: displayPrice,
                        original_price: product.price !== displayPrice ? product.price : undefined,
                        main_image_url: product.main_image_url,
                        image_url: product.image_url || (product.images?.[0]) || '/placeholder.svg',
                        rating: product.rating || 0,
                        review_count: 0,
                        badge: product.badge,
                        brand: '',
                        images: product.images || [],
                        category_id: product.category_id,
                        stock_quantity: 1,
                      }}
                      storeSlug={store.store_slug}
                    />
                  );
                })}
              </div>
            )}

            {/* Pagination would go here */}
            <div className="flex justify-center mt-12">
              <div className="flex gap-2">
                <Button variant="outline" size="sm">Anterior</Button>
                <Button size="sm">1</Button>
                <Button variant="outline" size="sm">2</Button>
                <Button variant="outline" size="sm">3</Button>
                <Button variant="outline" size="sm">Próximo</Button>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreProducts;