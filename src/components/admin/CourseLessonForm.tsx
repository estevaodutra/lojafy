import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CourseLesson } from '@/types/courses';
import { SimpleImageUpload } from './SimpleImageUpload';

const lessonSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  thumbnail_url: z.string().optional(),
  lesson_description: z.string().optional(),
  content: z.string().optional(),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  duration_minutes: z.coerce.number().min(0).optional(),
  position: z.coerce.number().min(1).default(1),
  is_published: z.boolean().default(false),
});

type LessonFormData = z.infer<typeof lessonSchema>;

interface CourseLessonFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  moduleId: string;
  lesson?: CourseLesson | null;
  onSuccess?: () => void;
}

export function CourseLessonForm({
  open,
  onOpenChange,
  moduleId,
  lesson,
  onSuccess,
}: CourseLessonFormProps) {
  const form = useForm<LessonFormData>({
    resolver: zodResolver(lessonSchema),
    defaultValues: {
      title: '',
      description: '',
      thumbnail_url: '',
      lesson_description: '',
      content: '',
      video_url: '',
      duration_minutes: 0,
      position: 1,
      is_published: false,
    },
  });

  useEffect(() => {
    if (lesson) {
      form.reset({
        title: lesson.title,
        description: lesson.description || '',
        thumbnail_url: lesson.thumbnail_url || '',
        lesson_description: (lesson as any).lesson_description || '',
        content: lesson.content || '',
        video_url: lesson.video_url || '',
        duration_minutes: lesson.duration_minutes || 0,
        position: lesson.position,
        is_published: lesson.is_published,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        thumbnail_url: '',
        lesson_description: '',
        content: '',
        video_url: '',
        duration_minutes: 0,
        position: 1,
        is_published: false,
      });
    }
  }, [lesson, form]);

  const onSubmit = async (data: LessonFormData) => {
    try {
      const lessonData = {
        title: data.title,
        description: data.description || null,
        thumbnail_url: data.thumbnail_url || null,
        lesson_description: data.lesson_description || null,
        content: data.content || null,
        video_url: data.video_url || null,
        duration_minutes: data.duration_minutes || null,
        position: data.position,
        is_published: data.is_published,
        module_id: moduleId,
        attachments: [],
      };

      if (lesson?.id) {
        const { error } = await supabase
          .from('course_lessons')
          .update(lessonData)
          .eq('id', lesson.id);
        if (error) throw error;
        toast.success('Aula atualizada com sucesso');
      } else {
        const { error } = await supabase
          .from('course_lessons')
          .insert([lessonData]);
        if (error) throw error;
        toast.success('Aula criada com sucesso');
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar aula');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{lesson ? 'Editar Aula' : 'Nova Aula'}</DialogTitle>
          <DialogDescription>
            {lesson ? 'Edite as informações da aula' : 'Adicione uma nova aula ao módulo'}
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Título *</FormLabel>
                  <FormControl>
                    <Input placeholder="Ex: Configurando o Ambiente" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Resumo da aula..."
                      rows={2}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="thumbnail_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Imagem de Capa (Thumbnail)</FormLabel>
                  <FormControl>
                    <SimpleImageUpload
                      onImageUploaded={field.onChange}
                      currentImage={field.value}
                      accept="image/*"
                      maxSize={10 * 1024 * 1024}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Recomendado: 1280x720px (16:9). Imagem exibida no card da aula.
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="lesson_description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição para IA</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Descreva brevemente o que é ensinado nesta aula para ajudar a IA a recomendar corretamente..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <p className="text-xs text-muted-foreground">
                    Esta descrição ajuda a IA de suporte a recomendar esta aula aos usuários quando relevante
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="video_url"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Vídeo</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="YouTube, Google Drive ou arquivo direto..."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription className="text-xs space-y-1">
                    <div className="font-semibold">Formatos aceitos:</div>
                    <div>• YouTube: https://www.youtube.com/watch?v=VIDEO_ID</div>
                    <div>• Google Drive (URL): https://drive.google.com/file/d/FILE_ID/view</div>
                    <div>• Google Drive (iframe): Cole o iframe completo do Google Drive</div>
                    <div>• Vídeo direto: URL de arquivo MP4</div>
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="content"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Conteúdo Textual</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Conteúdo complementar da aula..."
                      rows={5}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="duration_minutes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duração (minutos)</FormLabel>
                    <FormControl>
                      <Input type="number" min={0} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="position"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Posição</FormLabel>
                    <FormControl>
                      <Input type="number" min={1} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Publicar aula</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Aulas publicadas ficam visíveis para os alunos
                    </p>
                  </div>
                  <FormControl>
                    <Switch checked={field.value} onCheckedChange={field.onChange} />
                  </FormControl>
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? 'Salvando...' : 'Salvar'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
