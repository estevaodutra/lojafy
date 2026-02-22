import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ImpersonationBanner } from "@/components/admin/ImpersonationBanner";
import Index from "./pages/Index";
import Categorias from "./pages/Categorias";
import Promocoes from "./pages/Promocoes";
import EmDestaque from "./pages/EmDestaque";
import Contato from "./pages/Contato";
import Produto from "./pages/Produto";
import Favoritos from "./pages/Favoritos";
import Checkout from "./pages/Checkout";
import Busca from "./pages/Busca";
import QuemSomos from "./pages/QuemSomos";
import PoliticaTroca from "./pages/PoliticaTroca";
import TermosUso from "./pages/TermosUso";
import FAQ from "./pages/FAQ";
import RastrearPedido from "./pages/RastrearPedido";
import RankingProdutos from "./pages/RankingProdutos";
import CentralAjuda from "./pages/CentralAjuda";
import Carrinho from "./pages/Carrinho";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import AuthOneTime from "./pages/AuthOneTime";
import AuthPremium from "./pages/AuthPremium";
import ResetPassword from "./pages/ResetPassword";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerOrders from "./pages/customer/Orders";
import CustomerAddresses from "./pages/customer/Addresses";
import CustomerFavorites from "./pages/customer/Favorites";
import CustomerSettings from "./pages/customer/Settings";
import CustomerHelp from "./pages/customer/Help";
import CustomerNotifications from "./pages/customer/Notifications";
import CustomerTickets from "./pages/customer/Tickets";
import CustomerTicketDetails from "./pages/customer/TicketDetails";
import Academy from "./pages/customer/Academy";
import CourseViewer from "./pages/customer/CourseViewer";
import CourseCheckout from "./pages/CourseCheckout";
import { RoleBasedRoute } from "./components/auth/RoleBasedRoute";
import { FeatureRoute } from "./components/auth/FeatureRoute";
import AdminLayout from "./components/admin/AdminLayout";
import { SupplierLayout } from "./components/layouts/SupplierLayout";
import { ResellerLayout } from "./components/layouts/ResellerLayout";
import { SuperAdminLayout } from "./components/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminFinanceiro from "./pages/admin/Financeiro";
import AdminProducts from "./pages/admin/Products";
import AdminBanners from "./pages/admin/Banners";
import AdminOrders from "./pages/admin/Orders";
import IntegracaoPage from "./pages/admin/Integracoes";
import HomepageManagement from "./pages/admin/Homepage";
import AdminCategorias from "./pages/admin/Categorias";
import Depoimentos from "./pages/admin/Depoimentos";
import NewsletterConfig from "./pages/admin/NewsletterConfig";
import ConfiguracaoVisual from "./pages/admin/ConfiguracaoVisual";
import Frete from "./pages/admin/Frete";
import SupplierDashboard from "./pages/supplier/Dashboard";
import SupplierProductManagement from "./pages/supplier/ProductManagement";
import SupplierProductApproval from "./pages/supplier/ProductApproval";
import SupplierOrderManagement from "./pages/supplier/OrderManagement";
import SupplierInventory from "./pages/supplier/Inventory";
import SupplierSales from "./pages/supplier/Sales";

import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerOnboarding from "./pages/reseller/Onboarding";
import ResellerFirstAccess from "./pages/reseller/FirstAccess";
import ResellerSales from "./pages/reseller/Sales";
import ResellerClients from "./pages/reseller/Clients";
import ResellerFinanceiro from "./pages/reseller/Financeiro";
import ResellerGoals from "./pages/reseller/Goals";

