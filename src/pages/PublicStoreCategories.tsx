import { Link, useParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { ChevronRight, Package } from "lucide-react";
import { usePublicStore } from "@/hooks/usePublicStore";
import { usePublicStoreCategories } from "@/hooks/usePublicStoreProducts";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";

const PublicStoreCategories = () => {
  const { slug } = useParams<{ slug: string }>();

  // Get store data
  const { store, isLoading: storeLoading, error: storeError } = usePublicStore(slug);

  // Get categories for this store
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
          <span className="text-foreground">Categorias</span>
        </nav>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">Categorias de Produtos</h1>
          <p className="text-muted-foreground">
            Navegue pelas categorias disponíveis na nossa loja
          </p>
        </div>

        {/* Categories Grid */}
        {categoriesLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <Skeleton className="w-full h-32 rounded-md mb-4" />
                  <Skeleton className="h-6 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <Package className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Nenhuma categoria encontrada</h3>
            <p className="text-muted-foreground">Esta loja ainda não possui categorias de produtos.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {categories.map((category) => (
              <Link 
                key={category.id} 
                to={`/loja/${store.store_slug}/categoria/${category.slug}`}
              >
                <Card className="group cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1">
                  <CardContent className="p-6">
                    {/* Category Icon/Image */}
                    <div className="relative mb-4 h-32 bg-muted rounded-lg flex items-center justify-center">
                      {category.image_url ? (
                        <img
                          src={category.image_url}
                          alt={category.name}
                          className="w-full h-full object-cover rounded-lg"
                        />
                      ) : (
                        <div 
                          className="w-16 h-16 rounded-full flex items-center justify-center text-white"
                          style={{ backgroundColor: category.color || store.accent_color }}
                        >
                          <Package className="h-8 w-8" />
                        </div>
                      )}
                      
                      {/* Product Count Badge */}
                      <Badge 
                        className="absolute top-2 right-2 bg-background text-foreground"
                        variant="secondary"
                      >
                        {category.products?.length || 0} produtos
                      </Badge>
                    </div>

                    {/* Category Info */}
                    <div className="space-y-2">
                      <h3 className="font-semibold text-lg group-hover:text-primary transition-colors">
                        {category.name}
                      </h3>
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {category.description || `Explore nossa seleção de produtos em ${category.name.toLowerCase()}`}
                      </p>
                    </div>

                    {/* Action Indicator */}
                    <div className="flex items-center justify-between mt-4 pt-4 border-t">
                      <span className="text-sm font-medium text-primary">Ver produtos</span>
                      <ChevronRight className="h-4 w-4 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </main>

      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreCategories;