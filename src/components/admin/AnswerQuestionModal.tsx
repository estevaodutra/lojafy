import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PendingQuestion } from '@/hooks/usePendingQuestions';
import { useAllLessons } from '@/hooks/useAllLessons';

interface AnswerQuestionModalProps {
  question: PendingQuestion | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, answer: string, lessonId?: string) => Promise<void>;
}

export default function AnswerQuestionModal({
  question,
  open,
  onClose,
  onSave
}: AnswerQuestionModalProps) {
  const [answer, setAnswer] = useState(question?.answer || '');
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const { data: lessons, isLoading: loadingLessons } = useAllLessons();

  useEffect(() => {
    if (question) {
      setAnswer(question.answer || '');
      setSelectedLessonId(undefined);
    }
  }, [question]);

  const handleSave = async () => {
    if (!question || !answer.trim()) return;
    
    setSaving(true);
    try {
      await onSave(question.id, answer, selectedLessonId);
      onClose();
      setAnswer('');
      setSelectedLessonId(undefined);
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

          <div>
            <Label htmlFor="lesson">Aula Relacionada (Opcional)</Label>
            <Select 
              value={selectedLessonId} 
              onValueChange={(value) => setSelectedLessonId(value === 'none' ? undefined : value)}
              disabled={loadingLessons}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Nenhuma aula selecionada" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma aula</SelectItem>
                {lessons?.map(lesson => (
                  <SelectItem key={lesson.lesson_id} value={lesson.lesson_id}>
                    {lesson.course_title} › {lesson.module_title} › {lesson.lesson_title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground mt-2">
              Se selecionada, a IA enviará um botão para o usuário acessar esta aula
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
