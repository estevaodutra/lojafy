import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PendingQuestion } from '@/hooks/usePendingQuestions';
import { useAllLessons } from '@/hooks/useAllLessons';
import { useAllCourses } from '@/hooks/useAllCourses';
import { useAllModules } from '@/hooks/useAllModules';

interface AnswerQuestionModalProps {
  question: PendingQuestion | null;
  open: boolean;
  onClose: () => void;
  onSave: (
    id: string, 
    answer: string, 
    relatedContent?: {
      type: 'course' | 'module' | 'lesson';
      id: string;
    }
  ) => Promise<void>;
}

export default function AnswerQuestionModal({
  question,
  open,
  onClose,
  onSave
}: AnswerQuestionModalProps) {
  const [answer, setAnswer] = useState(question?.answer || '');
  const [selectedType, setSelectedType] = useState<'none' | 'course' | 'module' | 'lesson'>('none');
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>(undefined);
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: modules, isLoading: loadingModules } = useAllModules();
  const { data: lessons, isLoading: loadingLessons } = useAllLessons();

  useEffect(() => {
    if (question) {
      setAnswer(question.answer || '');
      setSelectedType('none');
      setSelectedCourseId(undefined);
      setSelectedModuleId(undefined);
      setSelectedLessonId(undefined);
    }
  }, [question]);

  const handleSave = async () => {
    if (!question || !answer.trim()) return;
    
    setSaving(true);
    try {
      let relatedContent = undefined;
      
      if (selectedType === 'course' && selectedCourseId) {
        relatedContent = { type: 'course' as const, id: selectedCourseId };
      } else if (selectedType === 'module' && selectedModuleId) {
        relatedContent = { type: 'module' as const, id: selectedModuleId };
      } else if (selectedType === 'lesson' && selectedLessonId) {
        relatedContent = { type: 'lesson' as const, id: selectedLessonId };
      }
      
      await onSave(question.id, answer, relatedContent);
      onClose();
      setAnswer('');
      setSelectedType('none');
      setSelectedCourseId(undefined);
      setSelectedModuleId(undefined);
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
            <Label htmlFor="content-type">Conteúdo Relacionado (Opcional)</Label>
            
            <Select 
              value={selectedType} 
              onValueChange={(value: any) => {
                setSelectedType(value);
                setSelectedCourseId(undefined);
                setSelectedModuleId(undefined);
                setSelectedLessonId(undefined);
              }}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Nenhum conteúdo selecionado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum conteúdo</SelectItem>
                <SelectItem value="course">📚 Curso Completo</SelectItem>
                <SelectItem value="module">📖 Módulo Específico</SelectItem>
                <SelectItem value="lesson">🎓 Aula Específica</SelectItem>
              </SelectContent>
            </Select>

            {selectedType === 'course' && (
              <Select 
                value={selectedCourseId} 
                onValueChange={setSelectedCourseId} 
                disabled={loadingCourses}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses?.map(course => (
                    <SelectItem key={course.course_id} value={course.course_id}>
                      {course.course_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedType === 'module' && (
              <Select 
                value={selectedModuleId} 
                onValueChange={setSelectedModuleId} 
                disabled={loadingModules}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules?.map(module => (
                    <SelectItem key={module.module_id} value={module.module_id}>
                      {module.course_title} › {module.module_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {selectedType === 'lesson' && (
              <Select 
                value={selectedLessonId} 
                onValueChange={setSelectedLessonId}
                disabled={loadingLessons}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Selecione uma aula" />
                </SelectTrigger>
                <SelectContent>
                  {lessons?.map((lesson) => (
                    <SelectItem key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.course_title} › {lesson.module_title} › {lesson.lesson_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <p className="text-xs text-muted-foreground mt-2">
              {selectedType === 'course' && 'A IA enviará um botão para acessar o curso completo'}
              {selectedType === 'module' && 'A IA enviará um botão para acessar o módulo'}
              {selectedType === 'lesson' && 'A IA enviará um botão para acessar esta aula'}
              {selectedType === 'none' && 'Nenhum botão será enviado'}
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
