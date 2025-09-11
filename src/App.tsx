import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
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
import QuemSomos from "./pages/QuemSomos";
import PoliticaTroca from "./pages/PoliticaTroca";
import TermosUso from "./pages/TermosUso";
import FAQ from "./pages/FAQ";
import RastrearPedido from "./pages/RastrearPedido";
import CentralAjuda from "./pages/CentralAjuda";
import Carrinho from "./pages/Carrinho";
import NotFound from "./pages/NotFound";
import Auth from "./pages/Auth";
import CustomerLayout from "./components/customer/CustomerLayout";
import CustomerDashboard from "./pages/customer/Dashboard";
import CustomerOrders from "./pages/customer/Orders";
import AdminLayout from "./components/admin/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminProducts from "./pages/admin/Products";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
        <FavoritesProvider>
          <CartProvider>
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
              <Route path="/quem-somos" element={<QuemSomos />} />
              <Route path="/politica-troca" element={<PoliticaTroca />} />
              <Route path="/termos-uso" element={<TermosUso />} />
              <Route path="/faq" element={<FAQ />} />
              <Route path="/rastrear-pedido" element={<RastrearPedido />} />
              <Route path="/central-ajuda" element={<CentralAjuda />} />
              <Route path="/carrinho" element={<Carrinho />} />
              <Route path="/auth" element={<Auth />} />
              
              {/* Customer Panel Routes */}
              <Route path="/minha-conta" element={<CustomerLayout />}>
                <Route index element={<CustomerDashboard />} />
                <Route path="pedidos" element={<CustomerOrders />} />
              </Route>
              
              {/* Admin Panel Routes */}
              <Route path="/admin" element={<AdminLayout />}>
                <Route index element={<AdminDashboard />} />
                <Route path="produtos" element={<AdminProducts />} />
              </Route>
              
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

export default App;
