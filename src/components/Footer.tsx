import { Link } from "react-router-dom";
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
import { useStoreConfig } from "@/hooks/useStoreConfig";

const Footer = () => {
  const { config } = useStoreConfig();
  
  return (
    <footer className="bg-secondary/50 border-t">
      <div className="container mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              {config?.logo_url ? (
                <img 
                  src={config.logo_url} 
                  alt={config.store_name || "Logo"} 
                  className="w-8 h-8 object-contain"
                />
              ) : (
                <div className="w-8 h-8 bg-hero-gradient rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">{config?.store_name?.[0] || "E"}</span>
                </div>
              )}
              <span className="text-xl font-bold text-foreground">{config?.store_name || "EcoShop"}</span>
            </div>
            <p className="text-muted-foreground">
              {config?.footer_description || "Sua loja online de confiança com os melhores produtos e preços do mercado."}
            </p>
            <div className="space-y-2 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{config?.business_hours || "Seg-Sex: 8h às 18h | Sáb: 8h às 14h"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck className="h-4 w-4" />
                <span>Entregamos em todo o Brasil</span>
              </div>
              {config?.company_address && (
                <div className="flex items-start gap-2">
                  <div className="h-4 w-4 mt-0.5">📍</div>
                  <span>{config.company_address}</span>
                </div>
              )}
              {config?.company_phone && (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4">📞</div>
                  <a 
                    href={`https://wa.me/55${config.company_phone.replace(/\D/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-primary transition-colors"
                  >
                    {config.company_phone}
                  </a>
                </div>
              )}
              {config?.company_email && (
                <div className="flex items-center gap-2">
                  <div className="h-4 w-4">✉️</div>
                  <a 
                    href={`mailto:${config.company_email}`}
                    className="hover:text-primary transition-colors"
                  >
                    {config.company_email}
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Quick Links */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Links Úteis</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/quem-somos" className="hover:text-primary transition-colors">Quem Somos</Link></li>
              <li><Link to="/politica-troca" className="hover:text-primary transition-colors">Política de Troca</Link></li>
              <li><Link to="/termos-uso" className="hover:text-primary transition-colors">Termos de Uso</Link></li>
              <li><Link to="/faq" className="hover:text-primary transition-colors">FAQ</Link></li>
              <li><Link to="/rastrear-pedido" className="hover:text-primary transition-colors">Rastrear Pedido</Link></li>
            </ul>
          </div>

          {/* Customer Service */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Atendimento</h4>
            <ul className="space-y-2 text-muted-foreground">
              <li><Link to="/central-ajuda" className="hover:text-primary transition-colors">Central de Ajuda</Link></li>
              <li><Link to="/contato" className="hover:text-primary transition-colors">Fale Conosco</Link></li>
              <li><Link to="/contato" className="hover:text-primary transition-colors">WhatsApp</Link></li>
              <li><Link to="/contato" className="hover:text-primary transition-colors">E-mail</Link></li>
              <li><Link to="/contato" className="hover:text-primary transition-colors">Ouvidoria</Link></li>
            </ul>
          </div>

          {/* Social & Security */}
          <div className="space-y-4">
            <h4 className="font-semibold text-foreground">Siga-nos</h4>
            <div className="flex gap-2">
              {config?.facebook_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={config.facebook_url} target="_blank" rel="noopener noreferrer">
                    <Facebook className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {config?.instagram_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={config.instagram_url} target="_blank" rel="noopener noreferrer">
                    <Instagram className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {config?.twitter_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={config.twitter_url} target="_blank" rel="noopener noreferrer">
                    <Twitter className="h-4 w-4" />
                  </a>
                </Button>
              )}
              {config?.youtube_url && (
                <Button variant="outline" size="sm" asChild>
                  <a href={config.youtube_url} target="_blank" rel="noopener noreferrer">
                    <Youtube className="h-4 w-4" />
                  </a>
                </Button>
              )}
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
            <p>© 2024 {config?.store_name || "EcoShop"}. Todos os direitos reservados.</p>
            <p className="mt-1">
              <span>{config?.footer_developed_text || "Desenvolvido com ❤️ para você"}</span>
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;