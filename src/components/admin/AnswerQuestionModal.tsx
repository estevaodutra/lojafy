import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { PendingQuestion } from '@/hooks/usePendingQuestions';

interface AnswerQuestionModalProps {
  question: PendingQuestion | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, answer: string) => Promise<void>;
}

export default function AnswerQuestionModal({
  question,
  open,
  onClose,
  onSave
}: AnswerQuestionModalProps) {
  const [answer, setAnswer] = useState(question?.answer || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!question || !answer.trim()) return;
    
    setSaving(true);
    try {
      await onSave(question.id, answer);
      onClose();
      setAnswer('');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {question?.status === 'answered' ? 'Editar Resposta' : 'Responder Pergunta'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Pergunta</Label>
            <div className="p-3 bg-muted rounded-md mt-2">
              <p className="text-sm">{question?.question}</p>
            </div>
            <div className="flex gap-2 mt-2 text-xs text-muted-foreground">
              <span>Perguntada {question?.asked_count}x</span>
              {question?.keywords && question.keywords.length > 0 && (
                <span>• Palavras-chave: {question.keywords.join(', ')}</span>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="answer">Resposta Válida</Label>
            <Textarea
              id="answer"
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder="Digite a resposta que a IA deve usar para esta pergunta..."
              className="min-h-[200px] mt-2"
            />
            <p className="text-xs text-muted-foreground mt-2">
              Esta resposta será automaticamente copiada para a base de conhecimento e 
              a IA a usará sempre que encontrar esta pergunta novamente.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={!answer.trim() || saving}
          >
            {saving ? 'Salvando...' : 'Salvar Resposta Válida'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
