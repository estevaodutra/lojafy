import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Card, CardContent } from '@/components/ui/card';
import { Loader2, Sparkles, Check, Edit3, RefreshCw, X, BookOpen } from 'lucide-react';
import { PendingQuestion } from '@/hooks/usePendingQuestions';
import { useAllLessons } from '@/hooks/useAllLessons';
import { useAllCourses } from '@/hooks/useAllCourses';
import { useAllModules } from '@/hooks/useAllModules';
import { useSuggestAnswer, SuggestionResponse } from '@/hooks/useSuggestAnswer';
import { useStandardAnswers } from '@/hooks/useStandardAnswers';

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
    },
    standardAnswerId?: string
  ) => Promise<void>;
}

export default function AnswerQuestionModal({
  question,
  open,
  onClose,
  onSave
}: AnswerQuestionModalProps) {
  const [answerType, setAnswerType] = useState<'new' | 'standard'>('new');
  const [selectedStandardAnswerId, setSelectedStandardAnswerId] = useState<string | undefined>();
  const [answer, setAnswer] = useState('');
  const [selectedType, setSelectedType] = useState<'none' | 'course' | 'module' | 'lesson'>('none');
  const [selectedCourseId, setSelectedCourseId] = useState<string | undefined>(undefined);
  const [selectedModuleId, setSelectedModuleId] = useState<string | undefined>(undefined);
  const [selectedLessonId, setSelectedLessonId] = useState<string | undefined>(undefined);
  const [saving, setSaving] = useState(false);
  const [suggestion, setSuggestion] = useState<SuggestionResponse | null>(null);
  const [showSuggestion, setShowSuggestion] = useState(true);
  const [buttonEnabled, setButtonEnabled] = useState(false);
  const [buttonText, setButtonText] = useState('');
  const [buttonLink, setButtonLink] = useState('');
  
  const { data: courses, isLoading: loadingCourses } = useAllCourses();
  const { data: modules, isLoading: loadingModules } = useAllModules();
  const { data: lessons, isLoading: loadingLessons } = useAllLessons();
  const { getSuggestion, loading: loadingSuggestion, error: suggestionError } = useSuggestAnswer();
  const { standardAnswers } = useStandardAnswers();

  useEffect(() => {
    if (question) {
      // Extract button info if exists
      const buttonMatch = question.answer?.match(/\[BUTTON:(.*?):(.*?)\]/);
      if (buttonMatch) {
        const existingAnswer = question.answer.replace(/\[BUTTON:.*?\]/, '').trim();
        setAnswer(existingAnswer);
        setButtonEnabled(true);
        setButtonText(buttonMatch[1]);
        setButtonLink(buttonMatch[2]);
      } else {
        setAnswer(question.answer || '');
        setButtonEnabled(false);
        setButtonText('');
        setButtonLink('');
      }

      // ✅ CORREÇÃO: Carregar conteúdo relacionado existente
      if (question.related_lesson_id) {
        setSelectedType('lesson');
        setSelectedLessonId(question.related_lesson_id);
        setSelectedCourseId(undefined);
        setSelectedModuleId(undefined);
      } else if (question.related_module_id) {
        setSelectedType('module');
        setSelectedModuleId(question.related_module_id);
        setSelectedCourseId(undefined);
        setSelectedLessonId(undefined);
      } else if (question.related_course_id) {
        setSelectedType('course');
        setSelectedCourseId(question.related_course_id);
        setSelectedModuleId(undefined);
        setSelectedLessonId(undefined);
      } else {
        setSelectedType('none');
        setSelectedCourseId(undefined);
        setSelectedModuleId(undefined);
        setSelectedLessonId(undefined);
      }
      
      setSuggestion(null);
      setShowSuggestion(true);
      setAnswerType('new');
      setSelectedStandardAnswerId(undefined);
    } else {
      setAnswer('');
      setButtonText('');
      setButtonLink('');
      setButtonEnabled(false);
      setSelectedType('none');
      setSelectedCourseId(undefined);
      setSelectedModuleId(undefined);
      setSelectedLessonId(undefined);
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
    if (!question) return;
    if (answerType === 'standard' && !selectedStandardAnswerId) return;
    if (answerType === 'new' && !answer.trim()) return;
    
    setSaving(true);
    try {
      let finalAnswer = answer.trim();
      let standardAnswerId: string | undefined = undefined;
      
      if (answerType === 'standard' && selectedStandardAnswerId) {
        standardAnswerId = selectedStandardAnswerId;
        const standardAnswer = standardAnswers.find(a => a.id === selectedStandardAnswerId);
        if (standardAnswer) {
          finalAnswer = standardAnswer.answer;
          if (standardAnswer.button_text && standardAnswer.button_link) {
            finalAnswer += `\n\n[BUTTON:${standardAnswer.button_text}:${standardAnswer.button_link}]`;
          }
        }
      } else if (answerType === 'new') {
        if (buttonEnabled && buttonText.trim() && buttonLink.trim()) {
          finalAnswer += `\n\n[BUTTON:${buttonText.trim()}:${buttonLink.trim()}]`;
        }
      }
      
      let relatedContent = undefined;
      
      if (selectedType === 'course' && selectedCourseId) {
        relatedContent = { type: 'course' as const, id: selectedCourseId };
      } else if (selectedType === 'module' && selectedModuleId) {
        relatedContent = { type: 'module' as const, id: selectedModuleId };
      } else if (selectedType === 'lesson' && selectedLessonId) {
        relatedContent = { type: 'lesson' as const, id: selectedLessonId };
      }
      
      await onSave(question.id, finalAnswer, relatedContent, standardAnswerId);
      onClose();
      
      // Reset form
      setAnswer('');
      setSelectedType('none');
      setSelectedCourseId(undefined);
      setSelectedModuleId(undefined);
      setSelectedLessonId(undefined);
      setButtonEnabled(false);
      setButtonText('');
      setButtonLink('');
      setAnswerType('new');
      setSelectedStandardAnswerId(undefined);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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

          {/* Answer Type Selection */}
          <div className="space-y-2">
            <Label>Tipo de Resposta</Label>
            <RadioGroup value={answerType} onValueChange={(value: 'new' | 'standard') => {
              setAnswerType(value);
              if (value === 'standard') {
                setSuggestion(null);
                setShowSuggestion(false);
              } else {
                setShowSuggestion(true);
              }
            }}>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="new" id="new" />
                <Label htmlFor="new" className="cursor-pointer">Criar Nova Resposta</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="standard" id="standard" />
                <Label htmlFor="standard" className="cursor-pointer">Usar Resposta Padrão Existente</Label>
              </div>
            </RadioGroup>
          </div>

          {/* Standard Answer Selection */}
          {answerType === 'standard' && (
            <div className="space-y-3">
              <Label htmlFor="standard-answer">Selecione uma Resposta Padrão</Label>
              <Select
                value={selectedStandardAnswerId}
                onValueChange={(value) => {
                  setSelectedStandardAnswerId(value);
                  const standardAnswer = standardAnswers.find(a => a.id === value);
                  if (standardAnswer) {
                    // Load related content from standard answer
                    if (standardAnswer.related_lesson_id) {
                      setSelectedType('lesson');
                      setSelectedLessonId(standardAnswer.related_lesson_id);
                      setSelectedCourseId(undefined);
                      setSelectedModuleId(undefined);
                    } else if (standardAnswer.related_module_id) {
                      setSelectedType('module');
                      setSelectedModuleId(standardAnswer.related_module_id);
                      setSelectedCourseId(undefined);
                      setSelectedLessonId(undefined);
                    } else if (standardAnswer.related_course_id) {
                      setSelectedType('course');
                      setSelectedCourseId(standardAnswer.related_course_id);
                      setSelectedModuleId(undefined);
                      setSelectedLessonId(undefined);
                    } else {
                      setSelectedType('none');
                      setSelectedCourseId(undefined);
                      setSelectedModuleId(undefined);
                      setSelectedLessonId(undefined);
                    }
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Buscar resposta padrão..." />
                </SelectTrigger>
                <SelectContent>
                  {standardAnswers.filter(a => a.active).map((stdAnswer) => (
                    <SelectItem key={stdAnswer.id} value={stdAnswer.id}>
                      <div className="flex items-center gap-2">
                        <BookOpen className="h-4 w-4" />
                        <span>{stdAnswer.name}</span>
                        <Badge variant="secondary" className="text-xs ml-2">
                          {stdAnswer.usage_count}x
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {selectedStandardAnswerId && (() => {
                const selected = standardAnswers.find(a => a.id === selectedStandardAnswerId);
                if (!selected) return null;
                
                return (
                  <Card className="bg-muted/50">
                    <CardContent className="pt-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="font-medium flex items-center gap-2">
                          <BookOpen className="h-4 w-4" />
                          Preview: {selected.name}
                        </h4>
                        <Badge variant="secondary">{selected.usage_count}x usado</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {selected.answer}
                      </p>
                      {selected.button_text && (
                        <div className="text-sm">
                          <strong>Botão:</strong> "{selected.button_text}" → {selected.button_link}
                        </div>
                      )}
                      {(selected.related_course_id || selected.related_module_id || selected.related_lesson_id) && (
                        <div className="text-sm">
                          <strong>Conteúdo:</strong>{' '}
                          {selected.related_lesson_id && lessons?.find(l => l.lesson_id === selected.related_lesson_id)?.lesson_title}
                          {selected.related_module_id && modules?.find(m => m.module_id === selected.related_module_id)?.module_title}
                          {selected.related_course_id && courses?.find(c => c.course_id === selected.related_course_id)?.course_title}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          )}

          {/* AI Suggestion Section (only for new answers) */}
          {answerType === 'new' && !suggestion && (
            <Button
              type="button"
              variant="outline"
              onClick={loadSuggestion}
              disabled={loadingSuggestion}
              className="w-full gap-2"
            >
              {loadingSuggestion ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Gerando sugestão com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  🤖 Gerar Sugestão com IA
                </>
              )}
            </Button>
          )}

          {answerType === 'new' && showSuggestion && suggestion && (
            <div className="space-y-3">
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

                <div className="bg-white dark:bg-gray-900 rounded-md p-3 text-sm text-foreground whitespace-pre-wrap">
                  {suggestion.suggestedAnswer}
                </div>

                <div className="flex flex-wrap gap-2">
                  <Button type="button" size="sm" onClick={useSuggestion} className="gap-1">
                    <Check className="h-3 w-3" />
                    Usar Esta Sugestão
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={editSuggestion} className="gap-1">
                    <Edit3 className="h-3 w-3" />
                    Editar e Usar
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={generateNewSuggestion} className="gap-1">
                    <RefreshCw className="h-3 w-3" />
                    Gerar Nova
                  </Button>
                  <Button type="button" variant="ghost" size="sm" onClick={writeFromScratch} className="gap-1 text-muted-foreground">
                    <X className="h-3 w-3" />
                    Escrever do Zero
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* Answer Input Section (only for new answers) */}
          {answerType === 'new' && (
            <div>
              <Label htmlFor="answer">Sua Resposta Final *</Label>
              <Textarea
                id="answer"
                value={answer}
                onChange={(e) => setAnswer(e.target.value)}
                placeholder="Digite a resposta que a IA deve usar para esta pergunta..."
                className="min-h-[200px] mt-2"
              />
            </div>
          )}

          {/* Button Builder (only for new answers) */}
          {answerType === 'new' && (
            <div className="space-y-3 border rounded-lg p-4 bg-muted/30">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="button-enabled"
                  checked={buttonEnabled}
                  onChange={(e) => setButtonEnabled(e.target.checked)}
                  className="h-4 w-4 rounded border-gray-300"
                />
                <Label htmlFor="button-enabled" className="cursor-pointer font-medium">
                  ➕ Adicionar botão na resposta
                </Label>
              </div>

              {buttonEnabled && (
                <div className="space-y-3 pl-6">
                  <div>
                    <Label htmlFor="button-text">🔘 Texto do Botão</Label>
                    <Input
                      id="button-text"
                      value={buttonText}
                      onChange={(e) => setButtonText(e.target.value)}
                      placeholder="Ver Produto, Acessar Curso, etc..."
                      className="mt-2"
                    />
                  </div>

                  <div>
                    <Label htmlFor="button-link">🔗 Link do Botão</Label>
                    <Input
                      id="button-link"
                      value={buttonLink}
                      onChange={(e) => setButtonLink(e.target.value)}
                      placeholder="/produto/123, https://exemplo.com, etc..."
                      className="mt-2"
                    />
                  </div>

                  {buttonText.trim() && buttonLink.trim() && (
                    <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-md border">
                      <p className="text-xs text-muted-foreground mb-2">📱 Preview:</p>
                      <div className="space-y-2">
                        <p className="text-sm">{answer || 'Sua resposta aparecerá aqui...'}</p>
                        <Button size="sm" className="w-full">
                          {buttonText}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Related Content */}
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
                      {module.module_title}
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
                  {lessons?.map(lesson => (
                    <SelectItem key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.lesson_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving || (answerType === 'new' && !answer.trim()) || (answerType === 'standard' && !selectedStandardAnswerId)}
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Salvar Resposta'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
