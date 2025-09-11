import { useState } from "react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, HelpCircle, ShoppingCart, Truck, CreditCard, RefreshCw, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { FAQItem } from "@/types";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const faqData: FAQItem[] = [
    // Pedidos
    {
      id: "1",
      question: "Como faço um pedido?",
      answer: "Para fazer um pedido, navegue pelos produtos, adicione os itens desejados ao carrinho e clique em 'Finalizar Compra'. Preencha seus dados de entrega e pagamento para concluir o pedido.",
      category: "pedidos"
    },
    {
      id: "2",
      question: "Posso alterar ou cancelar meu pedido?",
      answer: "Você pode alterar ou cancelar seu pedido até 2 horas após a confirmação. Após esse prazo, entre em contato conosco pelo WhatsApp (11) 99999-9999.",
      category: "pedidos"
    },
    {
      id: "3",
      question: "Como acompanho meu pedido?",
      answer: "Após a confirmação do pedido, você receberá um código de rastreamento por e-mail. Você também pode acompanhar o status na seção 'Rastrear Pedido' do nosso site.",
      category: "pedidos"
    },
    
    // Entrega
    {
      id: "4",
      question: "Qual o prazo de entrega?",
      answer: "O prazo de entrega varia conforme sua localização: Região Sudeste: 3-5 dias úteis, Região Sul: 5-7 dias úteis, Demais regiões: 7-12 dias úteis. O prazo começa a contar após a aprovação do pagamento.",
      category: "entrega"
    },
    {
      id: "5",
      question: "Vocês entregam em todo o Brasil?",
      answer: "Sim, entregamos em todo território nacional através dos Correios. Algumas localidades remotas podem ter prazo estendido.",
      category: "entrega"
    },
    {
      id: "6",
      question: "Como é calculado o frete?",
      answer: "O frete é calculado automaticamente com base no CEP de destino, peso e dimensões do produto. Oferecemos frete grátis para compras acima de R$ 299,00 (Sul e Sudeste) ou R$ 399,00 (demais regiões).",
      category: "entrega"
    },
    
    // Pagamento
    {
      id: "7",
      question: "Quais formas de pagamento vocês aceitam?",
      answer: "Aceitamos cartões de crédito (Visa, Mastercard, Elo), cartões de débito, PIX e boleto bancário. Para cartão de crédito, parcelamos em até 12x sem juros em compras acima de R$ 500,00.",
      category: "pagamento"
    },
    {
      id: "8",
      question: "É seguro comprar no site?",
      answer: "Sim, nosso site possui certificado SSL e seguimos os mais altos padrões de segurança. Seus dados estão protegidos e não compartilhamos informações com terceiros.",
      category: "pagamento"
    },
    {
      id: "9",
      question: "Quando o pagamento é processado?",
      answer: "Cartão de crédito/débito e PIX: aprovação imediata. Boleto: até 3 dias úteis após o pagamento. Só enviamos os produtos após a confirmação do pagamento.",
      category: "pagamento"
    },
    
    // Troca e Devolução
    {
      id: "10",
      question: "Posso trocar um produto?",
      answer: "Sim, você tem 30 dias para trocar produtos em perfeito estado, na embalagem original. Por arrependimento, o prazo é de 7 dias. O frete da devolução é gratuito em caso de defeito ou erro nosso.",
      category: "troca"
    },
    {
      id: "11",
      question: "Como solicito uma troca?",
      answer: "Entre em contato conosco através do WhatsApp, e-mail ou formulário de contato informando o número do pedido e motivo da troca. Nossa equipe enviará as instruções para devolução.",
      category: "troca"
    },
    {
      id: "12",
      question: "Quanto tempo demora o reembolso?",
      answer: "Após recebermos e analisarmos o produto devolvido, o reembolso é processado em até 7 dias úteis. O valor é estornado na mesma forma de pagamento utilizada na compra.",
      category: "troca"
    },
    
    // Produtos
    {
      id: "13",
      question: "Os produtos têm garantia?",
      answer: "Todos os produtos possuem garantia do fabricante. Eletrônicos: 12 meses, Acessórios: 3-6 meses conforme especificação. Também oferecemos garantia estendida opcional para alguns produtos.",
      category: "produtos"
    },
    {
      id: "14",
      question: "Os produtos são originais?",
      answer: "Sim, todos os nossos produtos são 100% originais e procedentes. Trabalhamos apenas com fornecedores autorizados e oferecemos nota fiscal em todas as vendas.",
      category: "produtos"
    },
    {
      id: "15",
      question: "Posso retirar o produto na loja?",
      answer: "Atualmente trabalhamos apenas com vendas online e entrega via Correios. Não possuímos loja física para retirada.",
      category: "produtos"
    }
  ];

  const categories = [
    { id: "pedidos", name: "Pedidos", icon: ShoppingCart, count: faqData.filter(faq => faq.category === "pedidos").length },
    { id: "entrega", name: "Entrega", icon: Truck, count: faqData.filter(faq => faq.category === "entrega").length },
    { id: "pagamento", name: "Pagamento", icon: CreditCard, count: faqData.filter(faq => faq.category === "pagamento").length },
    { id: "troca", name: "Troca e Devolução", icon: RefreshCw, count: faqData.filter(faq => faq.category === "troca").length },
    { id: "produtos", name: "Produtos", icon: HelpCircle, count: faqData.filter(faq => faq.category === "produtos").length }
  ];

  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold text-foreground mb-4">
              Perguntas Frequentes
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Encontre rapidamente as respostas que você procura
            </p>
            
            {/* Search */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                type="text"
                placeholder="Pesquisar nas perguntas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground mb-6">Categorias</h2>
            <div className="grid md:grid-cols-5 gap-4 mb-6">
              {categories.map((category) => (
                <Card 
                  key={category.id}
                  className={`cursor-pointer transition-colors hover:bg-muted ${
                    selectedCategory === category.id ? 'ring-2 ring-primary' : ''
                  }`}
                  onClick={() => setSelectedCategory(selectedCategory === category.id ? null : category.id)}
                >
                  <CardContent className="pt-6 text-center">
                    <category.icon className="w-8 h-8 mx-auto mb-3 text-primary" />
                    <h3 className="font-semibold text-sm mb-2">{category.name}</h3>
                    <Badge variant="secondary">{category.count}</Badge>
                  </CardContent>
                </Card>
              ))}
            </div>
            
            {selectedCategory && (
              <div className="flex items-center gap-2 mb-4">
                <span className="text-sm text-muted-foreground">Filtrando por:</span>
                <Badge variant="outline">
                  {categories.find(cat => cat.id === selectedCategory)?.name}
                </Badge>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setSelectedCategory(null)}
                  className="text-xs"
                >
                  Limpar filtro
                </Button>
              </div>
            )}
          </div>

          {/* FAQ Items */}
          <div className="mb-12">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-foreground">
                {selectedCategory 
                  ? `${categories.find(cat => cat.id === selectedCategory)?.name} (${filteredFAQs.length})`
                  : `Todas as Perguntas (${filteredFAQs.length})`
                }
              </h2>
            </div>

            {filteredFAQs.length > 0 ? (
              <Card>
                <CardContent className="pt-6">
                  <Accordion type="single" collapsible className="w-full">
                    {filteredFAQs.map((faq) => (
                      <AccordionItem key={faq.id} value={faq.id}>
                        <AccordionTrigger className="text-left">
                          <div className="flex items-start gap-3">
                            <HelpCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                            <span>{faq.question}</span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="pl-8">
                            <p className="text-muted-foreground whitespace-pre-line">
                              {faq.answer}
                            </p>
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="pt-6 text-center">
                  <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-foreground mb-2">
                    Nenhuma pergunta encontrada
                  </h3>
                  <p className="text-muted-foreground mb-4">
                    Não encontramos perguntas que correspondam à sua pesquisa.
                  </p>
                  <Button onClick={() => { setSearchTerm(""); setSelectedCategory(null); }}>
                    Ver todas as perguntas
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Contact CTA */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center">
                <Phone className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold text-foreground mb-4">
                  Não encontrou a resposta?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe de atendimento está pronta para ajudar você com qualquer dúvida.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button asChild>
                    <Link to="/contato">
                      Entrar em Contato
                    </Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/central-ajuda">
                      Central de Ajuda
                    </Link>
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <Footer />
    </div>
  );
};

export default FAQ;