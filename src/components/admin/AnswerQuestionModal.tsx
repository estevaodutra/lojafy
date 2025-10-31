import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Sparkles, Check, Edit3, RefreshCw, X } from 'lucide-react';
import { PendingQuestion } from '@/hooks/usePendingQuestions';
import { useAllLessons } from '@/hooks/useAllLessons';
import { useAllCourses } from '@/hooks/useAllCourses';
import { useAllModules } from '@/hooks/useAllModules';
import { useSuggestAnswer, SuggestionResponse } from '@/hooks/useSuggestAnswer';

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
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: modules, isLoading: loadingModules } = useAllModules();
  const { data: lessons, isLoading: loadingLessons } = useAllLessons();
  const { getSuggestion, loading: loadingSuggestion, error: suggestionError } = useSuggestAnswer();

  useEffect(() => {
    if (question) {
      setAnswer(question.answer || '');
      setSelectedType('none');
      setSelectedCourseId(undefined);
      setSelectedModuleId(undefined);
      setSelectedLessonId(undefined);
      setSuggestion(null);
      setShowSuggestion(true);
      
      // Carregar sugestão automaticamente
      loadSuggestion();
    }
  }, [question]);

  const loadSuggestion = async () => {
    if (!question) return;
    
    const result = await getSuggestion(question.question, question.keywords);
    if (result) {
      setSuggestion(result);
      
      // Pré-selecionar conteúdo relacionado se a IA sugerir
      if (result.relatedContent) {
        setSelectedType(result.relatedContent.type);
        if (result.relatedContent.type === 'course') {
          setSelectedCourseId(result.relatedContent.id);
        } else if (result.relatedContent.type === 'module') {
          setSelectedModuleId(result.relatedContent.id);
        } else if (result.relatedContent.type === 'lesson') {
          setSelectedLessonId(result.relatedContent.id);
        }
      }
    } else if (suggestionError) {
      // Mostrar mensagem mais amigável quando houver erro
      setShowSuggestion(false);
    }
  };

  const useSuggestion = () => {
    if (suggestion?.suggestedAnswer) {
      setAnswer(suggestion.suggestedAnswer);
      setShowSuggestion(false);
    }
  };

  const editSuggestion = () => {
    if (suggestion?.suggestedAnswer) {
      setAnswer(suggestion.suggestedAnswer);
      setShowSuggestion(false);
    }
  };

  const generateNewSuggestion = async () => {
    setSuggestion(null);
    await loadSuggestion();
  };

  const writeFromScratch = () => {
    setSuggestion(null);
    setShowSuggestion(false);
    setAnswer('');
  };

  const getConfidenceBadge = (confidence: string) => {
    const configs = {
      high: { label: '⭐⭐⭐ Alta Confiança', className: 'bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-200' },
      medium: { label: '⭐⭐ Confiança Média', className: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-950 dark:text-yellow-200' },
      low: { label: '⭐ Baixa Confiança', className: 'bg-gray-100 text-gray-800 dark:bg-gray-950 dark:text-gray-200' },
    };
    return configs[confidence as keyof typeof configs] || configs.low;
  };

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

          {/* Sugestão da IA */}
          {showSuggestion && (
            <div className="space-y-3">
              {loadingSuggestion && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4">
                  <div className="flex items-center gap-2 text-sm text-blue-700 dark:text-blue-300">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span className="font-medium">🤖 Gerando sugestão com IA...</span>
                  </div>
                  <div className="mt-2 text-xs text-blue-600 dark:text-blue-400">
                    Analisando pergunta e buscando conteúdo relevante...
                  </div>
                </div>
              )}

              {suggestionError && (
                <div className="rounded-lg border border-yellow-200 dark:border-yellow-800 bg-yellow-50 dark:bg-yellow-950/20 p-4">
                  <div className="text-sm font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                    ⚠️ Função de IA temporariamente indisponível
                  </div>
                  <div className="text-xs text-yellow-700 dark:text-yellow-300 mb-3">
                    A sugestão automática não está disponível no momento. Você pode escrever a resposta manualmente abaixo ou tentar novamente.
                  </div>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={generateNewSuggestion}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Tentar Novamente
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={writeFromScratch}
                      className="gap-1"
                    >
                      Escrever Manualmente
                    </Button>
                  </div>
                </div>
              )}

              {suggestion && !loadingSuggestion && (
                <div className="rounded-lg border border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/20 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                      <span className="text-sm font-medium text-blue-900 dark:text-blue-100">
                        💡 Resposta Sugerida pela IA
                      </span>
                    </div>
                    <Badge className={getConfidenceBadge(suggestion.confidence).className}>
                      {getConfidenceBadge(suggestion.confidence).label}
                    </Badge>
                  </div>

                  {suggestion.confidence === 'medium' && (
                    <div className="text-xs text-yellow-700 dark:text-yellow-300 bg-yellow-100/50 dark:bg-yellow-950/30 rounded p-2">
                      ⚠️ Revise a resposta antes de usar
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-900 rounded-md p-3 text-sm text-foreground whitespace-pre-wrap">
                    {suggestion.suggestedAnswer}
                  </div>

                  {suggestion.relatedContent && (
                    <div className="text-xs text-blue-700 dark:text-blue-300 bg-blue-100/50 dark:bg-blue-950/50 rounded p-2">
                      📚 Conteúdo sugerido: {suggestion.relatedContent.type === 'course' ? 'Curso' : suggestion.relatedContent.type === 'module' ? 'Módulo' : 'Aula'} "{suggestion.relatedContent.title}"
                    </div>
                  )}

                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={useSuggestion}
                      className="gap-1"
                    >
                      <Check className="h-3 w-3" />
                      Usar Esta Sugestão
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={editSuggestion}
                      className="gap-1"
                    >
                      <Edit3 className="h-3 w-3" />
                      Editar e Usar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={generateNewSuggestion}
                      className="gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Gerar Nova
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={writeFromScratch}
                      className="gap-1 text-muted-foreground"
                    >
                      <X className="h-3 w-3" />
                      Escrever do Zero
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div>
            <Label htmlFor="answer">
              Sua Resposta Final *
              {suggestion && !showSuggestion && (
                <Badge variant="outline" className="ml-2 text-xs">
                  ✅ Usando sugestão da IA (editável)
                </Badge>
              )}
            </Label>
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
