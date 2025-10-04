import { useState } from "react";
import { usePublicStoreContext } from '@/hooks/usePublicStoreContext';
import { usePublicStoreDocumentTitle } from '@/hooks/usePublicStoreDocumentTitle';
import PublicStoreHeader from '@/components/public-store/PublicStoreHeader';
import PublicStoreFooter from '@/components/public-store/PublicStoreFooter';
import { useResellerPages } from '@/hooks/useResellerPages';
import { replacePlaceholders } from '@/lib/placeholders';
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { HelpCircle, Search, Package, Truck, CreditCard, RefreshCw, ShoppingCart, MessageCircle } from "lucide-react";
import { Skeleton } from '@/components/ui/skeleton';
const PublicStoreFAQ = () => {
  const {
    store
  } = usePublicStoreContext();
  usePublicStoreDocumentTitle(store, 'Perguntas Frequentes');
  const {
    faqContent,
    isLoading
  } = useResellerPages(store.reseller_id);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("todas");
  const categories = [{
    id: "todas",
    label: "Todas",
    icon: HelpCircle
  }, {
    id: "pedidos",
    label: "Pedidos",
    icon: ShoppingCart
  }, {
    id: "entrega",
    label: "Entrega",
    icon: Truck
  }, {
    id: "pagamento",
    label: "Pagamento",
    icon: CreditCard
  }, {
    id: "troca",
    label: "Troca e Devolução",
    icon: RefreshCw
  }, {
    id: "produtos",
    label: "Produtos",
    icon: Package
  }];
  if (isLoading) {
    return <div className="min-h-screen bg-background">
        <PublicStoreHeader store={store} />
        <main className="container mx-auto px-4 py-12">
          <Skeleton className="h-12 w-64 mb-8 mx-auto" />
          <Skeleton className="h-10 w-full max-w-2xl mb-8 mx-auto" />
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        </main>
        <PublicStoreFooter store={store} />
      </div>;
  }
  const faqs = faqContent?.faqs || [];
  const filteredFaqs = faqs.filter(faq => {
    if (!faq.active) return false;
    const matchesSearch = searchTerm === "" || faq.question.toLowerCase().includes(searchTerm.toLowerCase()) || faq.answer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === "todas" || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });
  const getCategoryCount = (categoryId: string) => {
    if (categoryId === "todas") return faqs.filter(f => f.active).length;
    return faqs.filter(f => f.active && f.category === categoryId).length;
  };
  return <div className="min-h-screen bg-background">
      <PublicStoreHeader store={store} />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-bold mb-4">Perguntas Frequentes</h1>
            <p className="text-xl text-muted-foreground mb-8">
              Encontre respostas rápidas para as dúvidas mais comuns
            </p>
            
            {/* Search */}
            <div className="relative max-w-lg mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input type="text" placeholder="Buscar pergunta..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="pl-10" />
            </div>
          </div>

          {/* Categories */}
          <div className="mb-8">
            <div className="flex flex-wrap gap-3 justify-center">
              {categories.map(category => <Button key={category.id} variant={selectedCategory === category.id ? "default" : "outline"} onClick={() => setSelectedCategory(category.id)} className="gap-2">
                  <category.icon className="h-4 w-4" />
                  {category.label}
                  <Badge variant="secondary" className="ml-1">
                    {getCategoryCount(category.id)}
                  </Badge>
                </Button>)}
            </div>
          </div>

          {/* FAQ List */}
          {filteredFaqs.length > 0 ? <Card>
              <CardContent className="pt-6">
                <Accordion type="single" collapsible className="w-full">
                  {filteredFaqs.map(faq => <AccordionItem key={faq.id} value={faq.id}>
                      <AccordionTrigger className="text-left">
                        {faq.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-muted-foreground">
                        {replacePlaceholders(faq.answer, store)}
                      </AccordionContent>
                    </AccordionItem>)}
                </Accordion>
              </CardContent>
            </Card> : <Card>
              <CardContent className="pt-6 text-center">
                <HelpCircle className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Nenhuma pergunta encontrada
                </h3>
                <p className="text-muted-foreground mb-4">
                  Não encontramos perguntas que correspondam à sua busca.
                </p>
                {(searchTerm || selectedCategory !== "todas") && <Button variant="outline" onClick={() => {
              setSearchTerm("");
              setSelectedCategory("todas");
            }}>
                    Limpar filtros
                  </Button>}
              </CardContent>
            </Card>}

          {/* Contact CTA */}
          <Card className="mt-8">
            <CardContent className="pt-6">
              <div className="text-center">
                <MessageCircle className="w-12 h-12 text-primary mx-auto mb-4" />
                <h3 className="text-xl font-bold mb-4">
                  Não encontrou o que procura?
                </h3>
                <p className="text-muted-foreground mb-6">
                  Nossa equipe está pronta para ajudar você com qualquer dúvida.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {store.whatsapp && <Button onClick={() => {
                  const message = encodeURIComponent(`Olá! Tenho uma dúvida sobre a loja.`);
                  window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
                }} className="bg-green-500 hover:bg-green-400">
                      Falar no WhatsApp
                    </Button>}
                  {store.contact_email && <Button variant="outline" asChild>
                      <a href={`mailto:${store.contact_email}`}>
                        Enviar E-mail
                      </a>
                    </Button>}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      
      <PublicStoreFooter store={store} />
    </div>;
};
export default PublicStoreFAQ;