import React from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useDocumentTitle } from "@/hooks/useDocumentTitle";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { FavoritesProvider } from "@/contexts/FavoritesContext";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import Categorias from "./pages/Categorias";
import Promocoes from "./pages/Promocoes";
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
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerOrders from "./pages/customer/Orders";
import CustomerAddresses from "./pages/customer/Addresses";
import CustomerFavorites from "./pages/customer/Favorites";
import CustomerSettings from "./pages/customer/Settings";
import CustomerHelp from "./pages/customer/Help";
import { RoleBasedRoute } from "./components/auth/RoleBasedRoute";
import AdminLayout from "./components/admin/AdminLayout";
import { SupplierLayout } from "./components/layouts/SupplierLayout";
import { ResellerLayout } from "./components/layouts/ResellerLayout";
import { SuperAdminLayout } from "./components/layouts/SuperAdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";
import AdminBanners from "./pages/admin/Banners";
import AdminOrders from "./pages/admin/Orders";
import AdminCustomers from "./pages/admin/Customers";
import IntegracaoPage from "./pages/admin/Integracoes";
import HomepageManagement from "./pages/admin/Homepage";
import AdminCategorias from "./pages/admin/Categorias";
import Depoimentos from "./pages/admin/Depoimentos";
import NewsletterConfig from "./pages/admin/NewsletterConfig";
import ConfiguracaoVisual from "./pages/admin/ConfiguracaoVisual";
import Frete from "./pages/admin/Frete";
import SupplierDashboard from "./pages/supplier/Dashboard";
import SupplierProducts from "./pages/supplier/Products";
import SupplierInventory from "./pages/supplier/Inventory";
import SupplierSales from "./pages/supplier/Sales";
import SupplierReports from "./pages/supplier/Reports";
import ResellerDashboard from "./pages/reseller/Dashboard";
import ResellerSales from "./pages/reseller/Sales";
import ResellerClients from "./pages/reseller/Clients";
import ResellerCommissions from "./pages/reseller/Commissions";
import ResellerGoals from "./pages/reseller/Goals";
import ResellerReports from "./pages/reseller/Reports";
import ResellerCatalog from "./pages/reseller/Catalog";
import ResellerProducts from "./pages/reseller/Products";
import ResellerStoreEditor from "./pages/reseller/StoreEditor";
import PublicStore from "./pages/PublicStore";
import PublicStoreProduct from "./pages/PublicStoreProduct";
import PublicStoreCategory from "./pages/PublicStoreCategory";
import PublicStoreProducts from "./pages/PublicStoreProducts";
import PublicStoreCategories from "./pages/PublicStoreCategories";
import PublicStoreFavorites from "./pages/PublicStoreFavorites";
import PublicStoreCart from "./pages/PublicStoreCart";
import PublicStoreCheckout from "./pages/PublicStoreCheckout";
import PublicStoreSearch from "./pages/PublicStoreSearch";
import SuperAdminDashboard from "./pages/admin/Dashboard";
import Usuarios from "./pages/admin/Usuarios";
import Plataforma from "./pages/admin/Plataforma";
import PublicStoreProviderRoute from "./components/public-store/PublicStoreProviderRoute";

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
  useDocumentTitle();
  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
          <AppContent />
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/categorias" element={<Categorias />} />
              <Route path="/categorias/:slug" element={<Categorias />} />
              <Route path="/promocoes" element={<Promocoes />} />
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
              
              {/* Customer Panel Routes */}
              <Route path="/minha-conta" element={<CustomerLayout />}>
                <Route index element={<CustomerDashboard />} />
                <Route path="pedidos" element={<CustomerOrders />} />
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
                <Route path="clientes" element={<AdminCustomers />} />
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
                <Route path="usuarios" element={<Usuarios />} />
                <Route path="plataforma" element={<Plataforma />} />
                <Route path="produtos" element={<AdminProducts />} />
                <Route path="categorias" element={<AdminCategorias />} />
                <Route path="pedidos" element={<AdminOrders />} />
                <Route path="clientes" element={<AdminCustomers />} />
                <Route path="homepage" element={<HomepageManagement />} />
                <Route path="configuracao-visual" element={<ConfiguracaoVisual />} />
                <Route path="banners" element={<AdminBanners />} />
                <Route path="depoimentos" element={<Depoimentos />} />
                <Route path="newsletter-config" element={<NewsletterConfig />} />
                <Route path="frete" element={<Frete />} />
                <Route path="integracoes" element={<IntegracaoPage />} />
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
                <Route path="produtos" element={<SupplierProducts />} />
                <Route path="estoque" element={<SupplierInventory />} />
                <Route path="vendas" element={<SupplierSales />} />
                <Route path="relatorios" element={<SupplierReports />} />
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
                <Route path="dashboard" element={<ResellerDashboard />} />
                <Route path="catalogo" element={<ResellerCatalog />} />
                <Route path="produtos" element={<ResellerProducts />} />
                <Route path="loja" element={<ResellerStoreEditor />} />
                <Route path="vendas" element={<ResellerSales />} />
                <Route path="clientes" element={<ResellerClients />} />
                <Route path="comissoes" element={<ResellerCommissions />} />
                <Route path="metas" element={<ResellerGoals />} />
                <Route path="relatorios" element={<ResellerReports />} />
              </Route>
              
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              {/* Public Store Routes */}
              <Route path="/loja/:slug" element={<PublicStore />} />
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
                    <PublicStoreCategories />
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
