import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Eye, Settings, Star, MessageSquare, Mail, LayoutGrid } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const HomepageManagement = () => {
  const navigate = useNavigate();

  const { data: stats } = useQuery({
    queryKey: ["homepage-stats"],
    queryFn: async () => {
      const [
        { count: homepageCategories },
        { count: featuredProducts },
        { count: activeTestimonials },
        { count: newsletterConfigs }
      ] = await Promise.all([
        supabase.from("homepage_categories").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("featured_products").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("testimonials").select("*", { count: "exact", head: true }).eq("active", true),
        supabase.from("newsletter_config").select("*", { count: "exact", head: true }).eq("active", true)
      ]);

      return {
        homepageCategories: homepageCategories || 0,
        featuredProducts: featuredProducts || 0,
        activeTestimonials: activeTestimonials || 0,
        newsletterConfigs: newsletterConfigs || 0
      };
    },
  });

  const managementCards = [
    {
      title: "Categorias em Destaque",
      description: "Gerenciar categorias exibidas na homepage",
      icon: LayoutGrid,
      count: stats?.homepageCategories || 0,
      color: "bg-blue-500",
      route: "/admin/categorias-destaque"
    },
    {
      title: "Produtos em Destaque",
      description: "Selecionar e ordenar produtos na vitrine",
      icon: Star,
      count: stats?.featuredProducts || 0,
      color: "bg-yellow-500",
      route: "/admin/produtos-destaque"
    },
    {
      title: "Depoimentos",
      description: "Gerenciar comentários de clientes",
      icon: MessageSquare,
      count: stats?.activeTestimonials || 0,
      color: "bg-green-500",
      route: "/admin/depoimentos"
    },
    {
      title: "Newsletter/CTA",
      description: "Configurar seção de newsletter",
      icon: Mail,
      count: stats?.newsletterConfigs || 0,
      color: "bg-purple-500",
      route: "/admin/newsletter-config"
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">
            Gerenciamento da Homepage
          </h1>
          <p className="text-muted-foreground">
            Controle completo do conteúdo da página inicial
          </p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => window.open("/", "_blank")}
          className="gap-2"
        >
          <Eye className="h-4 w-4" />
          Visualizar Homepage
        </Button>
      </div>

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="quick-actions">Ações Rápidas</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {managementCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Card 
                  key={card.title}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => navigate(card.route)}
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className={`p-2 rounded-lg ${card.color} text-white`}>
                        <IconComponent className="h-5 w-5" />
                      </div>
                      <Badge variant="secondary">
                        {card.count}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mb-1">{card.title}</CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Status da Homepage
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Categorias em Destaque</span>
                  <Badge variant={stats?.homepageCategories ? "default" : "secondary"}>
                    {stats?.homepageCategories ? "Configurado" : "Padrão"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Produtos em Destaque</span>
                  <Badge variant={stats?.featuredProducts ? "default" : "secondary"}>
                    {stats?.featuredProducts ? "Manual" : "Automático"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Depoimentos</span>
                  <Badge variant={stats?.activeTestimonials ? "default" : "destructive"}>
                    {stats?.activeTestimonials || 0} ativos
                  </Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span>Newsletter</span>
                  <Badge variant={stats?.newsletterConfigs ? "default" : "secondary"}>
                    {stats?.newsletterConfigs ? "Personalizado" : "Padrão"}
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Dicas de Otimização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  <p className="font-medium mb-1">🎯 Categorias em Destaque</p>
                  <p className="text-muted-foreground">Configure até 6 categorias principais para maximizar conversões</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">⭐ Produtos em Destaque</p>
                  <p className="text-muted-foreground">Selecione produtos com melhor margem ou em promoção</p>
                </div>
                <div className="text-sm">
                  <p className="font-medium mb-1">💬 Depoimentos</p>
                  <p className="text-muted-foreground">Mantenha 3-6 depoimentos recentes e relevantes</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="quick-actions" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {managementCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Card key={card.title}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <IconComponent className="h-5 w-5" />
                      {card.title}
                    </CardTitle>
                    <CardDescription>{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => navigate(card.route)}
                      className="w-full"
                    >
                      Gerenciar
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default HomepageManagement;