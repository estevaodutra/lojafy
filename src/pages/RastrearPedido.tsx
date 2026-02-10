import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { Package, Search, CheckCircle, Truck, MapPin, Clock, AlertCircle } from "lucide-react";

interface OrderTracking {
  orderId: string;
  trackingCode: string;
  status: 'pending' | 'confirmed' | 'preparing' | 'shipped' | 'in_transit' | 'delivered';
  estimatedDelivery: string;
  items: Array<{
    name: string;
    quantity: number;
    price: number;
    image: string;
  }>;
  timeline: Array<{
    status: string;
    description: string;
    date: string;
    location?: string;
    completed: boolean;
  }>;
}

const RastrearPedido = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [orderData, setOrderData] = useState<OrderTracking | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const { toast } = useToast();

  // Mock data for demonstration
  const mockOrderData: OrderTracking = {
    orderId: "EC-2024-001234",
    trackingCode: "AA123456789BR",
    status: "in_transit",
    estimatedDelivery: "2024-01-20",
    items: [
      {
        name: "iPhone 15 Pro Max",
        quantity: 1,
        price: 7999,
        image: "/src/assets/product-phone.jpg"
      }
    ],
    timeline: [
      {
        status: "Pedido confirmado",
        description: "Seu pedido foi confirmado e está sendo processado",
        date: "2024-01-15 10:30",
        completed: true
      },
      {
        status: "Pagamento aprovado",
        description: "Pagamento processado com sucesso",
        date: "2024-01-15 10:45",
        completed: true
      },
      {
        status: "Preparando para envio",
        description: "Produto separado e embalado para envio",
        date: "2024-01-16 14:20",
        completed: true
      },
      {
        status: "Objeto postado",
        description: "Produto enviado através dos Correios",
        date: "2024-01-17 08:15",
        location: "São Paulo - SP",
        completed: true
      },
      {
        status: "Em trânsito",
        description: "Produto em transporte para o destino",
        date: "2024-01-18 16:45",
        location: "Rio de Janeiro - RJ",
        completed: true
      },
      {
        status: "Saiu para entrega",
        description: "Produto saiu para entrega no endereço de destino",
        date: "2024-01-19 08:30",
        location: "Rio de Janeiro - RJ",
        completed: false
      },
      {
        status: "Entregue",
        description: "Produto entregue ao destinatário",
        date: "",
        completed: false
      }
    ]
  };

  const formatPrice = (price: number) => {
    return price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR') + ' às ' + date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: string) => {
    const statusMap = {
      pending: { variant: "secondary" as const, text: "Pendente" },
      confirmed: { variant: "default" as const, text: "Confirmado" },
      preparing: { variant: "default" as const, text: "Em preparação" },
      processing: { variant: "default" as const, text: "Em preparação" },
      shipped: { variant: "default" as const, text: "Enviado" },
      in_transit: { variant: "default" as const, text: "Em Trânsito" },
      delivered: { variant: "default" as const, text: "Finalizado" },
      cancelled: { variant: "destructive" as const, text: "Cancelado" },
      refunded: { variant: "secondary" as const, text: "Reembolsado" },
      // Portuguese status keys
      pendente: { variant: "secondary" as const, text: "Pendente" },
      recebido: { variant: "default" as const, text: "Recebido" },
      em_preparacao: { variant: "default" as const, text: "Em Preparação" },
      embalado: { variant: "default" as const, text: "Embalado" },
      enviado: { variant: "default" as const, text: "Enviado" },
      em_reposicao: { variant: "outline" as const, text: "Em Reposição" },
      em_falta: { variant: "destructive" as const, text: "Em Falta" },
      finalizado: { variant: "default" as const, text: "Finalizado" },
      cancelado: { variant: "destructive" as const, text: "Cancelado" },
      reembolsado: { variant: "secondary" as const, text: "Reembolsado" },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || statusMap.pending;
    return <Badge variant={config.variant}>{config.text}</Badge>;
  };

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
    setNotFound(false);
    setOrderData(null);

    // Simulate API call
    setTimeout(() => {
      if (searchTerm.includes("001234") || searchTerm.includes("AA123456789BR")) {
        setOrderData(mockOrderData);
        setNotFound(false);
      } else {
        setOrderData(null);
        setNotFound(true);
      }
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
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">Rastrear Pedido</h1>
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
                    placeholder="Ex: EC-2024-001234 ou AA123456789BR"
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

          {/* Loading State */}
          {isLoading && (
            <Card>
              <CardContent className="pt-6 text-center">
                <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4 animate-pulse" />
                <p className="text-muted-foreground">Buscando informações do pedido...</p>
              </CardContent>
            </Card>
          )}

          {/* Not Found */}
          {notFound && (
            <Card>
              <CardContent className="pt-6 text-center">
                <AlertCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Pedido não encontrado
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não conseguimos encontrar um pedido com essas informações. 
                  Verifique se digitou corretamente o número do pedido ou código de rastreamento.
                </p>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p>• Aguarde até 24h após a compra para rastrear</p>
                  <p>• Verifique se copiou o código completo</p>
                  <p>• Entre em contato se o problema persistir</p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Order Details */}
          {orderData && (
            <div className="space-y-6">
              {/* Order Summary */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="w-5 h-5" />
                      Pedido #{orderData.orderId}
                    </div>
                    {getStatusBadge(orderData.status)}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Informações do Pedido</h4>
                      <div className="space-y-2 text-sm">
                        <p><strong>Código de Rastreamento:</strong> {orderData.trackingCode}</p>
                        <p><strong>Previsão de Entrega:</strong> {new Date(orderData.estimatedDelivery).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-foreground mb-2">Itens do Pedido</h4>
                      {orderData.items.map((item, index) => (
                        <div key={index} className="flex items-center gap-3">
                          <img 
                            src={item.image} 
                            alt={item.name}
                            className="w-12 h-12 object-cover rounded"
                          />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{item.name}</p>
                            <p className="text-xs text-muted-foreground">
                              Qtd: {item.quantity} - {formatPrice(item.price)}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Timeline */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="w-5 h-5" />
                    Histórico de Rastreamento
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {orderData.timeline.map((event, index) => (
                      <div key={index} className="flex items-start gap-4">
                        <div className={`w-4 h-4 rounded-full flex-shrink-0 mt-0.5 ${
                          event.completed ? 'bg-green-500' : 'bg-muted border-2 border-muted-foreground'
                        }`}>
                          {event.completed && <CheckCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h4 className={`font-semibold ${
                              event.completed ? 'text-foreground' : 'text-muted-foreground'
                            }`}>
                              {event.status}
                            </h4>
                            <span className="text-sm text-muted-foreground">
                              {formatDate(event.date)}
                            </span>
                          </div>
                          <p className={`text-sm ${
                            event.completed ? 'text-muted-foreground' : 'text-muted-foreground/60'
                          }`}>
                            {event.description}
                          </p>
                          {event.location && (
                            <div className="flex items-center gap-1 mt-1">
                              <MapPin className="w-3 h-3 text-muted-foreground" />
                              <span className="text-xs text-muted-foreground">{event.location}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Additional Info */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 mb-4">
                    <Truck className="w-5 h-5 text-primary" />
                    <h4 className="font-semibold text-foreground">Informações de Entrega</h4>
                  </div>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <p>• Para receber seu pedido, é necessário apresentar um documento com foto</p>
                    <p>• Caso não esteja em casa, o carteiro deixará um aviso de entrega</p>
                    <p>• Você terá 7 dias para retirar o produto na agência dos Correios</p>
                    <p>• Em caso de dúvidas, entre em contato conosco pelo WhatsApp (11) 99999-9999</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Demo Info */}
          {!orderData && !notFound && !isLoading && (
            <Card>
              <CardContent className="pt-6">
                <div className="text-center">
                  <Package className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-4">
                    Como rastrear seu pedido
                  </h3>
                  <div className="space-y-2 text-sm text-muted-foreground text-left max-w-md mx-auto">
                    <p>1. Após a confirmação do pedido, você receberá um e-mail com o número do pedido</p>
                    <p>2. Quando o produto for enviado, receberá o código de rastreamento dos Correios</p>
                    <p>3. Use qualquer um desses códigos no campo acima para acompanhar seu pedido</p>
                  </div>
                  <Separator className="my-6" />
                  <div className="text-xs text-muted-foreground">
                    <p><strong>Para testar:</strong> Use "EC-2024-001234" ou "AA123456789BR"</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default RastrearPedido;