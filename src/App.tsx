import React, { Suspense, lazy } from "react";
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
import { RoleBasedRoute } from "./components/auth/RoleBasedRoute";
import { FeatureRoute } from "./components/auth/FeatureRoute";
import { MandatoryNotificationModal } from "@/components/MandatoryNotificationModal";
import { useMandatoryNotifications } from "@/hooks/useMandatoryNotifications";
import { WhatsAppRequiredModal } from "@/components/WhatsAppRequiredModal";
import { useWhatsAppRequired } from "@/hooks/useWhatsAppRequired";
import ChatWidget from "@/components/support/ChatWidget";
import PublicStoreProviderRoute from "./components/public-store/PublicStoreProviderRoute";

// Layouts (kept eager — shells needed before any child renders)
import CustomerLayout from "./components/customer/CustomerLayout";
import AdminLayout from "./components/admin/AdminLayout";
import { SupplierLayout } from "./components/layouts/SupplierLayout";
import { ResellerLayout } from "./components/layouts/ResellerLayout";
import { SuperAdminLayout } from "./components/layouts/SuperAdminLayout";

// ── Storefront pages ───────────────────────────────────────────────────────
const Index = lazy(() => import("./pages/Index"));
const Categorias = lazy(() => import("./pages/Categorias"));
const Promocoes = lazy(() => import("./pages/Promocoes"));
const EmDestaque = lazy(() => import("./pages/EmDestaque"));
const Contato = lazy(() => import("./pages/Contato"));
const Produto = lazy(() => import("./pages/Produto"));
const Favoritos = lazy(() => import("./pages/Favoritos"));
const Checkout = lazy(() => import("./pages/Checkout"));
const Busca = lazy(() => import("./pages/Busca"));
const QuemSomos = lazy(() => import("./pages/QuemSomos"));
const PoliticaTroca = lazy(() => import("./pages/PoliticaTroca"));
const TermosUso = lazy(() => import("./pages/TermosUso"));
const FAQ = lazy(() => import("./pages/FAQ"));
const RastrearPedido = lazy(() => import("./pages/RastrearPedido"));
const RankingProdutos = lazy(() => import("./pages/RankingProdutos"));
const CentralAjuda = lazy(() => import("./pages/CentralAjuda"));
const Carrinho = lazy(() => import("./pages/Carrinho"));
const NotFound = lazy(() => import("./pages/NotFound"));
const Auth = lazy(() => import("./pages/Auth"));
const AuthOneTime = lazy(() => import("./pages/AuthOneTime"));
const AuthPremium = lazy(() => import("./pages/AuthPremium"));
const ResetPassword = lazy(() => import("./pages/ResetPassword"));
const CourseCheckout = lazy(() => import("./pages/CourseCheckout"));

// ── Customer panel ─────────────────────────────────────────────────────────
const CustomerDashboard = lazy(() => import("./pages/customer/Dashboard"));
const CustomerOrders = lazy(() => import("./pages/customer/Orders"));
const CustomerAddresses = lazy(() => import("./pages/customer/Addresses"));
const CustomerFavorites = lazy(() => import("./pages/customer/Favorites"));
const CustomerSettings = lazy(() => import("./pages/customer/Settings"));
const CustomerHelp = lazy(() => import("./pages/customer/Help"));
const CustomerNotifications = lazy(() => import("./pages/customer/Notifications"));
const CustomerTickets = lazy(() => import("./pages/customer/Tickets"));
const CustomerTicketDetails = lazy(() => import("./pages/customer/TicketDetails"));
const CustomerWallet = lazy(() => import("./pages/customer/CustomerWallet"));
const Academy = lazy(() => import("./pages/customer/Academy"));
const CourseViewer = lazy(() => import("./pages/customer/CourseViewer"));
const CourseModules = lazy(() => import("./pages/customer/CourseModules"));
const ModuleLessons = lazy(() => import("./pages/customer/ModuleLessons"));
const LessonViewer = lazy(() => import("./pages/customer/LessonViewer"));
const Courses = lazy(() => import("./pages/customer/Courses"));

