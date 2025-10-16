import { useState } from "react";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Search, HelpCircle, ShoppingCart, Truck, CreditCard, RefreshCw, Phone, Package } from "lucide-react";
import { Link } from "react-router-dom";
import { FAQItem } from "@/types";

const FAQ = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const { data: faqData = [], isLoading } = useQuery({
    queryKey: ['public-faqs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('ai_knowledge_base')
        .select('*')
        .eq('category', 'faq')
        .eq('target_audience', 'customer')
        .eq('active', true)
        .order('priority', { ascending: false });
      
      if (error) throw error;
      
      // Mapear para o formato FAQItem
      return (data || []).map(faq => ({
        id: faq.id,
        question: faq.title,
        answer: faq.content,
        category: faq.subcategory?.toLowerCase().replace(/\s+/g, '-') || 'outros'
      })) as FAQItem[];
    }
  });

  const categories = [
    { id: "pedidos", name: "Pedidos", icon: ShoppingCart, count: faqData.filter(faq => faq.category === "pedidos").length },
    { id: "entrega", name: "Entrega", icon: Truck, count: faqData.filter(faq => faq.category === "entrega").length },
    { id: "pagamento", name: "Pagamento", icon: CreditCard, count: faqData.filter(faq => faq.category === "pagamento").length },
    { id: "troca-e-devolucao", name: "Troca e Devolução", icon: RefreshCw, count: faqData.filter(faq => faq.category === "troca-e-devolucao").length },
    { id: "produtos", name: "Produtos", icon: Package, count: faqData.filter(faq => faq.category === "produtos").length }
  ];

  const filteredFAQs = faqData.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = !selectedCategory || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-96">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

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
