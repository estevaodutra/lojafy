import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Plus, Edit, Trash2, Save, BookOpen, GraduationCap, X } from 'lucide-react';
import { useStandardAnswers, StandardAnswer } from '@/hooks/useStandardAnswers';
import { useAllCourses } from '@/hooks/useAllCourses';
import { useAllModules } from '@/hooks/useAllModules';
import { useAllLessons } from '@/hooks/useAllLessons';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AnswerImageUpload } from './AnswerImageUpload';

export default function StandardAnswersTab() {
  const { standardAnswers, loading, createStandardAnswer, updateStandardAnswer, deleteStandardAnswer } = useStandardAnswers();
  const { data: courses = [] } = useAllCourses();
  const { data: modules = [] } = useAllModules();
  const { data: lessons = [] } = useAllLessons();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    answer: '',
    button_text: '',
    button_link: '',
    keywords: '',
    active: true,
    selectedType: 'none' as 'none' | 'course' | 'module' | 'lesson',
    related_course_id: undefined as string | undefined,
    related_module_id: undefined as string | undefined,
    related_lesson_id: undefined as string | undefined,
    attachments: [] as any[],
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k);

    const answerData = {
      name: formData.name,
      answer: formData.answer,
      button_text: formData.button_text || undefined,
      button_link: formData.button_link || undefined,
      keywords: keywordsArray,
      active: formData.active,
      related_course_id: formData.selectedType === 'course' ? formData.related_course_id : undefined,
      related_module_id: formData.selectedType === 'module' ? formData.related_module_id : undefined,
      related_lesson_id: formData.selectedType === 'lesson' ? formData.related_lesson_id : undefined,
      attachments: formData.attachments,
    };

    try {
      if (editingId) {
        await updateStandardAnswer(editingId, answerData);
        setEditingId(null);
      } else {
        await createStandardAnswer(answerData);
      }

      // Reset form
      setFormData({
        name: '',
        answer: '',
        button_text: '',
        button_link: '',
        keywords: '',
        active: true,
        selectedType: 'none',
        related_course_id: undefined,
        related_module_id: undefined,
        related_lesson_id: undefined,
        attachments: [],
      });
    } catch (error) {
      // Error already handled in hook
    }
  };

  const handleEdit = (item: StandardAnswer) => {
    setEditingId(item.id);
    
    let selectedType: 'none' | 'course' | 'module' | 'lesson' = 'none';
    if (item.related_lesson_id) selectedType = 'lesson';
    else if (item.related_module_id) selectedType = 'module';
    else if (item.related_course_id) selectedType = 'course';

    setFormData({
      name: item.name,
      answer: item.answer,
      button_text: item.button_text || '',
      button_link: item.button_link || '',
      keywords: item.keywords.join(', '),
      active: item.active,
      selectedType,
      related_course_id: item.related_course_id,
      related_module_id: item.related_module_id,
      related_lesson_id: item.related_lesson_id,
      attachments: item.attachments || [],
    });
  };

  const handleDelete = async (id: string) => {
    await deleteStandardAnswer(id);
  };

  const handleCancel = () => {
    setEditingId(null);
    setFormData({
      name: '',
      answer: '',
      button_text: '',
      button_link: '',
      keywords: '',
      active: true,
      selectedType: 'none',
      related_course_id: undefined,
      related_module_id: undefined,
      related_lesson_id: undefined,
      attachments: [],
    });
  };

  const getRelatedContentLabel = (item: StandardAnswer) => {
    if (item.related_lesson_id) {
      const lesson = lessons.find(l => l.lesson_id === item.related_lesson_id);
      return lesson ? `Aula: ${lesson.lesson_title}` : 'Aula não encontrada';
    }
    if (item.related_module_id) {
      const module = modules.find(m => m.module_id === item.related_module_id);
      return module ? `Módulo: ${module.module_title}` : 'Módulo não encontrado';
    }
    if (item.related_course_id) {
      const course = courses.find(c => c.course_id === item.related_course_id);
      return course ? `Curso: ${course.course_title}` : 'Curso não encontrado';
    }
    return 'Nenhum';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {editingId ? 'Editar Resposta Padrão' : 'Nova Resposta Padrão'}
          </CardTitle>
          <CardDescription>
            Crie respostas reutilizáveis que podem ser aplicadas a múltiplas perguntas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Nome da Resposta Padrão *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Ex: Processar Pedidos"
                required
              />
            </div>

            <div>
              <Label htmlFor="answer">Resposta *</Label>
              <Textarea
                id="answer"
                value={formData.answer}
                onChange={(e) => setFormData({ ...formData, answer: e.target.value })}
                placeholder="Digite a resposta completa..."
                rows={6}
                required
              />
            </div>

            <div>
              <Label>📎 Anexar Imagens (opcional)</Label>
              <AnswerImageUpload
                attachments={formData.attachments}
                onUpload={(newAttachments) => setFormData({ ...formData, attachments: newAttachments })}
                maxFiles={5}
                maxSize={5 * 1024 * 1024}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="button_text">Texto do Botão (opcional)</Label>
                <Input
                  id="button_text"
                  value={formData.button_text}
                  onChange={(e) => setFormData({ ...formData, button_text: e.target.value })}
                  placeholder="Ex: Ver Aula Completa"
                />
              </div>
              <div>
                <Label htmlFor="button_link">Link do Botão (opcional)</Label>
                <Input
                  id="button_link"
                  value={formData.button_link}
                  onChange={(e) => setFormData({ ...formData, button_link: e.target.value })}
                  placeholder="Ex: /customer/academy/courses/123"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="related_content">Conteúdo Relacionado (opcional)</Label>
              <Select
                value={formData.selectedType}
                onValueChange={(value: any) => setFormData({
                  ...formData,
                  selectedType: value,
                  related_course_id: undefined,
                  related_module_id: undefined,
                  related_lesson_id: undefined,
                })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  <SelectItem value="course">Curso</SelectItem>
                  <SelectItem value="module">Módulo</SelectItem>
                  <SelectItem value="lesson">Aula</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {formData.selectedType === 'course' && (
              <Select
                value={formData.related_course_id}
                onValueChange={(value) => setFormData({ ...formData, related_course_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um curso" />
                </SelectTrigger>
                <SelectContent>
                  {courses.map(course => (
                    <SelectItem key={course.course_id} value={course.course_id}>
                      {course.course_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {formData.selectedType === 'module' && (
              <Select
                value={formData.related_module_id}
                onValueChange={(value) => setFormData({ ...formData, related_module_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione um módulo" />
                </SelectTrigger>
                <SelectContent>
                  {modules.map(module => (
                    <SelectItem key={module.module_id} value={module.module_id}>
                      {module.module_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            {formData.selectedType === 'lesson' && (
              <Select
                value={formData.related_lesson_id}
                onValueChange={(value) => setFormData({ ...formData, related_lesson_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione uma aula" />
                </SelectTrigger>
                <SelectContent>
                  {lessons.map(lesson => (
                    <SelectItem key={lesson.lesson_id} value={lesson.lesson_id}>
                      {lesson.lesson_title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}

            <div>
              <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
              <Input
                id="keywords"
                value={formData.keywords}
                onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                placeholder="processar, pedidos, etiqueta"
              />
            </div>

            <div className="flex items-center gap-2">
              <Switch
                id="active"
                checked={formData.active}
                onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
              />
              <Label htmlFor="active">Ativa</Label>
            </div>

            <div className="flex gap-2">
              <Button type="submit">
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Atualizar' : 'Criar'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={handleCancel}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Respostas Padrão ({standardAnswers.length})</CardTitle>
          <CardDescription>
            Gerencie suas respostas reutilizáveis
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Resposta</TableHead>
                <TableHead>Conteúdo Relacionado</TableHead>
                <TableHead>Anexos</TableHead>
                <TableHead>Usado</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {standardAnswers.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-medium">{item.name}</TableCell>
                  <TableCell className="max-w-xs truncate">{item.answer}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      <GraduationCap className="h-3 w-3 mr-1" />
                      {getRelatedContentLabel(item)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {item.attachments && item.attachments.length > 0 ? (
                      <Badge variant="secondary">
                        📎 {item.attachments.length}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary">{item.usage_count}x</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={item.active ? 'default' : 'secondary'}>
                      {item.active ? 'Ativa' : 'Inativa'}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleDelete(item.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