import ResellerCatalog from "./pages/reseller/Catalog";
import ResellerProducts from "./pages/reseller/Products";
import ResellerOrders from "./pages/reseller/Orders";
import ResellerCoupons from "./pages/reseller/Coupons";
import ResellerReports from "./pages/reseller/Reports";
import ResellerShipping from "./pages/reseller/Shipping";
import ResellerTestimonials from "./pages/reseller/Testimonials";
import ResellerStoreEditor from "./pages/reseller/StoreEditor";
import ResellerPagesEditor from "./pages/reseller/PagesEditor";
import ResellerBenefits from "./pages/reseller/Benefits";
import ResellerBanners from "./pages/reseller/Banners";
import ResellerLojafyIntegra from "./pages/reseller/LojafyIntegra";
import ResellerMeusAcessos from "./pages/reseller/MeusAcessos";
import ResellerTopProdutosVencedores from "./pages/reseller/TopProdutosVencedores";
import PublicStore from "./pages/PublicStore";
import PublicStoreProduct from "./pages/PublicStoreProduct";
import PublicStoreCategory from "./pages/PublicStoreCategory";
import PublicStoreProducts from "./pages/PublicStoreProducts";
import PublicStoreCategoryList from "./pages/PublicStoreCategoryList";
import PublicStoreFavorites from "./pages/PublicStoreFavorites";
import PublicStoreCart from "./pages/PublicStoreCart";
import PublicStoreCheckout from "./pages/PublicStoreCheckout";
import PublicStoreSearch from "./pages/PublicStoreSearch";
import PublicStoreContact from "./pages/PublicStoreContact";
import PublicStoreAbout from "./pages/PublicStoreAbout";
import PublicStoreFAQ from "./pages/PublicStoreFAQ";
import PublicStorePolicyExchange from "./pages/PublicStorePolicyExchange";
import PublicStoreTerms from "./pages/PublicStoreTerms";
import PublicStoreTrackOrder from "./pages/PublicStoreTrackOrder";
import PublicStoreHelpCenter from "./pages/PublicStoreHelpCenter";
import SuperAdminDashboard from "./pages/admin/Dashboard";
import Plataforma from "./pages/admin/Plataforma";
import AdminCourses from "./pages/admin/Courses";
import CourseContent from "./pages/admin/CourseContent";
import CourseEnrollments from "./pages/admin/CourseEnrollments";
import NotificationsManagement from "./pages/admin/NotificationsManagement";
import PublicStoreProviderRoute from "./components/public-store/PublicStoreProviderRoute";
import AIKnowledgeBase from "./pages/admin/AIKnowledgeBase";
import ChatWidget from "@/components/support/ChatWidget";
import Catalogo from "./pages/admin/Catalogo";
import Clientes from "./pages/admin/Clientes"; // Unified user management
import Design from "./pages/admin/Design";
import Configuracoes from "./pages/admin/Configuracoes";

import SupportManagement from "./pages/admin/SupportManagement";
import ChatSupport from "./pages/admin/ChatSupport";
import AdminAcademy from "./pages/admin/Academy";
import ApiDocumentation from "./pages/admin/ApiDocumentation";
import Features from "./pages/admin/Features";
import CourseModules from "./pages/customer/CourseModules";
import ModuleLessons from "./pages/customer/ModuleLessons";
import LessonViewer from "./pages/customer/LessonViewer";
import Courses from "./pages/customer/Courses";
import { MandatoryNotificationModal } from "@/components/MandatoryNotificationModal";
import { useMandatoryNotifications } from "@/hooks/useMandatoryNotifications";
import { WhatsAppRequiredModal } from "@/components/WhatsAppRequiredModal";
import { useWhatsAppRequired } from "@/hooks/useWhatsAppRequired";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 5, // 5 minutes (replaces cacheTime)
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const AppContent = () => {
  const location = useLocation();
  const isPublicStore = location.pathname.startsWith('/loja/');
  
  // Only use global document title if not on a public store route
  if (!isPublicStore) {
    useDocumentTitle();
  }
  
  return null;
};

