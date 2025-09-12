import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Heart, ShoppingCart, Search, Star } from "lucide-react";
import { Link } from "react-router-dom";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { Product } from "@/types";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const Busca = () => {
  const [searchParams] = useSearchParams();
  const searchQuery = searchParams.get("q") || "";
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addItem } = useCart();

  useEffect(() => {
    const searchProducts = async () => {
      if (!searchQuery.trim()) {
        setProducts([]);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .ilike("name", `%${searchQuery}%`)
          .eq("active", true)
          .order("created_at", { ascending: false });

        if (error) {
          console.error("Error searching products:", error);
          toast.error("Erro ao buscar produtos");
          setProducts([]);
        } else {
          setProducts(data || []);
        }
      } catch (error) {
        console.error("Error searching products:", error);
        toast.error("Erro ao buscar produtos");
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    searchProducts();
  }, [searchQuery]);

  const handleToggleFavorite = (product: any) => {
    const productData: Product = {
      id: product.id,
      name: product.name,
      price: product.price,
      originalPrice: product.original_price,
      image: product.image_url || product.images?.[0] || "/placeholder.svg",
      rating: product.rating || 0,
      badge: product.badge,
      description: product.description,
      specifications: product.specifications || {},
      category: product.category_id,
      brand: product.brand,
      inStock: product.stock_quantity > 0,
      images: product.images || [product.image_url],
      reviews: []
    };

    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast.success("Produto removido dos favoritos");
    } else {
      addToFavorites(productData);
      toast.success("Produto adicionado aos favoritos");
    }
  };

  const handleAddToCart = (product: any) => {
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productImage: product.image_url || product.images?.[0] || "/placeholder.svg",
      price: product.price,
      quantity: 1,
      variants: {}
    };
    
    addItem(cartItem);
    toast.success("Produto adicionado ao carrinho");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="container mx-auto px-4 py-8">
        {/* Search Header */}
        <div className="mb-8">
          <div className="flex items-center gap-2 text-muted-foreground mb-2">
            <Search className="h-4 w-4" />
            <span className="text-sm">Resultados da busca</span>
          </div>
          <h1 className="text-2xl font-bold">
            {searchQuery ? `"${searchQuery}"` : "Digite algo para buscar"}
          </h1>
          {!loading && searchQuery && (
            <p className="text-muted-foreground mt-1">
              {products.length} {products.length === 1 ? "produto encontrado" : "produtos encontrados"}
            </p>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="animate-pulse">
                <div className="aspect-square bg-muted rounded-t-lg" />
                <CardContent className="p-4">
                  <div className="h-4 bg-muted rounded mb-2" />
                  <div className="h-4 bg-muted rounded w-3/4 mb-2" />
                  <div className="h-4 bg-muted rounded w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* No Search Query */}
        {!loading && !searchQuery && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Digite algo na barra de pesquisa
            </h2>
            <p className="text-muted-foreground">
              Use a barra de pesquisa acima para encontrar seus produtos favoritos
            </p>
          </div>
        )}

        {/* No Results */}
        {!loading && searchQuery && products.length === 0 && (
          <div className="text-center py-16">
            <Search className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-muted-foreground mb-2">
              Nenhum produto encontrado
            </h2>
            <p className="text-muted-foreground mb-4">
              Não encontramos produtos para "{searchQuery}". Tente buscar com termos diferentes.
            </p>
            <Button asChild>
              <Link to="/categorias">Ver todas as categorias</Link>
            </Button>
          </div>
        )}

        {/* Products Grid */}
        {!loading && products.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {products.map((product) => (
              <Card key={product.id} className="group hover:shadow-lg transition-shadow duration-300">
                <div className="relative overflow-hidden rounded-t-lg aspect-square">
                  <img
                    src={product.image_url || product.images?.[0] || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                  {product.discount_percentage && product.discount_percentage > 0 && (
                    <Badge className="absolute top-2 left-2 bg-destructive text-destructive-foreground">
                      -{product.discount_percentage}%
                    </Badge>
                  )}
                  <Button
                    variant="ghost"
                    size="icon"
                    className="absolute top-2 right-2 bg-background/80 hover:bg-background transition-colors"
                    onClick={() => handleToggleFavorite(product)}
                  >
                    <Heart 
                      className={`h-4 w-4 ${
                        isFavorite(product.id) ? "fill-destructive text-destructive" : ""
                      }`} 
                    />
                  </Button>
                </div>
                <CardContent className="p-4">
                  <Link to={`/produto/${product.id}`}>
                    <h3 className="font-medium text-sm mb-2 line-clamp-2 hover:text-primary transition-colors">
                      {product.name}
                    </h3>
                  </Link>
                  
                  {product.rating && (
                    <div className="flex items-center gap-1 mb-2">
                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                      <span className="text-sm text-muted-foreground">{product.rating}</span>
                    </div>
                  )}

                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg font-bold text-primary">
                      R$ {(product.price / 100).toFixed(2).replace('.', ',')}
                    </span>
                    {product.original_price && product.original_price > product.price && (
                      <span className="text-sm text-muted-foreground line-through">
                        R$ {(product.original_price / 100).toFixed(2).replace('.', ',')}
                      </span>
                    )}
                  </div>

                  <Button 
                    className="w-full" 
                    size="sm"
                    onClick={() => handleAddToCart(product)}
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Adicionar ao Carrinho
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default Busca;