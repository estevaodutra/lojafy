import { Button } from "@/components/ui/button";
import heroBanner from "@/assets/hero-banner.jpg";

const Hero = () => {
  return (
    <section className="relative bg-hero-gradient text-white overflow-hidden">
      <div className="container mx-auto px-4 py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h1 className="text-4xl md:text-6xl font-bold leading-tight">
              Ofertas da
              <br />
              <span className="text-yellow-300">Semana</span>
            </h1>
            <p className="text-xl md:text-2xl text-blue-100">
              Descontos imperdíveis em produtos selecionados
            </p>
            <p className="text-lg text-blue-200">
              Até <strong className="text-yellow-300">70% OFF</strong> em eletrônicos, moda e casa
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                size="lg"
                className="bg-white text-primary hover:bg-gray-100 font-semibold text-lg px-8 py-4"
              >
                Comprar Agora
              </Button>
              <Button 
                variant="outline"
                size="lg"
                className="border-white text-white hover:bg-white hover:text-primary font-semibold text-lg px-8 py-4"
              >
                Ver Ofertas
              </Button>
            </div>
          </div>
          
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent rounded-2xl"></div>
            <img
              src={heroBanner}
              alt="Produtos em promoção"
              className="w-full h-auto rounded-2xl shadow-2xl"
            />
          </div>
        </div>
      </div>

      {/* Decorative Elements */}
      <div className="absolute top-0 right-0 w-72 h-72 bg-gradient-to-bl from-white/10 to-transparent rounded-full -translate-y-36 translate-x-36"></div>
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-white/5 to-transparent rounded-full translate-y-48 -translate-x-48"></div>
    </section>
  );
};

export default Hero;