import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Smartphone, 
  Headphones, 
  Home, 
  Sparkles, 
  Baby,
  Shirt,
  Gamepad2,
  Book,
  Laptop,
  Watch,
  ShoppingCart
} from "lucide-react";

// Icon mapping for categories
const iconMap: Record<string, any> = {
  'Eletrônicos': Smartphone,
  'Electronics': Smartphone,
  'Áudio': Headphones,
  'Audio': Headphones,
  'Casa': Home,
  'Home': Home,
  'Beleza': Sparkles,
  'Beauty': Sparkles,
  'Infantil': Baby,
  'Kids': Baby,
  'Moda': Shirt,
  'Fashion': Shirt,
  'Games': Gamepad2,
  'Livros': Book,
  'Books': Book,
  'Computadores': Laptop,
  'Computers': Laptop,
  'Wearables': Watch,
  'default': ShoppingCart
};

// Color mapping for categories
const colorMap: Record<string, string> = {
  'Eletrônicos': 'bg-blue-500',
  'Electronics': 'bg-blue-500',
  'Áudio': 'bg-purple-500',
  'Audio': 'bg-purple-500',
  'Casa': 'bg-green-500',
  'Home': 'bg-green-500',
  'Beleza': 'bg-pink-500',
  'Beauty': 'bg-pink-500',
  'Infantil': 'bg-yellow-500',
  'Kids': 'bg-yellow-500',
  'Moda': 'bg-red-500',
  'Fashion': 'bg-red-500',
  'Games': 'bg-indigo-500',
  'Livros': 'bg-orange-500',
  'Books': 'bg-orange-500',
  'Computadores': 'bg-gray-600',
  'Computers': 'bg-gray-600',
  'Wearables': 'bg-teal-500',
  'default': 'bg-slate-500'
};

const CategorySection = () => {
  // Fetch categories with real product count from Supabase
  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories-with-count'],
    queryFn: async () => {
      const { data: categoriesData, error: categoriesError } = await supabase
        .from('categories')
        .select(`
          *,
          products!left(id, active)
        `)
        .eq('active', true)
        .order('name');
      
      if (categoriesError) throw categoriesError;
      
      // Calculate product count manually
      return categoriesData.map(category => ({
        ...category,
        real_product_count: category.products?.filter((p: any) => p.active).length || 0
      }));
    },
  });

  return (
    <section className="py-16 bg-muted/30">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-4">
            Explore por Categoria
          </h2>
          <p className="text-lg text-muted-foreground">
            Encontre exatamente o que você procura
          </p>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
            {Array.from({ length: 8 }).map((_, i) => (
              <Card key={i} className="border-border bg-card">
                <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                  <Skeleton className="w-16 h-16 rounded-full" />
                  <Skeleton className="h-4 w-20" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center py-12">
            <h3 className="text-lg font-semibold mb-2">Nenhuma categoria encontrada</h3>
            <p className="text-muted-foreground">Cadastre categorias para exibi-las aqui.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-6">
            {categories.map((category) => {
              const IconComponent = iconMap[category.name] || iconMap.default;
              const colorClass = colorMap[category.name] || colorMap.default;
              
              return (
                <Link key={category.id} to={`/categorias/${category.slug}`}>
                  <Card 
                    className="group hover:shadow-card-hover transition-all duration-300 cursor-pointer border-border bg-card"
                  >
                    <CardContent className="p-6 flex flex-col items-center text-center space-y-3">
                      <div className={`w-16 h-16 ${colorClass} rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-300`}>
                        <IconComponent className="h-8 w-8 text-white" />
                      </div>
                      <h3 className="font-medium text-foreground text-sm">
                        {category.name}
                      </h3>
                      {(category.real_product_count || 0) > 0 && (
                        <p className="text-xs text-muted-foreground">
                          {category.real_product_count} produtos
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
};

export default CategorySection;