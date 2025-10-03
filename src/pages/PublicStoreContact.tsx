import { usePublicStoreContext } from "@/hooks/usePublicStoreContext";
import PublicStoreHeader from "@/components/public-store/PublicStoreHeader";
import PublicStoreFooter from "@/components/public-store/PublicStoreFooter";
import { MessageCircle, Mail, MapPin, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";

const PublicStoreContact = () => {
  const { store } = usePublicStoreContext();

  const handleWhatsAppContact = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Olá! Vi sua loja online e gostaria de mais informações.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-12">
        <h1 className="text-4xl font-bold mb-8 text-foreground">Entre em Contato</h1>
        
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl">
          {/* Informações de Contato */}
          <div className="space-y-6 bg-card p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-4 text-foreground">Fale Conosco</h2>
            
            {store.whatsapp && (
              <div className="flex items-start gap-3">
                <MessageCircle className="h-5 w-5 mt-1" style={{ color: store.accent_color }} />
                <div>
                  <p className="font-medium text-foreground">WhatsApp</p>
                  <p className="text-muted-foreground">{store.whatsapp}</p>
                </div>
              </div>
            )}
            
            {store.contact_email && (
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 mt-1" style={{ color: store.accent_color }} />
                <div>
                  <p className="font-medium text-foreground">Email</p>
                  <p className="text-muted-foreground">{store.contact_email}</p>
                </div>
              </div>
            )}
            
            {store.contact_phone && (
              <div className="flex items-start gap-3">
                <Phone className="h-5 w-5 mt-1" style={{ color: store.accent_color }} />
                <div>
                  <p className="font-medium text-foreground">Telefone</p>
                  <p className="text-muted-foreground">{store.contact_phone}</p>
                </div>
              </div>
            )}
            
            {store.contact_address && (
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 mt-1" style={{ color: store.accent_color }} />
                <div>
                  <p className="font-medium text-foreground">Endereço</p>
                  <p className="text-muted-foreground">{store.contact_address}</p>
                </div>
              </div>
            )}
            
            {store.whatsapp && (
              <Button 
                onClick={handleWhatsAppContact}
                className="mt-6 w-full text-white"
                style={{ backgroundColor: store.accent_color }}
              >
                <MessageCircle className="mr-2 h-4 w-4" />
                Falar no WhatsApp
              </Button>
            )}
          </div>
          
          {/* Horário de Atendimento */}
          <div className="bg-muted p-6 rounded-lg border">
            <h2 className="text-2xl font-semibold mb-6 text-foreground">Horário de Atendimento</h2>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Segunda a Sexta</span>
                <span className="text-muted-foreground">9h às 18h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Sábado</span>
                <span className="text-muted-foreground">9h às 13h</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-foreground font-medium">Domingo</span>
                <span className="text-muted-foreground">Fechado</span>
              </div>
            </div>
            
            <div className="mt-8 p-4 bg-background rounded-lg border">
              <p className="text-sm text-muted-foreground">
                Estamos prontos para atendê-lo! Entre em contato conosco através de qualquer um dos canais acima e teremos prazer em ajudá-lo.
              </p>
            </div>
          </div>
        </div>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreContact;
