import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Grid3X3, List, Star, Filter, Heart } from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const Categorias = () => {
  const { slug } = useParams();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [sortBy, setSortBy] = useState("relevance");
  const [priceRange, setPriceRange] = useState([0, 10000]);
  const [selectedBrand, setSelectedBrand] = useState("all");
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { toast } = useToast();

  // Fetch categories
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('categories')
        .select('*')
        .eq('active', true)
        .order('name');
      
      if (error) throw error;
      return data;
    },
  });

  // Fetch products based on category
  const { data: products = [], isLoading: productsLoading } = useQuery({
    queryKey: ['products', slug],
    queryFn: async () => {
      let query = supabase
        .from('products')
        .select(`
          *,
          categories!inner(slug, name)
        `)
        .eq('active', true);

      if (slug) {
        query = query.eq('categories.slug', slug);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      return data;
    },
  });

  const selectedCategory = categories.find(cat => cat.slug === slug);
  
  // Filter products by price and brand
  const filteredProducts = products.filter(product => {
    const priceInRange = product.price >= priceRange[0] && product.price <= priceRange[1];
    const brandMatch = selectedBrand === "all" || product.brand === selectedBrand;
    return priceInRange && brandMatch;
  });

  // Sort products
  const sortedProducts = [...filteredProducts].sort((a, b) => {
    switch (sortBy) {
      case "price-low":
        return a.price - b.price;
      case "price-high":
        return b.price - a.price;
      case "rating":
        return (b.rating || 0) - (a.rating || 0);
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

  const getBadgeVariant = (badge: string): "default" | "destructive" | "secondary" | "outline" => {
    const lowercaseBadge = badge.toLowerCase();
    if (lowercaseBadge.includes('oferta') || lowercaseBadge.includes('desconto')) return "destructive";
    if (lowercaseBadge.includes('novo') || lowercaseBadge.includes('lançamento')) return "default";
    if (lowercaseBadge.includes('popular') || lowercaseBadge.includes('destaque')) return "secondary";
    return "outline";
  };

  // Get unique brands from products
  const brands = [...new Set(products.map(p => p.brand).filter(Boolean))];

  const handleFavoriteToggle = (product: any) => {
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
        price: product.price,
        originalPrice: product.original_price,
        image: product.main_image_url || product.image_url || (product.images?.[0]) || '/placeholder.svg',
        rating: product.rating || 0,
        badge: product.badge,
        description: product.description || '',
        specifications: product.specifications || {},
        category: product.categories?.slug || '',
        brand: product.brand || '',
        inStock: product.stock_quantity > 0,
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
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center space-x-2 text-sm text-muted-foreground mb-6">
          <Link to="/" className="hover:text-primary">Início</Link>
          <ChevronRight className="h-4 w-4" />
          <Link to="/categorias" className="hover:text-primary">Categorias</Link>
          {selectedCategory && (
            <>
              <ChevronRight className="h-4 w-4" />
              <span className="text-foreground">{selectedCategory.name}</span>
            </>
          )}
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
                    {categoriesLoading ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <Skeleton key={i} className="h-8 w-full" />
                      ))
                    ) : (
                      categories.map((category) => (
                        <Link
                          key={category.id}
                          to={`/categorias/${category.slug}`}
                          className={`block text-sm p-2 rounded hover:bg-accent ${
                            selectedCategory?.id === category.id ? 'bg-accent' : ''
                          }`}
                        >
                          {category.name} ({category.product_count || 0})
                        </Link>
                      ))
                    )}
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
                <h1 className="text-3xl font-bold">
                  {selectedCategory ? selectedCategory.name : 'Todas as Categorias'}
                </h1>
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
                {sortedProducts.map((product) => (
                  <Card key={product.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                    <CardContent className="p-4">
                      <Link to={`/produto/${product.id}`}>
                        <div className="relative mb-4">
                          <img
                            src={product.main_image_url || product.image_url || (product.images?.[0]) || '/placeholder.svg'}
                            alt={product.name}
                            className="w-full h-48 object-cover rounded-md"
                          />
                          {product.badge && (
                            <Badge className="absolute top-2 left-2" variant={getBadgeVariant(product.badge)}>
                              {product.badge}
                            </Badge>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            className="absolute top-2 right-2 h-8 w-8 p-0 bg-background/80 hover:bg-background"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              handleFavoriteToggle(product);
                            }}
                          >
                            <Heart className={`h-4 w-4 ${isFavorite(product.id) ? 'fill-red-500 text-red-500' : ''}`} />
                          </Button>
                        </div>

                        <h3 className="font-medium mb-2 line-clamp-2">{product.name}</h3>

                        <div className="flex items-center mb-2">
                          <div className="flex">
                            {[...Array(5)].map((_, i) => (
                              <Star
                                key={i}
                                className={`h-4 w-4 ${
                                  i < Math.floor(product.rating || 0)
                                    ? "fill-yellow-400 text-yellow-400"
                                    : "text-gray-300"
                                }`}
                              />
                            ))}
                          </div>
                          <span className="text-sm text-muted-foreground ml-2">
                            ({product.rating || 0})
                          </span>
                        </div>

                        <div className="space-y-1">
                          {product.original_price && (
                            <p className="text-sm text-muted-foreground line-through">
                              {formatPrice(product.original_price)}
                            </p>
                          )}
                          <p className="text-xl font-bold text-primary">
                            {formatPrice(product.price)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ou 12x de {formatPrice(product.price / 12)} sem juros
                          </p>
                        </div>
                      </Link>

                      <Link to={`/produto/${product.id}`}>
                        <Button className="w-full mt-4">
                          Comprar
                        </Button>
                      </Link>
                    </CardContent>
                  </Card>
                ))}
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

      <Footer />
    </div>
  );
};

export default Categorias;