import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle } from 'lucide-react';
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
      knowledgeBaseCategory: addToKnowledgeBase ? knowledgeCategory : undefined
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
            />
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
                  onCheckedChange={(checked) => setAddToKnowledgeBase(checked as boolean)}
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
                      <SelectItem value="pedidos">Pedidos</SelectItem>
                      <SelectItem value="entrega">Entrega</SelectItem>
                      <SelectItem value="pagamento">Pagamento</SelectItem>
                      <SelectItem value="produto">Produto</SelectItem>
                      <SelectItem value="conta">Conta</SelectItem>
                      <SelectItem value="devolucao">Devolução</SelectItem>
                      <SelectItem value="geral">Geral</SelectItem>
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
