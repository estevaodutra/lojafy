import { useState } from "react";
import { usePublicStoreContext } from '@/hooks/usePublicStoreContext';
import { usePublicStoreDocumentTitle } from '@/hooks/usePublicStoreDocumentTitle';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { HeadphonesIcon, MessageCircle, Mail, Phone, Clock, Search, HelpCircle, ShoppingCart, Truck, CreditCard, RefreshCw, FileText } from "lucide-react";
import { Link } from "react-router-dom";
const PublicStoreHelpCenter = () => {
  const {
    store
  } = usePublicStoreContext();
  usePublicStoreDocumentTitle(store, 'Central de Ajuda');
  const [searchTerm, setSearchTerm] = useState("");
  const helpCategories = [{
    icon: ShoppingCart,
    title: "Pedidos",
    description: "Como fazer pedidos, alterar, cancelar",
    link: `/loja/${store.store_slug}/faq`,
    articles: 8
  }, {
    icon: Truck,
    title: "Entrega",
    description: "Prazos, frete, rastreamento",
    link: `/loja/${store.store_slug}/rastrear-pedido`,
    articles: 6
  }, {
    icon: CreditCard,
    title: "Pagamento",
    description: "Formas de pagamento, segurança",
    link: `/loja/${store.store_slug}/faq`,
    articles: 5
  }, {
    icon: RefreshCw,
    title: "Trocas",
    description: "Política de troca e devolução",
    link: `/loja/${store.store_slug}/politica-troca`,
    articles: 4
  }, {
    icon: FileText,
    title: "Termos",
    description: "Termos de uso e políticas",
    link: `/loja/${store.store_slug}/termos-uso`,
    articles: 3
  }, {
    icon: HelpCircle,
    title: "Outros",
    description: "Outras dúvidas gerais",
    link: `/loja/${store.store_slug}/faq`,
    articles: 7
  }];
  const contactOptions = [{
    icon: MessageCircle,
    title: "WhatsApp",
    description: "Resposta mais rápida",
    time: "Online agora",
    action: "Conversar",
    variant: "default" as const,
    contact: store.whatsapp || "(00) 00000-0000",
    available: !!store.whatsapp
  }, {
    icon: Mail,
    title: "E-mail",
    description: "Para assuntos mais complexos",
    time: "Resposta em até 4h",
    action: "Enviar E-mail",
    variant: "outline" as const,
    contact: store.contact_email || "contato@loja.com",
    available: !!store.contact_email
  }, {
    icon: Phone,
    title: "Telefone",
    description: "Atendimento personalizado",
    time: "Horário comercial",
    action: "Ligar",
    variant: "outline" as const,
    contact: store.contact_phone || "(00) 0000-0000",
    available: !!store.contact_phone
  }];
  const quickActions = [{
    title: "Rastrear Pedido",
    description: "Acompanhe seu pedido em tempo real",
    link: `/loja/${store.store_slug}/rastrear-pedido`,
    icon: Truck
  }, {
    title: "Política de Troca",
    description: "Condições para troca e devolução",
    link: `/loja/${store.store_slug}/politica-troca`,
    icon: RefreshCw
  }, {
    title: "FAQ",
    description: "Perguntas mais frequentes",
    link: `/loja/${store.store_slug}/faq`,
    icon: HelpCircle
  }, {
    title: "Termos de Uso",
    description: "Leia nossos termos e condições",
    link: `/loja/${store.store_slug}/termos-uso`,
    icon: FileText
  }];
  const handleWhatsAppClick = () => {
    if (store.whatsapp) {
      const message = encodeURIComponent(`Olá! Preciso de ajuda.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };
  return <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Central de Ajuda</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Estamos aqui para ajudar você. Encontre respostas ou entre em contato conosco.
            </p>
            
            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input type="text" placeholder="Como podemos ajudar você hoje?" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10 pr-4 py-3 text-base" />
            </div>
          </div>

          {/* Contact Options */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">
              Fale Conosco
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {contactOptions.filter(opt => opt.available).map((option, index) => <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
                      <option.icon className="w-8 h-8 text-black" />
                    </div>
                    <h3 className="text-lg font-semibold mb-2">{option.title}</h3>
                    <p className="text-muted-foreground text-sm mb-2">{option.description}</p>
                    <div className="flex items-center justify-center gap-1 mb-4">
                      <Clock className="w-4 h-4 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">{option.time}</span>
                    </div>
                    <p className="text-sm font-medium mb-3">{option.contact}</p>
                    <Button variant={option.variant} onClick={option.icon === MessageCircle ? handleWhatsAppClick : undefined} asChild={option.icon !== MessageCircle} className="w-full bg-blue-500 hover:bg-blue-400 text-white">
                      {option.icon === MessageCircle ? <span>{option.action}</span> : option.icon === Mail ? <a href={`mailto:${store.contact_email}`}>{option.action}</a> : <a href={`tel:${store.contact_phone}`}>{option.action}</a>}
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
          </div>

          {/* Help Categories */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">
              Navegue por Categoria
            </h2>
            <div className="grid md:grid-cols-3 gap-6">
              {helpCategories.map((category, index) => <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-4">
                      <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                        <category.icon className="w-6 h-6 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-semibold">{category.title}</h3>
                          <Badge variant="secondary">{category.articles}</Badge>
                        </div>
                        <p className="text-muted-foreground text-sm mb-3">{category.description}</p>
                        <Button variant="ghost" size="sm" asChild className="p-0 h-auto">
                          <Link to={category.link}>Ver artigos →</Link>
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>)}
            </div>
          </div>

          {/* Quick Actions */}
          <div className="mb-12">
            <h2 className="text-2xl font-bold text-center mb-8">
              Ações Rápidas
            </h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
              {quickActions.map((action, index) => <Card key={index} className="hover:shadow-lg transition-shadow">
                  <CardContent className="pt-6 text-center">
                    <action.icon className="w-8 h-8 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold mb-2">{action.title}</h3>
                    <p className="text-muted-foreground text-xs mb-3">{action.description}</p>
                    <Button variant="outline" size="sm" asChild className="w-full">
                      <Link to={action.link}>Acessar</Link>
                    </Button>
                  </CardContent>
                </Card>)}
            </div>
          </div>

          {/* Status/Hours */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <HeadphonesIcon className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-4">
                  Horário de Atendimento
                </h3>
                <div className="grid md:grid-cols-3 gap-6 text-sm">
                  {store.whatsapp && <div>
                      <h4 className="font-semibold mb-2">WhatsApp</h4>
                      <p className="text-muted-foreground">
                        Segunda a Sábado<br />
                        8h às 20h
                      </p>
                    </div>}
                  {store.contact_phone && <div>
                      <h4 className="font-semibold mb-2">Telefone</h4>
                      <p className="text-muted-foreground">
                        Segunda a Sexta<br />
                        8h às 18h
                      </p>
                    </div>}
                  {store.contact_email && <div>
                      <h4 className="font-semibold mb-2">E-mail</h4>
                      <p className="text-muted-foreground">
                        24 horas<br />
                        Resposta em até 4h
                      </p>
                    </div>}
                </div>
                <div className="mt-6 flex items-center justify-center gap-2">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <span className="text-sm text-muted-foreground">
                    Atendimento online - Resposta rápida
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>;
};
export default PublicStoreHelpCenter;