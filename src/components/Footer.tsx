import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { 
  Facebook, 
  Instagram, 
  Twitter, 
  Youtube,
  CreditCard,
  Shield,
  Truck,
  Clock
} from "lucide-react";

const Footer = () => {
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">E</span>
              </div>
              <span className="text-xl font-bold text-foreground">EcoShop</span>
            </div>
            <p className="text-muted-foreground">
              Sua loja online de confiança com os melhores produtos e preços do mercado.
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>Seg-Sex: 8h às 18h | Sáb: 8h às 14h</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Entregamos em todo o Brasil</span>
              </div>
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Links Úteis</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Quem Somos</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Política de Troca</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Rastrear Pedido</a></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Atendimento</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><a href="#" className="hover:text-primary transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Fale Conosco</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">WhatsApp</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">E-mail</a></li>
              <li><a href="#" className="hover:text-primary transition-colors">Ouvidoria</a></li>
            </ul>
          </div>

          {/* Social & Security */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Siga-nos</h4>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Facebook className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Instagram className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Twitter className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm">
                <Youtube className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3">
              <h5 className="font-medium text-foreground text-sm">Segurança</h5>
              <div className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">Site Protegido</span>
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-8" />

        {/* Payment Methods */}
        <div className="space-y-6">
          <div className="text-center">
            <h5 className="font-medium text-foreground mb-4">Formas de Pagamento</h5>
            <div className="flex flex-wrap justify-center gap-4">
              <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
                <CreditCard className="h-5 w-5 text-blue-600" />
                <span className="text-sm text-muted-foreground">Cartão de Crédito</span>
              </div>
              <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
                <CreditCard className="h-5 w-5 text-green-600" />
                <span className="text-sm text-muted-foreground">PIX</span>
              </div>
              <div className="flex items-center gap-2 bg-card p-3 rounded-lg border">
                <CreditCard className="h-5 w-5 text-orange-600" />
                <span className="text-sm text-muted-foreground">Boleto</span>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="text-center text-sm text-muted-foreground">
            <p>© 2024 EcoShop. Todos os direitos reservados.</p>
            <p className="mt-1">
              CNPJ: 12.345.678/0001-90 | 
              <span className="ml-1">Desenvolvido com ❤️ para você</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;