import { useState } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  ChevronRight,
  Star,
  Heart,
  ShoppingCart,
  Truck,
  Shield,
  RotateCcw,
  Plus,
  Minus,
  Share2,
  ZoomIn,
  Package,
  Info
} from "lucide-react";
import { useFavorites } from "@/contexts/FavoritesContext";
import { useCart } from "@/contexts/CartContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

const Produto = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { addToFavorites, removeFromFavorites, isFavorite } = useFavorites();
  const { addItem } = useCart();
  const [selectedImage, setSelectedImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedVariant, setSelectedVariant] = useState("");

  // Fetch product from Supabase
  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      if (!id) throw new Error('Product ID is required');
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id)
        .eq('active', true)
        .single();
      
      if (error) throw error;
      return data;
    },
    enabled: !!id
  });

  // Fetch related products
  const { data: relatedProducts = [] } = useQuery({
    queryKey: ['related-products', product?.category_id],
    queryFn: async () => {
      if (!product?.category_id) return [];
      
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category_id', product.category_id)
        .eq('active', true)
        .neq('id', product.id)
        .limit(4);
      
      if (error) throw error;
      return data || [];
    },
    enabled: !!product?.category_id
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            <div className="grid lg:grid-cols-2 gap-12">
              <div className="space-y-4">
                <div className="h-96 lg:h-[500px] bg-gray-200 rounded-lg"></div>
                <div className="flex gap-2">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="w-20 h-20 bg-gray-200 rounded-lg"></div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
                <div className="h-12 bg-gray-200 rounded w-1/3"></div>
                <div className="h-24 bg-gray-200 rounded"></div>
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="text-center">
            <h1 className="text-2xl font-bold mb-4">Produto não encontrado</h1>
            <Link to="/" className="text-primary hover:underline">
              Voltar à página inicial
            </Link>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const calculateDiscount = () => {
    if (!product.original_price) return 0;
    return Math.round(((Number(product.original_price) - Number(product.price)) / Number(product.original_price)) * 100);
  };

  const productImages = product.images && product.images.length > 0 
    ? product.images 
    : [product.main_image_url || product.image_url || '/placeholder.svg'];

  const handleAddToCart = () => {
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productImage: product.main_image_url || product.image_url || '/placeholder.svg',
      price: Number(product.price),
      quantity: quantity,
      variants: selectedVariant ? { variant: selectedVariant } : undefined,
    };
    
    addItem(cartItem);
    toast({
      title: "Produto adicionado ao carrinho!",
      description: `${quantity}x ${product.name}`,
    });
  };

  const handleAddToWishlist = () => {
    if (isFavorite(product.id)) {
      removeFromFavorites(product.id);
      toast({
        title: "Produto removido dos favoritos",
        description: product.name,
        variant: "destructive",
      });
    } else {
      const favoriteProduct = {
        id: product.id,
        name: product.name,
        price: Number(product.price),
        originalPrice: product.original_price ? Number(product.original_price) : undefined,
        image: product.main_image_url || product.image_url || '/placeholder.svg',
        rating: Number(product.rating || 0),
        badge: product.badge || "",
        description: product.description || "",
        specifications: (product.specifications as Record<string, string>) || {},
        category: product.category_id || "",
        brand: product.brand || "",
        inStock: (product.stock_quantity || 0) > 0,
        images: productImages,
        reviews: [],
      };
      addToFavorites(favoriteProduct);
      toast({
        title: "Produto adicionado aos favoritos!",
        description: product.name,
      });
    }
  };

  const handleBuyNow = () => {
    const cartItem = {
      productId: product.id,
      productName: product.name,
      productImage: product.main_image_url || product.image_url || '/placeholder.svg',
      price: Number(product.price),
      quantity: quantity,
      variants: selectedVariant ? { variant: selectedVariant } : undefined,
    };
    
    addItem(cartItem);
    toast({
      title: "Produto adicionado ao carrinho!",
      description: `${quantity}x ${product.name}`,
    });
    navigate('/carrinho');
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
          <ChevronRight className="h-4 w-4" />
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12 mb-12">
          {/* Product Images */}
          <div className="space-y-4">
            <div className="relative">
              <img
                src={productImages[selectedImage]}
                alt={product.name}
                className="w-full h-96 lg:h-[500px] object-cover rounded-lg"
              />
              {product.badge && (
                <Badge className="absolute top-4 left-4">
                  {product.badge}
                </Badge>
              )}
              {calculateDiscount() > 0 && (
                <Badge className="absolute top-4 right-4 bg-red-500 text-white">
                  -{calculateDiscount()}% OFF
                </Badge>
              )}
              <Button
                size="sm"
                variant="secondary"
                className="absolute bottom-4 right-4"
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
            </div>
            
            {/* Thumbnail Images */}
            <div className="flex gap-2 overflow-x-auto">
              {productImages.map((image, index) => (
                <button
                  key={index}
                  onClick={() => setSelectedImage(index)}
                  className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden ${
                    selectedImage === index ? 'border-primary' : 'border-border'
                  }`}
                >
                  <img
                    src={image}
                    alt={`${product.name} ${index + 1}`}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Product Information */}
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
              {product.brand && (
                <p className="text-muted-foreground">Marca: {product.brand}</p>
              )}
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-5 w-5 ${
                        i < Math.floor(Number(product.rating || 0))
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  ))}
                </div>
                <span className="ml-2 text-sm text-muted-foreground">
                  {Number(product.rating || 0).toFixed(1)} ({product.review_count || 0} avaliações)
                </span>
              </div>
              <Badge variant={(product.stock_quantity || 0) > 0 ? "default" : "secondary"}>
                {(product.stock_quantity || 0) > 0 ? "Em estoque" : "Esgotado"}
              </Badge>
            </div>

            {/* Price */}
            <div className="space-y-2">
              {product.original_price && (
                <p className="text-lg text-muted-foreground line-through">
                  De: {formatPrice(Number(product.original_price))}
                </p>
              )}
              <p className="text-4xl font-bold text-primary">
                {formatPrice(Number(product.price))}
              </p>
              <p className="text-muted-foreground">
                ou 12x de {formatPrice(Number(product.price) / 12)} sem juros
              </p>
            </div>

            {/* Product Information */}
            <div className="bg-accent/50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 mb-3">
                <Info className="h-5 w-5 text-primary" />
                <h3 className="font-semibold">Informações do Produto</h3>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm">
                {product.sku && (
                  <div>
                    <span className="font-medium text-muted-foreground">SKU:</span>
                    <span className="ml-2">{product.sku}</span>
                  </div>
                )}
                {product.gtin_ean13 && (
                  <div>
                    <span className="font-medium text-muted-foreground">EAN-13:</span>
                    <span className="ml-2">{product.gtin_ean13}</span>
                  </div>
                )}
                <div>
                  <span className="font-medium text-muted-foreground">Estoque:</span>
                  <span className="ml-2">{product.stock_quantity || 0} unidades</span>
                </div>
                {(product.height || product.width || product.length || product.weight) && (
                  <div className="col-span-2">
                    <span className="font-medium text-muted-foreground">Dimensões:</span>
                    <div className="mt-1 text-xs space-y-1">
                      {(product.height || product.width || product.length) && (
                        <div>
                          {Number(product.height || 0).toFixed(1)}cm × {Number(product.width || 0).toFixed(1)}cm × {Number(product.length || 0).toFixed(1)}cm
                        </div>
                      )}
                      {product.weight && (
                        <div>Peso: {Number(product.weight).toFixed(2)}kg</div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            {product.description && (
              <div>
                <p className="text-muted-foreground leading-relaxed">
                  {product.description}
                </p>
              </div>
            )}

            {/* Quantity and Actions */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="font-medium">Quantidade:</label>
                <div className="flex items-center border rounded-lg">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="px-4 py-2 min-w-[60px] text-center">{quantity}</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setQuantity(quantity + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <div className="flex gap-3">
                <Button
                  size="lg"
                  className="flex-1 btn-cart"
                  onClick={handleAddToCart}
                  disabled={(product.stock_quantity || 0) <= 0}
                >
                  <ShoppingCart className="h-5 w-5 mr-2" />
                  Adicionar ao Carrinho
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={handleAddToWishlist}
                  className={isFavorite(product.id) ? "text-destructive border-destructive" : ""}
                >
                  <Heart className={`h-5 w-5 ${isFavorite(product.id) ? 'fill-current' : ''}`} />
                </Button>
                <Button size="lg" variant="outline">
                  <Share2 className="h-5 w-5" />
                </Button>
              </div>

              <Button 
                size="lg" 
                className="w-full btn-buy-now" 
                onClick={handleBuyNow}
                disabled={(product.stock_quantity || 0) <= 0}
              >
                Comprar Agora
              </Button>
            </div>

            {/* Benefits */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <Truck className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Frete Grátis</p>
                  <p className="text-xs text-muted-foreground">Acima de R$ 199</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <Shield className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Garantia</p>
                  <p className="text-xs text-muted-foreground">12 meses</p>
                </div>
              </div>
              <div className="flex items-center gap-2 p-3 bg-accent rounded-lg">
                <RotateCcw className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm font-medium">Troca Fácil</p>
                  <p className="text-xs text-muted-foreground">30 dias</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Product Details Tabs */}
        <section className="mb-12">
          <Tabs defaultValue="specifications" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="specifications">Especificações</TabsTrigger>
              <TabsTrigger value="reviews">Avaliações</TabsTrigger>
              <TabsTrigger value="shipping">Entrega</TabsTrigger>
            </TabsList>
            
            <TabsContent value="specifications" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Especificações Técnicas</h3>
                  {product.specifications && Object.keys(product.specifications as Record<string, string>).length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {Object.entries(product.specifications as Record<string, string>).map(([key, value]) => (
                        <div key={key} className="flex justify-between py-2 border-b">
                          <span className="font-medium">{key}:</span>
                          <span className="text-muted-foreground">{String(value)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Especificações não disponíveis.</p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="reviews" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Avaliações dos Clientes</h3>
                  <p className="text-muted-foreground">Ainda não há avaliações para este produto.</p>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="shipping" className="mt-6">
              <Card>
                <CardContent className="p-6">
                  <h3 className="text-lg font-semibold mb-4">Informações de Entrega</h3>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Entrega Padrão</p>
                        <p className="text-sm text-muted-foreground">5-7 dias úteis • Grátis acima de R$ 199</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Truck className="h-5 w-5 text-primary" />
                      <div>
                        <p className="font-medium">Entrega Expressa</p>
                        <p className="text-sm text-muted-foreground">1-2 dias úteis • R$ 29,90</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </section>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section>
            <h2 className="text-2xl font-bold mb-6">Produtos Relacionados</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((relatedProduct) => (
                <Card key={relatedProduct.id} className="group cursor-pointer hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <Link to={`/produto/${relatedProduct.id}`}>
                      <img
                        src={relatedProduct.main_image_url || relatedProduct.image_url || '/placeholder.svg'}
                        alt={relatedProduct.name}
                        className="w-full h-48 object-cover rounded-md mb-4"
                      />
                      <h3 className="font-medium mb-2 line-clamp-2">{relatedProduct.name}</h3>
                      <p className="text-lg font-bold text-primary">
                        {formatPrice(Number(relatedProduct.price))}
                      </p>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default Produto;