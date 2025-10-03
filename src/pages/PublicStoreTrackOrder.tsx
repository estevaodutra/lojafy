import { useState } from "react";
import { usePublicStoreContext } from '@/hooks/usePublicStoreContext';
import { usePublicStoreDocumentTitle } from '@/hooks/usePublicStoreDocumentTitle';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, AlertCircle } from "lucide-react";

const PublicStoreTrackOrder = () => {
  const { store } = usePublicStoreContext();
  usePublicStoreDocumentTitle(store, 'Rastrear Pedido');

  const [searchTerm, setSearchTerm] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      toast({
        title: "Campo obrigatório",
        description: "Por favor, informe o número do pedido ou código de rastreamento.",
        variant: "destructive"
      });
      return;
    }

    setIsLoading(true);

    // Simulate API call - you can implement real tracking here
    setTimeout(() => {
      toast({
        title: "Funcionalidade em desenvolvimento",
        description: "O rastreamento de pedidos estará disponível em breve.",
      });
      setIsLoading(false);
    }, 1500);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Rastrear Pedido</h1>
            <p className="text-xl text-muted-foreground">
              Acompanhe o status do seu pedido em tempo real
            </p>
          </div>

          {/* Search Form */}
          <Card className="mb-8">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="w-5 h-5" />
                Consultar Pedido
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="search">Número do Pedido ou Código de Rastreamento</Label>
                <div className="flex gap-2 mt-2">
                  <Input
                    id="search"
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ex: ORD-20240115-001234 ou AA123456789BR"
                    className="flex-1"
                  />
                  <Button onClick={handleSearch} disabled={isLoading}>
                    {isLoading ? "Buscando..." : "Buscar"}
                  </Button>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                <p>💡 <strong>Dica:</strong> Você pode usar o número do pedido (enviado por e-mail) ou o código de rastreamento dos Correios.</p>
                <p className="mt-1">📧 Não encontra essas informações? Verifique sua caixa de entrada e spam.</p>
              </div>
            </CardContent>
          </Card>

          {/* How to track */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-4">
                  Como rastrear seu pedido
                </h3>
                <div className="space-y-2 text-sm text-muted-foreground text-left max-w-md mx-auto">
                  <p>1. Após a confirmação do pedido, você receberá um e-mail com o número do pedido</p>
                  <p>2. Quando o produto for enviado, receberá o código de rastreamento dos Correios</p>
                  <p>3. Use qualquer um desses códigos no campo acima para acompanhar seu pedido</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Contact Info */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <AlertCircle className="w-6 h-6 text-primary flex-shrink-0 mt-1" />
                <div>
                  <h4 className="font-semibold mb-2">Precisa de ajuda?</h4>
                  <p className="text-muted-foreground text-sm mb-3">
                    Se você não conseguir encontrar seu pedido ou tiver dúvidas sobre o rastreamento, 
                    entre em contato conosco:
                  </p>
                  <div className="space-y-1 text-sm">
                    {store.whatsapp && (
                      <p>
                        <strong>WhatsApp:</strong>{" "}
                        <a 
                          href={`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}`}
                          className="text-primary hover:underline"
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          {store.whatsapp}
                        </a>
                      </p>
                    )}
                    {store.contact_phone && (
                      <p><strong>Telefone:</strong> {store.contact_phone}</p>
                    )}
                    {store.contact_email && (
                      <p><strong>E-mail:</strong> {store.contact_email}</p>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>
  );
};

export default PublicStoreTrackOrder;
