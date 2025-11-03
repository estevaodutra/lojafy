import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';
import { useAICorrections } from '@/hooks/useAICorrections';
import { useStandardAnswers } from '@/hooks/useStandardAnswers';
import { toast } from 'sonner';

interface ChatMessage {
  id: string;
  content: string;
  sender_type: string;
  created_at: string;
}

interface CorrectAIResponseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  message: ChatMessage;
  customerQuestion: string;
  ticketId: string;
}

export const CorrectAIResponseModal = ({
  open,
  onOpenChange,
  message,
  customerQuestion,
  ticketId
}: CorrectAIResponseModalProps) => {
  const { saveCorrection, saving } = useAICorrections();
  const { standardAnswers } = useStandardAnswers();
  
  const [correctResponse, setCorrectResponse] = useState('');
  const [createStandardAnswer, setCreateStandardAnswer] = useState(false);
  const [standardAnswerName, setStandardAnswerName] = useState('');
  const [updateExisting, setUpdateExisting] = useState(false);
  const [selectedAnswerId, setSelectedAnswerId] = useState('');
  const [addToKnowledgeBase, setAddToKnowledgeBase] = useState(false);
  const [knowledgeTitle, setKnowledgeTitle] = useState('');
  const [knowledgeCategory, setKnowledgeCategory] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [useExistingAnswer, setUseExistingAnswer] = useState(false);
  const [selectedExistingAnswerId, setSelectedExistingAnswerId] = useState('');

  const normalizeCategory = (value: string): string => {
    const mapping: Record<string, string> = {
      'geral': 'general',
      'produto': 'product_info',
      'politica': 'policy',
      'faq': 'faq',
      'aulas': 'academy_lesson',
      'academy': 'academy_lesson',
      'pedidos': 'general',
      'entrega': 'general',
      'pagamento': 'general',
      'conta': 'general',
      'devolucao': 'policy'
    };
    return mapping[value.toLowerCase()] || value;
  };

  const extractKeywords = (text: string): string[] => {
    const words = text.toLowerCase()
      .replace(/[^\w\sáàâãéèêíïóôõöúçñ]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 4);
    
    const stopWords = [
      'para', 'sobre', 'como', 'quando', 'onde', 'porque', 'qual', 'quais',
      'essa', 'esse', 'esta', 'este', 'aquela', 'aquele',
      'tinha', 'tem', 'teve', 'ter', 'mais', 'menos', 'muito', 'pouco',
      'grande', 'pequeno', 'maior', 'menor', 'novo', 'nova', 'novos', 'novas',
      'todo', 'toda', 'todos', 'todas', 'cada', 'algum', 'alguns', 'nenhum',
      'outro', 'outra', 'outros', 'outras'
    ];
    return [...new Set(words.filter(word => !stopWords.includes(word)))].slice(0, 10);
  };

  useEffect(() => {
    if (open) {
      setKeywords(extractKeywords(customerQuestion));
    }
  }, [open, customerQuestion]);

  const handleSave = async () => {
    // Validações
    if (!correctResponse.trim()) {
      toast.error('Digite uma resposta corrigida');
      return;
    }

    if (createStandardAnswer && !standardAnswerName.trim()) {
      toast.error('Digite um nome para a resposta padrão');
      return;
    }

    if (updateExisting && !selectedAnswerId) {
      toast.error('Selecione uma resposta padrão para atualizar');
      return;
    }

    if (addToKnowledgeBase && (!knowledgeTitle.trim() || !knowledgeCategory)) {
      toast.error('Preencha o título e selecione uma categoria para a base de conhecimento');
      return;
    }

    // Normalize and validate category
    const normalizedCategory = addToKnowledgeBase ? normalizeCategory(knowledgeCategory) : undefined;
    const allowedCategories = ['faq', 'policy', 'product_info', 'general', 'academy_lesson'];
    
    if (addToKnowledgeBase && (!normalizedCategory || !allowedCategories.includes(normalizedCategory))) {
      toast.error('Categoria inválida. Escolha uma das opções: FAQ, Política, Informação de Produto, Geral ou Aulas da Academia.');
      return;
    }

    const success = await saveCorrection({
      ticketId,
      messageId: message.id,
      customerQuestion,
      aiResponse: message.content,
      correctResponse,
      keywords,
      createStandardAnswer,
      standardAnswerName: createStandardAnswer ? standardAnswerName : undefined,
      updateStandardAnswerId: updateExisting ? selectedAnswerId : undefined,
      addToKnowledgeBase,
      knowledgeBaseTitle: addToKnowledgeBase ? knowledgeTitle : undefined,
      knowledgeBaseCategory: normalizedCategory
    });

    if (success) {
      onOpenChange(false);
      // Reset form
      setCorrectResponse('');
      setCreateStandardAnswer(false);
      setStandardAnswerName('');
      setUpdateExisting(false);
      setSelectedAnswerId('');
      setAddToKnowledgeBase(false);
      setKnowledgeTitle('');
      setKnowledgeCategory('');
      setUseExistingAnswer(false);
      setSelectedExistingAnswerId('');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-orange-500" />
            Corrigir Resposta da IA
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Customer Question */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Pergunta do Cliente</Label>
            <div className="p-3 bg-muted rounded-lg text-sm">
              {customerQuestion}
            </div>
          </div>

          {/* AI Response (Wrong) */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-orange-600 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Resposta da IA (Incorreta)
            </Label>
            <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
              {message.content}
            </div>
          </div>

          {/* Correct Response */}
          <div>
            <Label className="text-sm font-medium mb-2 block text-green-600 flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Resposta Correta *
            </Label>
            <Textarea
              value={correctResponse}
              onChange={(e) => setCorrectResponse(e.target.value)}
              placeholder="Digite a resposta correta que deveria ter sido enviada..."
              className="min-h-[120px]"
              disabled={useExistingAnswer && !!selectedExistingAnswerId}
            />
            {useExistingAnswer && selectedExistingAnswerId && (
              <p className="text-xs text-muted-foreground mt-1">
                ℹ️ Desmarque "Usar resposta padrão existente" para editar manualmente
              </p>
            )}
          </div>

          {/* Use Existing Standard Answer */}
          <div className="space-y-2 border-t pt-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="use-existing-answer"
                checked={useExistingAnswer}
                onCheckedChange={(checked) => {
                  setUseExistingAnswer(checked as boolean);
                  if (!checked) {
                    setSelectedExistingAnswerId('');
                  }
                }}
              />
              <Label htmlFor="use-existing-answer" className="font-normal cursor-pointer flex items-center gap-1">
                Usar resposta padrão existente
                <Info className="h-3 w-3 text-muted-foreground" />
              </Label>
            </div>
            {useExistingAnswer && (
              <>
                {standardAnswers.filter(a => a.active).length === 0 ? (
                  <p className="text-sm text-muted-foreground italic ml-6">
                    Nenhuma resposta padrão disponível
                  </p>
                ) : (
                  <>
                    <Select 
                      value={selectedExistingAnswerId} 
                      onValueChange={(value) => {
                        setSelectedExistingAnswerId(value);
                        const selected = standardAnswers.find(a => a.id === value);
                        if (selected) {
                          setCorrectResponse(selected.answer);
                          toast.success('Resposta preenchida automaticamente');
                        }
                      }}
                    >
                      <SelectTrigger className="w-full ml-6">
                        <SelectValue placeholder="Selecione uma resposta padrão" />
                      </SelectTrigger>
                      <SelectContent>
                        {standardAnswers
                          .filter(a => a.active)
                          .sort((a, b) => {
                            if (b.usage_count !== a.usage_count) {
                              return b.usage_count - a.usage_count;
                            }
                            return a.name.localeCompare(b.name);
                          })
                          .map((answer) => (
                            <SelectItem key={answer.id} value={answer.id}>
                              <div className="flex items-center justify-between w-full">
                                <span>{answer.name}</span>
                                <Badge variant="secondary" className="ml-2 text-xs">
                                  {answer.usage_count} usos
                                </Badge>
                              </div>
                            </SelectItem>
                          ))
                        }
                      </SelectContent>
                    </Select>
                    {selectedExistingAnswerId && (
                      <div className="ml-6 mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm">
                        <div className="font-medium text-blue-900 mb-1">Prévia da resposta:</div>
                        <div className="text-blue-700 line-clamp-3">
                          {standardAnswers.find(a => a.id === selectedExistingAnswerId)?.answer}
                        </div>
                      </div>
                    )}
                    <p className="text-xs text-muted-foreground ml-6">
                      💡 Selecione uma resposta já cadastrada para usar como base
                    </p>
                  </>
                )}
              </>
            )}
          </div>

          {/* Keywords */}
          <div>
            <Label className="text-sm font-medium mb-2 block">Palavras-chave (Auto-extraídas)</Label>
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword, i) => (
                <Badge key={i} variant="secondary">{keyword}</Badge>
              ))}
            </div>
          </div>

          {/* Options */}
          <div className="space-y-3 pt-2 border-t">
            {/* Create Standard Answer */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="create-standard"
                  checked={createStandardAnswer}
                  onCheckedChange={(checked) => {
                    setCreateStandardAnswer(checked as boolean);
                    if (checked) setUpdateExisting(false);
                  }}
                />
                <Label htmlFor="create-standard" className="font-normal cursor-pointer">
                  Criar nova resposta padrão
                </Label>
              </div>
              {createStandardAnswer && (
                <Input
                  placeholder="Nome da resposta padrão (ex: Política de Trocas)"
                  value={standardAnswerName}
                  onChange={(e) => setStandardAnswerName(e.target.value)}
                  className="ml-6"
                />
              )}
            </div>

            {/* Update Existing Standard Answer */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="update-existing"
                  checked={updateExisting}
                  onCheckedChange={(checked) => {
                    setUpdateExisting(checked as boolean);
                    if (checked) setCreateStandardAnswer(false);
                  }}
                />
                <Label htmlFor="update-existing" className="font-normal cursor-pointer">
                  Atualizar resposta padrão existente
                </Label>
              </div>
              {updateExisting && (
                <Select value={selectedAnswerId} onValueChange={setSelectedAnswerId}>
                  <SelectTrigger className="ml-6">
                    <SelectValue placeholder="Selecione a resposta a atualizar" />
                  </SelectTrigger>
                  <SelectContent>
                    {standardAnswers.filter(a => a.active).map((answer) => (
                      <SelectItem key={answer.id} value={answer.id}>
                        {answer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            {/* Add to Knowledge Base */}
            <div className="space-y-2">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="add-knowledge"
                  checked={addToKnowledgeBase}
                  onCheckedChange={(checked) => {
                    setAddToKnowledgeBase(checked as boolean);
                    if (checked && !knowledgeCategory) {
                      setKnowledgeCategory('general');
                    }
                  }}
                />
                <Label htmlFor="add-knowledge" className="font-normal cursor-pointer">
                  Adicionar à base de conhecimento
                </Label>
              </div>
              {addToKnowledgeBase && (
                <div className="ml-6 space-y-2">
                  <Input
                    placeholder="Título (ex: Como solicitar troca de produto)"
                    value={knowledgeTitle}
                    onChange={(e) => setKnowledgeTitle(e.target.value)}
                  />
                  <Select value={knowledgeCategory} onValueChange={setKnowledgeCategory}>
                    <SelectTrigger>
                      <SelectValue placeholder="Categoria" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="faq">FAQ</SelectItem>
                      <SelectItem value="policy">Política</SelectItem>
                      <SelectItem value="product_info">Informação de Produto</SelectItem>
                      <SelectItem value="general">Geral</SelectItem>
                      <SelectItem value="academy_lesson">Aulas da Academia</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!correctResponse.trim() || saving}
          >
            {saving ? 'Salvando...' : 'Salvar Correção e Enviar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
