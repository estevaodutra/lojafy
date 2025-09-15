import React from 'react';
import { useStoreConfig } from '@/hooks/useStoreConfig';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { HelpCircle, MessageCircle, Mail, Phone, Clock, FileText, Truck, CreditCard, ShoppingCart } from 'lucide-react';
import { Link } from 'react-router-dom';

const Help = () => {
  const { config } = useStoreConfig();
  const faqItems = [
    {
      question: "Como posso rastrear meu pedido?",
      answer: "Você pode rastrear seu pedido na seção 'Meus Pedidos' do seu painel. Clique em 'Rastrear pedido' e você será direcionado para acompanhar o status da entrega em tempo real."
    },
    {
      question: "Qual o prazo de entrega?",
      answer: "O prazo de entrega varia conforme sua localização e o método de envio escolhido. Normalmente, entregamos em 3-7 dias úteis para região metropolitana e 5-15 dias úteis para demais regiões."
    },
    {
      question: "Como posso alterar ou cancelar meu pedido?",
      answer: "Pedidos podem ser alterados ou cancelados até 2 horas após a confirmação do pagamento. Entre em contato conosco o mais rápido possível através do chat ou telefone."
    },
    {
      question: "Quais formas de pagamento vocês aceitam?",
      answer: "Aceitamos pagamentos via PIX, cartão de crédito, cartão de débito e boleto bancário. O PIX oferece desconto e confirmação instantânea."
    },
    {
      question: "Como funciona a política de troca e devolução?",
      answer: "Você tem até 30 dias para solicitar troca ou devolução de produtos. O item deve estar em condições originais. Consulte nossa política completa de trocas para mais detalhes."
    },
    {
      question: "O que fazer se meu produto chegou com defeito?",
      answer: "Entre em contato conosco imediatamente através do chat ou telefone. Faremos a troca ou reembolso integral sem custos adicionais para você."
    }
  ];

  const contactOptions = [
    {
      icon: MessageCircle,
      title: "Chat Online",
      description: "Atendimento em tempo real",
      time: "24/7",
      action: "Iniciar Chat",
      variant: "default" as const
    },
    {
      icon: Phone,
      title: "Telefone",
      description: config?.company_phone || "(11) 4000-1234",
      time: config?.business_hours || "Seg-Sex: 8h às 18h",
      action: "Ligar Agora",
      variant: "outline" as const
    },
    {
      icon: Mail,
      title: "Email",
      description: config?.company_email || "contato@loja.com",
      time: "Resposta em até 24h",
      action: "Enviar Email",
      variant: "outline" as const
    }
  ];

  const helpCategories = [
    {
      icon: ShoppingCart,
      title: "Pedidos",
      description: "Dúvidas sobre como fazer pedidos, alterar ou cancelar",
      link: "/central-ajuda"
    },
    {
      icon: Truck,
      title: "Entrega",
      description: "Informações sobre prazos, rastreamento e entregas",
      link: "/rastrear-pedido"
    },
    {
      icon: CreditCard,
      title: "Pagamentos",
      description: "Formas de pagamento, faturas e reembolsos",
      link: "/central-ajuda"
    },
    {
      icon: FileText,
      title: "Políticas",
      description: "Termos de uso, política de privacidade e trocas",
      link: "/politica-troca"
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Central de Ajuda</h1>
        <p className="text-muted-foreground mt-2">
          Encontre respostas para suas dúvidas ou entre em contato conosco
        </p>
      </div>

      {/* Quick Contact */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {contactOptions.map((option, index) => (
          <Card key={index} className="text-center">
            <CardContent className="pt-6">
              <option.icon className="h-8 w-8 mx-auto mb-3 text-primary" />
              <h3 className="font-semibold text-lg mb-1">{option.title}</h3>
              <p className="text-muted-foreground mb-2">{option.description}</p>
              <div className="flex items-center justify-center gap-1 mb-4">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{option.time}</span>
              </div>
              <Button variant={option.variant} className="w-full">
                {option.action}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Help Categories */}
      <Card>
        <CardHeader>
          <CardTitle>Categorias de Ajuda</CardTitle>
          <CardDescription>
            Explore os tópicos mais comuns de ajuda
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {helpCategories.map((category, index) => (
              <Link key={index} to={category.link}>
                <Card className="h-full hover:shadow-md transition-shadow cursor-pointer">
                  <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                      <category.icon className="h-6 w-6 text-primary mt-1" />
                      <div>
                        <h3 className="font-semibold mb-2">{category.title}</h3>
                        <p className="text-sm text-muted-foreground">
                          {category.description}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* FAQ */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <HelpCircle className="h-5 w-5" />
            Perguntas Frequentes
          </CardTitle>
          <CardDescription>
            Respostas para as dúvidas mais comuns
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {faqItems.map((item, index) => (
              <AccordionItem key={index} value={`item-${index}`}>
                <AccordionTrigger className="text-left">
                  {item.question}
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground">
                  {item.answer}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quick Links */}
      <Card>
        <CardHeader>
          <CardTitle>Links Úteis</CardTitle>
          <CardDescription>
            Acesso rápido às páginas importantes
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" asChild>
              <Link to="/politica-troca">Política de Troca</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/termos-uso">Termos de Uso</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/faq">FAQ Completo</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/rastrear-pedido">Rastrear Pedido</Link>
            </Button>
            <Button variant="outline" size="sm" asChild>
              <Link to="/contato">Entre em Contato</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Still Need Help */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="text-center py-8">
          <h3 className="text-xl font-semibold mb-2">Ainda precisa de ajuda?</h3>
          <p className="text-muted-foreground mb-4">
            Nossa equipe está sempre pronta para ajudar você
          </p>
          <div className="flex justify-center gap-4">
            <Button>
              <MessageCircle className="h-4 w-4 mr-2" />
              Falar com Suporte
            </Button>
            <Button variant="outline" asChild>
              <Link to="/contato">
                <Mail className="h-4 w-4 mr-2" />
                Enviar Mensagem
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Help;