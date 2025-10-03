import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useResellerPages, AboutContent, FAQContent, DEFAULT_ABOUT, DEFAULT_FAQS } from '@/hooks/useResellerPages';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { FileText, HelpCircle, Plus, Trash2, Save } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';

const PagesEditor = () => {
  const { user } = useAuth();
  const { aboutContent, faqContent, isLoading, saveAboutContent, saveFAQContent } = useResellerPages();
  const { toast } = useToast();

  const [editedAbout, setEditedAbout] = useState<AboutContent>(aboutContent || DEFAULT_ABOUT);
  const [editedFAQ, setEditedFAQ] = useState<FAQContent>(faqContent || { faqs: DEFAULT_FAQS });

  // Update local state when data loads
  useState(() => {
    if (aboutContent) setEditedAbout(aboutContent);
    if (faqContent) setEditedFAQ(faqContent);
  });

  const handleSaveAbout = async () => {
    const success = await saveAboutContent(editedAbout);
    if (success) {
      toast({
        title: "Sucesso!",
        description: "Página 'Quem Somos' atualizada com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const handleSaveFAQ = async () => {
    const success = await saveFAQContent(editedFAQ);
    if (success) {
      toast({
        title: "Sucesso!",
        description: "Perguntas Frequentes atualizadas com sucesso.",
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível salvar as alterações.",
        variant: "destructive"
      });
    }
  };

  const addValue = () => {
    setEditedAbout({
      ...editedAbout,
      values: [...(editedAbout.values || []), { title: '', description: '' }]
    });
  };

  const removeValue = (index: number) => {
    setEditedAbout({
      ...editedAbout,
      values: editedAbout.values?.filter((_, i) => i !== index)
    });
  };

  const updateValue = (index: number, field: 'title' | 'description', value: string) => {
    const newValues = [...(editedAbout.values || [])];
    newValues[index] = { ...newValues[index], [field]: value };
    setEditedAbout({ ...editedAbout, values: newValues });
  };

  const addFAQ = () => {
    const newId = String(Date.now());
    setEditedFAQ({
      faqs: [...editedFAQ.faqs, {
        id: newId,
        question: '',
        answer: '',
        category: 'outros',
        active: true
      }]
    });
  };

  const removeFAQ = (id: string) => {
    setEditedFAQ({
      faqs: editedFAQ.faqs.filter(faq => faq.id !== id)
    });
  };

  const updateFAQ = (id: string, updates: Partial<typeof editedFAQ.faqs[0]>) => {
    setEditedFAQ({
      faqs: editedFAQ.faqs.map(faq => 
        faq.id === id ? { ...faq, ...updates } : faq
      )
    });
  };

  const resetToDefaults = (type: 'about' | 'faq') => {
    if (type === 'about') {
      setEditedAbout(DEFAULT_ABOUT);
    } else {
      setEditedFAQ({ faqs: DEFAULT_FAQS });
    }
  };

  return (
    <div className="container mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Gerenciar Páginas da Loja</h1>
        <p className="text-muted-foreground">
          Personalize o conteúdo das páginas institucionais da sua loja.
        </p>
      </div>

      <Tabs defaultValue="about" className="w-full">
        <TabsList className="grid w-full md:w-auto grid-cols-2 mb-6">
          <TabsTrigger value="about" className="gap-2">
            <FileText className="h-4 w-4" />
            Quem Somos
          </TabsTrigger>
          <TabsTrigger value="faq" className="gap-2">
            <HelpCircle className="h-4 w-4" />
            FAQ
          </TabsTrigger>
        </TabsList>

        {/* About Content */}
        <TabsContent value="about">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Conteúdo da Página "Quem Somos"</CardTitle>
                <Button variant="outline" size="sm" onClick={() => resetToDefaults('about')}>
                  Restaurar Padrão
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Story */}
              <div>
                <Label htmlFor="story">Nossa História</Label>
                <Textarea
                  id="story"
                  value={editedAbout.story || ''}
                  onChange={(e) => setEditedAbout({ ...editedAbout, story: e.target.value })}
                  rows={4}
                  placeholder="Conte a história da sua loja..."
                />
              </div>

              {/* Mission */}
              <div>
                <Label htmlFor="mission">Missão</Label>
                <Textarea
                  id="mission"
                  value={editedAbout.mission || ''}
                  onChange={(e) => setEditedAbout({ ...editedAbout, mission: e.target.value })}
                  rows={3}
                  placeholder="Qual é a missão da sua loja?"
                />
              </div>

              {/* Vision */}
              <div>
                <Label htmlFor="vision">Visão</Label>
                <Textarea
                  id="vision"
                  value={editedAbout.vision || ''}
                  onChange={(e) => setEditedAbout({ ...editedAbout, vision: e.target.value })}
                  rows={3}
                  placeholder="Qual é a visão da sua loja?"
                />
              </div>

              {/* Values */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <Label>Valores</Label>
                  <Button size="sm" onClick={addValue}>
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Valor
                  </Button>
                </div>
                <div className="space-y-4">
                  {editedAbout.values?.map((value, index) => (
                    <Card key={index}>
                      <CardContent className="pt-4 space-y-3">
                        <div className="flex justify-between items-center">
                          <Label>Valor {index + 1}</Label>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeValue(index)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <Input
                          placeholder="Título do valor"
                          value={value.title}
                          onChange={(e) => updateValue(index, 'title', e.target.value)}
                        />
                        <Textarea
                          placeholder="Descrição do valor"
                          value={value.description}
                          onChange={(e) => updateValue(index, 'description', e.target.value)}
                          rows={2}
                        />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={() => setEditedAbout(aboutContent || DEFAULT_ABOUT)}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveAbout} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* FAQ Content */}
        <TabsContent value="faq">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>Perguntas Frequentes</CardTitle>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => resetToDefaults('faq')}>
                    Restaurar Padrão
                  </Button>
                  <Button size="sm" onClick={addFAQ}>
                    <Plus className="h-4 w-4 mr-2" />
                    Nova Pergunta
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {editedFAQ.faqs.map((faq, index) => (
                  <Card key={faq.id}>
                    <CardContent className="pt-4 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2">
                          <Badge variant={faq.active ? "default" : "secondary"}>
                            {faq.active ? "Ativa" : "Inativa"}
                          </Badge>
                          <Badge variant="outline">{faq.category}</Badge>
                        </div>
                        <div className="flex gap-2">
                          <div className="flex items-center gap-2">
                            <Label htmlFor={`active-${faq.id}`} className="text-sm">Ativa</Label>
                            <Switch
                              id={`active-${faq.id}`}
                              checked={faq.active}
                              onCheckedChange={(checked) => updateFAQ(faq.id, { active: checked })}
                            />
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFAQ(faq.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor={`category-${faq.id}`}>Categoria</Label>
                        <select
                          id={`category-${faq.id}`}
                          value={faq.category}
                          onChange={(e) => updateFAQ(faq.id, { category: e.target.value })}
                          className="w-full p-2 border rounded-md"
                        >
                          <option value="pedidos">Pedidos</option>
                          <option value="entrega">Entrega</option>
                          <option value="pagamento">Pagamento</option>
                          <option value="troca">Troca e Devolução</option>
                          <option value="produtos">Produtos</option>
                          <option value="outros">Outros</option>
                        </select>
                      </div>

                      <div>
                        <Label htmlFor={`question-${faq.id}`}>Pergunta</Label>
                        <Input
                          id={`question-${faq.id}`}
                          value={faq.question}
                          onChange={(e) => updateFAQ(faq.id, { question: e.target.value })}
                          placeholder="Digite a pergunta..."
                        />
                      </div>

                      <div>
                        <Label htmlFor={`answer-${faq.id}`}>Resposta</Label>
                        <Textarea
                          id={`answer-${faq.id}`}
                          value={faq.answer}
                          onChange={(e) => updateFAQ(faq.id, { answer: e.target.value })}
                          rows={3}
                          placeholder="Digite a resposta... (Use {STORE_NAME}, {PHONE}, {EMAIL}, {WHATSAPP}, {ADDRESS} para dados dinâmicos)"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          💡 Você pode usar variáveis como {'{PHONE}'}, {'{WHATSAPP}'}, {'{EMAIL}'} que serão substituídas automaticamente
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}

                {editedFAQ.faqs.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Nenhuma pergunta cadastrada.</p>
                    <p className="text-sm">Clique em "Nova Pergunta" para começar.</p>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="outline" onClick={() => setEditedFAQ(faqContent || { faqs: DEFAULT_FAQS })}>
                  Cancelar
                </Button>
                <Button onClick={handleSaveFAQ} disabled={isLoading}>
                  <Save className="h-4 w-4 mr-2" />
                  Salvar Alterações
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default PagesEditor;