// ── Admin panel ────────────────────────────────────────────────────────────
const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminFinanceiro = lazy(() => import("./pages/admin/Financeiro"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminBanners = lazy(() => import("./pages/admin/Banners"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const IntegracaoPage = lazy(() => import("./pages/admin/Integracoes"));
const HomepageManagement = lazy(() => import("./pages/admin/Homepage"));
const AdminCategorias = lazy(() => import("./pages/admin/Categorias"));
const Depoimentos = lazy(() => import("./pages/admin/Depoimentos"));
const NewsletterConfig = lazy(() => import("./pages/admin/NewsletterConfig"));
const ConfiguracaoVisual = lazy(() => import("./pages/admin/ConfiguracaoVisual"));
const Frete = lazy(() => import("./pages/admin/Frete"));
const Catalogo = lazy(() => import("./pages/admin/Catalogo"));
const Clientes = lazy(() => import("./pages/admin/Clientes"));
const Design = lazy(() => import("./pages/admin/Design"));
const Configuracoes = lazy(() => import("./pages/admin/Configuracoes"));
const Plataforma = lazy(() => import("./pages/admin/Plataforma"));
const AdminCourses = lazy(() => import("./pages/admin/Courses"));
const CourseContent = lazy(() => import("./pages/admin/CourseContent"));
const CourseEnrollments = lazy(() => import("./pages/admin/CourseEnrollments"));
const NotificationsManagement = lazy(() => import("./pages/admin/NotificationsManagement"));
const AIKnowledgeBase = lazy(() => import("./pages/admin/AIKnowledgeBase"));
const SupportManagement = lazy(() => import("./pages/admin/SupportManagement"));
const ChatSupport = lazy(() => import("./pages/admin/ChatSupport"));
const AdminAcademy = lazy(() => import("./pages/admin/Academy"));
const ApiDocumentation = lazy(() => import("./pages/admin/ApiDocumentation"));
const Features = lazy(() => import("./pages/admin/Features"));
const Planos = lazy(() => import("./pages/admin/Planos"));
const Marketplaces = lazy(() => import("./pages/admin/Marketplaces"));

// ── Supplier panel ─────────────────────────────────────────────────────────
const SupplierDashboard = lazy(() => import("./pages/supplier/Dashboard"));
const SupplierProductManagement = lazy(() => import("./pages/supplier/ProductManagement"));
const SupplierProductApproval = lazy(() => import("./pages/supplier/ProductApproval"));
const SupplierOrderManagement = lazy(() => import("./pages/supplier/OrderManagement"));
const SupplierInventory = lazy(() => import("./pages/supplier/Inventory"));
const SupplierSales = lazy(() => import("./pages/supplier/Sales"));

// ── Reseller panel ─────────────────────────────────────────────────────────
const ResellerDashboard = lazy(() => import("./pages/reseller/Dashboard"));
const ResellerOnboarding = lazy(() => import("./pages/reseller/Onboarding"));
const ResellerFirstAccess = lazy(() => import("./pages/reseller/FirstAccess"));
const ResellerSales = lazy(() => import("./pages/reseller/Sales"));
const ResellerClients = lazy(() => import("./pages/reseller/Clients"));
const ResellerFinanceiro = lazy(() => import("./pages/reseller/Financeiro"));
const ResellerGoals = lazy(() => import("./pages/reseller/Goals"));
const ResellerCatalog = lazy(() => import("./pages/reseller/Catalog"));
const ResellerProducts = lazy(() => import("./pages/reseller/Products"));
const ResellerOrders = lazy(() => import("./pages/reseller/Orders"));
const ResellerCoupons = lazy(() => import("./pages/reseller/Coupons"));
const ResellerReports = lazy(() => import("./pages/reseller/Reports"));
const ResellerShipping = lazy(() => import("./pages/reseller/Shipping"));
const ResellerTestimonials = lazy(() => import("./pages/reseller/Testimonials"));
const ResellerStoreEditor = lazy(() => import("./pages/reseller/StoreEditor"));
const ResellerPagesEditor = lazy(() => import("./pages/reseller/PagesEditor"));
const ResellerBenefits = lazy(() => import("./pages/reseller/Benefits"));
const ResellerBanners = lazy(() => import("./pages/reseller/Banners"));
const ResellerLojafyIntegra = lazy(() => import("./pages/reseller/LojafyIntegra"));
const MlSuccess = lazy(() => import("./pages/reseller/MlSuccess"));
const MlAnuncios = lazy(() => import("./pages/reseller/MlAnuncios"));
const MlMensagens = lazy(() => import("./pages/reseller/MlMensagens"));
const MlReplicar = lazy(() => import("./pages/reseller/MlReplicar"));
const MlMetricas = lazy(() => import("./pages/reseller/MlMetricas"));
const ResellerMeusAcessos = lazy(() => import("./pages/reseller/MeusAcessos"));
const ResellerTopProdutosVencedores = lazy(() => import("./pages/reseller/TopProdutosVencedores"));

// ── Public store (reseller white-label) ────────────────────────────────────
const PublicStore = lazy(() => import("./pages/PublicStore"));
const PublicStoreProduct = lazy(() => import("./pages/PublicStoreProduct"));
const PublicStoreCategory = lazy(() => import("./pages/PublicStoreCategory"));
const PublicStoreProducts = lazy(() => import("./pages/PublicStoreProducts"));
const PublicStoreCategoryList = lazy(() => import("./pages/PublicStoreCategoryList"));
const PublicStoreFavorites = lazy(() => import("./pages/PublicStoreFavorites"));
const PublicStoreCart = lazy(() => import("./pages/PublicStoreCart"));
const PublicStoreCheckout = lazy(() => import("./pages/PublicStoreCheckout"));
const PublicStoreSearch = lazy(() => import("./pages/PublicStoreSearch"));
const PublicStoreContact = lazy(() => import("./pages/PublicStoreContact"));
const PublicStoreAbout = lazy(() => import("./pages/PublicStoreAbout"));
const PublicStoreFAQ = lazy(() => import("./pages/PublicStoreFAQ"));
const PublicStorePolicyExchange = lazy(() => import("./pages/PublicStorePolicyExchange"));
const PublicStoreTerms = lazy(() => import("./pages/PublicStoreTerms"));
const PublicStoreTrackOrder = lazy(() => import("./pages/PublicStoreTrackOrder"));
const PublicStoreHelpCenter = lazy(() => import("./pages/PublicStoreHelpCenter"));

// ── Shared fallback spinner ────────────────────────────────────────────────
const PageSpinner = () => (
  <div className="flex items-center justify-center min-h-screen">
    <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
  </div>
);

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
            <Suspense fallback={<PageSpinner />}>
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
                <Route path="/top_10_produtos" element={<ResellerTopProdutosVencedores />} />

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
                  <Route path="carteira" element={<CustomerWallet />} />
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
                  <Route index element={<AdminDashboard />} />

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
                  <Route path="planos" element={<Planos />} />
                  <Route path="marketplaces" element={<Marketplaces />} />

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
                  <Route path="ml-sucesso" element={<MlSuccess />} />
                  <Route path="ml-anuncios" element={<MlAnuncios />} />
                  <Route path="ml-mensagens" element={<MlMensagens />} />
                  <Route path="ml-replicar" element={<MlReplicar />} />
                  <Route path="ml-metricas" element={<MlMetricas />} />
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
            </Suspense>
          </BrowserRouter>
          </CartProvider>
        </FavoritesProvider>
      </AuthProvider>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
