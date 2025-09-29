import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import CategorySection from "@/components/CategorySection";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";
import { useLocation, useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

const Index = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useUserRole();
  
  // Handle automatic role-based redirection
  useAuthRedirect();
  
  // Check if super admin is viewing store
  const searchParams = new URLSearchParams(location.search);
  const isViewingStore = searchParams.get('view') === 'store' && isSuperAdmin();

  return (
    <div className="min-h-screen">
      {isViewingStore && (
        <div className="bg-primary text-primary-foreground p-2 text-center">
          <div className="container mx-auto flex items-center justify-center gap-4">
            <span className="text-sm">Visualizando loja como Super Admin</span>
            <Button 
              variant="secondary" 
              size="sm"
              onClick={() => navigate('/super-admin')}
              className="h-8"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar ao Painel
            </Button>
          </div>
        </div>
      )}
      <Header />
      <main>
        <Hero />
        <ProductGrid />
        <CategorySection />
        <Benefits />
        <Testimonials />
        <Newsletter />
      </main>
      <Footer />
    </div>
  );
};

export default Index;