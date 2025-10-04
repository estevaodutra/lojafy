import { Phone, Mail, MapPin, MessageCircle, Instagram, Facebook } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PublicStoreData } from "@/hooks/usePublicStore";
interface PublicStoreFooterProps {
  store: PublicStoreData;
}
const PublicStoreFooter = ({
  store
}: PublicStoreFooterProps) => {
  const handleWhatsAppContact = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Olá! Vi sua loja online e gostaria de mais informações.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };
  return <footer className="bg-background border-t py-12" style={{
    backgroundColor: store.secondary_color || '#f3f4f6'
  }}>
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Store Info */}
          <div className="space-y-4">
            <div className="flex items-center space-x-3">
              {store.logo_url && <img src={store.logo_url} alt={store.store_name} className="h-12 w-auto" />}
              <h3 className="text-xl font-bold">{store.store_name}</h3>
            </div>
            <p className="text-muted-foreground">
              Sua loja online de confiança com os melhores produtos e preços especiais.
            </p>
            
            {/* Payment Methods */}
            <div className="space-y-2">
              <h4 className="font-semibold text-sm">Formas de Pagamento:</h4>
              <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                {store.payment_methods?.pix && <span>PIX</span>}
                {store.payment_methods?.credit_card && <span>• Cartão de Crédito</span>}
                {store.payment_methods?.debit_card && <span>• Cartão de Débito</span>}
              </div>
            </div>
          </div>

          {/* Contact Info */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Contato</h3>
            <div className="space-y-3">
              <div className="flex items-center space-x-3">
                <MessageCircle className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{store.whatsapp || '(00) 00000-0000'}</span>
              </div>
              <div className="flex items-center space-x-3">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <span className="text-sm">{store.contact_email || 'contato@loja.com'}</span>
              </div>
              <div className="flex items-start space-x-3">
                <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0 mt-0.5" />
                <span className="text-sm">{store.contact_address || 'Rua Exemplo, 123 - Bairro - Cidade/UF'}</span>
              </div>
              {store.whatsapp && <Button onClick={handleWhatsAppContact} style={{
              backgroundColor: store.accent_color
            }} className="mt-4 text-white bg-green-500 hover:bg-green-400">
                  <MessageCircle className="mr-2 h-4 w-4" />
                  Falar no WhatsApp
                </Button>}
            </div>
          </div>

          {/* Links */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Links Úteis</h3>
            <div className="space-y-2 text-sm">
              <a href={`/loja/${store.store_slug}/quem-somos`} className="block hover:text-primary transition-colors">
                Quem Somos
              </a>
              <a href={`/loja/${store.store_slug}/faq`} className="block hover:text-primary transition-colors">
                Perguntas Frequentes
              </a>
              <a href={`/loja/${store.store_slug}/politica-troca`} className="block hover:text-primary transition-colors">
                Política de Troca
              </a>
              <a href={`/loja/${store.store_slug}/termos-uso`} className="block hover:text-primary transition-colors">
                Termos de Uso
              </a>
              <a href={`/loja/${store.store_slug}/rastrear-pedido`} className="block hover:text-primary transition-colors">
                Rastrear Pedido
              </a>
              <a href={`/loja/${store.store_slug}/ajuda`} className="block hover:text-primary transition-colors">
                Central de Ajuda
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="border-t mt-8 pt-8 text-center">
          <div className="flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} {store.store_name}. Todos os direitos reservados.
            </p>
            <p className="text-xs text-muted-foreground">
              Loja online powered by Lojafy
            </p>
          </div>
        </div>
      </div>
    </footer>;
};
export default PublicStoreFooter;