const AppWithNotifications = () => {
  const { pendingNotification, loading } = useMandatoryNotifications();
  const { requiresWhatsApp, userId } = useWhatsAppRequired();

  return (
    <>
      <AppContent />
      <ImpersonationBanner />
      <ChatWidget />
      
      {/* WhatsApp tem prioridade máxima */}
      {requiresWhatsApp && userId && (
        <WhatsAppRequiredModal 
          userId={userId} 
          onComplete={() => window.location.reload()} 
        />
      )}
      
      {/* Só mostra outras notificações se WhatsApp OK */}
      {!requiresWhatsApp && !loading && pendingNotification && (
        <MandatoryNotificationModal notification={pendingNotification} />
      )}
    </>
  );
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <AppWithNotifications />
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/categorias/:slug" element={<Categorias />} />
              <Route path="/promocoes" element={<Promocoes />} />
              <Route path="/em-destaque" element={<EmDestaque />} />
              <Route path="/contato" element={<Contato />} />
              <Route path="/produto/:id" element={<Produto />} />
              <Route path="/favoritos" element={<Favoritos />} />
              <Route path="/checkout" element={<Checkout />} />
              <Route path="/busca" element={<Busca />} />
              <Route path="/quem-somos" element={<QuemSomos />} />
              <Route path="/politica-troca" element={<PoliticaTroca />} />
              <Route path="/termos-uso" element={<TermosUso />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/rastrear-pedido" element={<RastrearPedido />} />
              <Route path="/ranking-produtos" element={<RankingProdutos />} />
              <Route path="/central-ajuda" element={<CentralAjuda />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/auth/onetime" element={<AuthOneTime />} />
              <Route path="/auth/premium" element={<AuthPremium />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/checkout/curso/:courseId" element={<CourseCheckout />} />
              
              {/* Customer Panel Routes */}
              <Route path="/minha-conta" element={<CustomerLayout />}>
                <Route index element={<CustomerDashboard />} />
                <Route path="meus-acessos" element={
                  <FeatureRoute feature="top_10_produtos">
                    <ResellerMeusAcessos />
                  </FeatureRoute>
                } />
                <Route path="meus-acessos/top-produtos" element={
                  <FeatureRoute feature="top_10_produtos">
                    <ResellerTopProdutosVencedores />
                  </FeatureRoute>
                } />
                <Route path="pedidos" element={<CustomerOrders />} />
                <Route path="tickets" element={<CustomerTickets />} />
                <Route path="tickets/:ticketId" element={<CustomerTicketDetails />} />
                <Route path="notificacoes" element={<CustomerNotifications />} />
                <Route path="academy" element={
                  <FeatureRoute feature="lojafy_academy">
                    <Academy />
                  </FeatureRoute>
                } />
                <Route path="curso/:courseId" element={
                  <FeatureRoute feature="lojafy_academy">
                    <CourseModules />
                  </FeatureRoute>
                } />
                <Route path="curso/:courseId/modulo/:moduleId" element={
                  <FeatureRoute feature="lojafy_academy">
                    <ModuleLessons />
                  </FeatureRoute>
                } />
                <Route path="aula/:lessonId" element={
                  <FeatureRoute feature="lojafy_academy">
                    <LessonViewer />
                  </FeatureRoute>
                } />
                <Route path="aulas" element={<Courses />} />
                <Route path="aulas/:courseId" element={<CourseViewer />} />
                <Route path="favoritos" element={<CustomerFavorites />} />
                <Route path="enderecos" element={<CustomerAddresses />} />
                <Route path="configuracoes" element={<CustomerSettings />} />
                <Route path="ajuda" element={<CustomerHelp />} />
              </Route>
              
              {/* Admin Panel Routes */}
              <Route
                path="/admin"
                element={
                  <RoleBasedRoute allowedRoles={['admin', 'super_admin']}>
                    <AdminLayout />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<AdminDashboard />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategorias />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="integracoes" element={<IntegracaoPage />} />
                <Route path="homepage" element={<HomepageManagement />} />
                <Route path="configuracao-visual" element={<ConfiguracaoVisual />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="depoimentos" element={<Depoimentos />} />
                <Route path="newsletter-config" element={<NewsletterConfig />} />
                <Route path="frete" element={<Frete />} />
              </Route>

              {/* Super Admin Panel Routes */}
              <Route
                path="/super-admin"
                element={
                  <RoleBasedRoute allowedRoles={['super_admin']}>
                    <SuperAdminLayout />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<SuperAdminDashboard />} />
                
                {/* Novas rotas consolidadas */}
                <Route path="catalogo" element={<Catalogo />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="clientes" element={<Clientes />} />
                <Route path="design" element={<Design />} />
                <Route path="configuracoes" element={<Configuracoes />} />
                <Route path="financeiro" element={<AdminFinanceiro />} />
                <Route path="chat-suporte" element={<ChatSupport />} />
                <Route path="academy" element={<AdminAcademy />} />
                <Route path="features" element={<Features />} />
                
                {/* Rotas antigas mantidas para compatibilidade */}
                <Route path="usuarios" element={<Clientes />} />
                <Route path="notificacoes" element={<NotificationsManagement />} />
                <Route path="plataforma" element={<Plataforma />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategorias />} />
                <Route path="homepage" element={<HomepageManagement />} />
                <Route path="configuracao-visual" element={<ConfiguracaoVisual />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="depoimentos" element={<Depoimentos />} />
                <Route path="newsletter-config" element={<NewsletterConfig />} />
                <Route path="frete" element={<Frete />} />
                <Route path="aulas" element={<AdminCourses />} />
                <Route path="aulas/:courseId/conteudo" element={<CourseContent />} />
                <Route path="aulas/:courseId/matriculas" element={<CourseEnrollments />} />
                <Route path="integracoes" element={<IntegracaoPage />} />
                <Route path="base-conhecimento" element={<AIKnowledgeBase />} />
                <Route path="suporte" element={<SupportManagement />} />
                <Route path="api-docs" element={<ApiDocumentation />} />
              </Route>

              {/* Supplier Panel Routes */}
              <Route
                path="/supplier"
                element={
                  <RoleBasedRoute allowedRoles={['supplier']}>
                    <SupplierLayout />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<SupplierDashboard />} />
                <Route path="produtos" element={<SupplierProductManagement />} />
                <Route path="produtos/aprovacao" element={<SupplierProductApproval />} />
                <Route path="pedidos" element={<SupplierOrderManagement />} />
                <Route path="estoque" element={<SupplierInventory />} />
                <Route path="vendas" element={<SupplierSales />} />
                
              </Route>

              {/* Reseller Panel Routes */}
              <Route
                path="/reseller"
                element={
                  <RoleBasedRoute allowedRoles={['reseller']}>
                    <ResellerLayout />
                  </RoleBasedRoute>
                }
              >
                <Route index element={<ResellerDashboard />} />
                <Route path="first-access" element={<ResellerFirstAccess />} />
                <Route path="onboarding" element={<ResellerOnboarding />} />
                <Route path="dashboard" element={<ResellerDashboard />} />
                <Route path="catalogo" element={<ResellerCatalog />} />
                <Route path="produtos" element={<ResellerProducts />} />
                <Route path="pedidos" element={<ResellerOrders />} />
                <Route path="loja" element={<ResellerStoreEditor />} />
                <Route path="paginas" element={<ResellerPagesEditor />} />
                <Route path="vantagens" element={<ResellerBenefits />} />
                <Route path="banners" element={<ResellerBanners />} />
                <Route path="cupons" element={<ResellerCoupons />} />
                <Route path="frete" element={<ResellerShipping />} />
                <Route path="depoimentos" element={<ResellerTestimonials />} />
                <Route path="vendas" element={<ResellerSales />} />
                <Route path="relatorios" element={<ResellerReports />} />
                <Route path="clientes" element={<ResellerClients />} />
                <Route path="financeiro" element={<ResellerFinanceiro />} />
                <Route path="metas" element={<ResellerGoals />} />
                <Route path="integracoes" element={
                  <FeatureRoute feature="lojafy_integra">
                    <ResellerLojafyIntegra />
                  </FeatureRoute>
                } />
                <Route path="meus-acessos" element={
                  <FeatureRoute feature="top_10_produtos">
                    <ResellerMeusAcessos />
                  </FeatureRoute>
                } />
                <Route path="meus-acessos/top-produtos" element={
                  <FeatureRoute feature="top_10_produtos">
                    <ResellerTopProdutosVencedores />
                  </FeatureRoute>
                } />
                
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              {/* Public Store Routes */}
              <Route
                path="/loja/:slug"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStore />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/produtos"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreProducts />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/categorias"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreCategoryList />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/categorias/:categorySlug"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreCategoryList />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/contato"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreContact />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/produto/:id"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreProduct />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/categoria/:categorySlug"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreCategory />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/favoritos"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreFavorites />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/carrinho"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreCart />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/checkout"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreCheckout />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/busca"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreSearch />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/quem-somos"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreAbout />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/faq"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreFAQ />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/politica-troca"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStorePolicyExchange />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/termos-uso"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreTerms />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/rastrear-pedido"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreTrackOrder />
                  </PublicStoreProviderRoute>
                }
              />
              <Route
                path="/loja/:slug/ajuda"
                element={
                  <PublicStoreProviderRoute>
                    <PublicStoreHelpCenter />
                  </PublicStoreProviderRoute>
                }
              />
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
          </BrowserRouter>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
