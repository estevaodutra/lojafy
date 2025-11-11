import { useState, useEffect } from 'react';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Trophy, TrendingUp, Clock } from "lucide-react";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { useTopProducts } from "@/hooks/useTopProducts";
import { useRecentOrders } from "@/hooks/useRecentOrders";
import { ProductRankingCard } from "@/components/ranking/ProductRankingCard";
import { OrderItem } from "@/components/ranking/OrderItem";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const RankingProdutos = () => {
  useDocumentTitle("Ranking de Produtos");
  const [activeTab, setActiveTab] = useState("top-products");
  
  const { data: topProducts, isLoading: loadingProducts, isRealData: isRealProducts } = useTopProducts();
  const { data: recentOrders, isLoading: loadingOrders, isRealData: isRealOrders } = useRecentOrders();

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8 text-center">
          <div className="flex items-center justify-center gap-2 mb-4 flex-wrap">
            <Trophy className="w-8 h-8 text-primary" />
            <h1 className="text-3xl font-bold text-foreground">Ranking de Produtos</h1>
            <Badge variant="default" className="bg-green-600 text-white animate-pulse">
              🔴 AO VIVO
            </Badge>
            <Badge 
              variant={isRealProducts || isRealOrders ? "default" : "secondary"}
              className={isRealProducts || isRealOrders ? "bg-blue-600 hover:bg-blue-700" : ""}
            >
              {isRealProducts || isRealOrders ? "📊 DADOS REAIS" : "🧪 MODO DEMO"}
            </Badge>
          </div>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Acompanhe os produtos mais vendidos da semana e os últimos pedidos processados em tempo real
          </p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="top-products" className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              Top 10 da Semana
            </TabsTrigger>
            <TabsTrigger value="recent-orders" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Últimos Pedidos
            </TabsTrigger>
          </TabsList>

          <TabsContent value="top-products">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="w-5 h-5 text-primary" />
                  Top 10 Produtos Mais Vendidos da Semana
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingProducts ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="w-12 h-12 rounded-full" />
                        <Skeleton className="w-16 h-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                        </div>
                        <Skeleton className="w-24 h-8" />
                      </div>
                    ))}
                  </div>
                ) : topProducts && topProducts.length > 0 ? (
                  <div className="space-y-4">
                    {topProducts.map((product, index) => (
                      <ProductRankingCard
                        key={product.id}
                        product={product}
                        position={index + 1}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Trophy className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum produto vendido nesta semana ainda.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="recent-orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-primary" />
                  Últimos Pedidos Processados
                </CardTitle>
              </CardHeader>
              <CardContent>
                {loadingOrders ? (
                  <div className="space-y-4">
                    {[...Array(10)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4 p-4 border rounded-lg">
                        <Skeleton className="w-16 h-16 rounded" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-48" />
                          <Skeleton className="h-3 w-32" />
                          <Skeleton className="h-3 w-24" />
                        </div>
                        <div className="text-right space-y-1">
                          <Skeleton className="h-4 w-20 ml-auto" />
                          <Skeleton className="h-3 w-16 ml-auto" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : recentOrders && recentOrders.length > 0 ? (
                  <div className="space-y-4">
                    {recentOrders.map((order) => (
                      <OrderItem key={order.id} order={order} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-muted-foreground">
                    <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhum pedido processado recentemente.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

      <Footer />
    </div>
  );
};

export default RankingProdutos;