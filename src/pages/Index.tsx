import Header from "@/components/Header";
import Hero from "@/components/Hero";
import ProductGrid from "@/components/ProductGrid";
import CategoryCarousels from "@/components/CategoryCarousels";
import CategorySection from "@/components/CategorySection";
import Benefits from "@/components/Benefits";
import Testimonials from "@/components/Testimonials";
import Newsletter from "@/components/Newsletter";
import Footer from "@/components/Footer";
import { useAuthRedirect } from "@/hooks/useAuthRedirect";

const Index = () => {
  // Handle automatic role-based redirection
  useAuthRedirect();
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <ProductGrid />
        <CategoryCarousels />
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