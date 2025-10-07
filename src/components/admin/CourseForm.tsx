import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from '@/hooks/use-toast';
import { Course } from '@/types/courses';
import { Loader2 } from 'lucide-react';

const courseSchema = z.object({
  title: z.string().min(3, 'O título deve ter no mínimo 3 caracteres'),
  description: z.string().optional(),
  thumbnail_url: z.string().url('URL inválida').optional().or(z.literal('')),
  instructor_name: z.string().optional(),
  duration_hours: z.coerce.number().min(0).optional(),
  level: z.enum(['beginner', 'intermediate', 'advanced']).optional(),
  price: z.coerce.number().min(0, 'O preço deve ser maior ou igual a zero'),
  is_published: z.boolean(),
  position: z.coerce.number().min(1).optional(),
});

type CourseFormData = z.infer<typeof courseSchema>;

interface CourseFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  course?: Course;
  onSuccess: () => void;
}

export function CourseForm({ open, onOpenChange, course, onSuccess }: CourseFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<CourseFormData>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      title: course?.title || '',
      description: course?.description || '',
      thumbnail_url: course?.thumbnail_url || '',
      instructor_name: course?.instructor_name || '',
      duration_hours: course?.duration_hours || 0,
      level: course?.level || undefined,
      price: course?.price ? Number(course.price) : 0,
      is_published: course?.is_published || false,
      position: course?.position || 1,
    },
  });

  const isPublished = watch('is_published');

  const saveMutation = useMutation({
    mutationFn: async (data: CourseFormData) => {
      const courseData = {
        title: data.title,
        description: data.description || null,
        thumbnail_url: data.thumbnail_url || null,
        instructor_name: data.instructor_name || null,
        duration_hours: data.duration_hours || null,
        level: data.level || null,
        price: data.price,
        is_published: data.is_published,
        position: data.position || 1,
      };

      if (course?.id) {
        const { error } = await supabase
          .from('courses')
          .update(courseData)
          .eq('id', course.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('courses')
          .insert([courseData]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast({
        title: course ? 'Curso atualizado' : 'Curso criado',
        description: course 
          ? 'O curso foi atualizado com sucesso.' 
          : 'O curso foi criado com sucesso.',
      });
      reset();
      onSuccess();
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao salvar curso',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  const onSubmit = async (data: CourseFormData) => {
    setIsSubmitting(true);
    await saveMutation.mutateAsync(data);
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {course ? 'Editar Curso' : 'Novo Curso'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Título */}
          <div className="space-y-2">
            <Label htmlFor="title">Título *</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="Ex: Desenvolvimento Web Completo"
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          {/* Descrição */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Descreva o conteúdo do curso..."
              rows={4}
            />
          </div>

          {/* Instrutor */}
          <div className="space-y-2">
            <Label htmlFor="instructor_name">Nome do Instrutor</Label>
            <Input
              id="instructor_name"
              {...register('instructor_name')}
              placeholder="Ex: João Silva"
            />
          </div>

          {/* URL da Thumbnail */}
          <div className="space-y-2">
            <Label htmlFor="thumbnail_url">URL da Imagem (Thumbnail)</Label>
            <Input
              id="thumbnail_url"
              {...register('thumbnail_url')}
              placeholder="https://exemplo.com/imagem.jpg"
            />
            {errors.thumbnail_url && (
              <p className="text-sm text-destructive">{errors.thumbnail_url.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Duração */}
            <div className="space-y-2">
              <Label htmlFor="duration_hours">Duração (horas)</Label>
              <Input
                id="duration_hours"
                type="number"
                step="0.5"
                {...register('duration_hours')}
                placeholder="Ex: 40"
              />
            </div>

            {/* Nível */}
            <div className="space-y-2">
              <Label htmlFor="level">Nível</Label>
              <Select
                onValueChange={(value) => setValue('level', value as any)}
                defaultValue={course?.level}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o nível" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="beginner">Iniciante</SelectItem>
                  <SelectItem value="intermediate">Intermediário</SelectItem>
                  <SelectItem value="advanced">Avançado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Preço */}
            <div className="space-y-2">
              <Label htmlFor="price">Preço (R$) *</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price')}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price.message}</p>
              )}
            </div>

            {/* Posição */}
            <div className="space-y-2">
              <Label htmlFor="position">Posição</Label>
              <Input
                id="position"
                type="number"
                {...register('position')}
                placeholder="1"
              />
            </div>
          </div>

          {/* Publicado */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="space-y-0.5">
              <Label htmlFor="is_published">Publicar Curso</Label>
              <p className="text-sm text-muted-foreground">
                {isPublished 
                  ? 'O curso estará visível para os alunos' 
                  : 'O curso ficará em modo rascunho'}
              </p>
            </div>
            <Switch
              id="is_published"
              checked={isPublished}
              onCheckedChange={(checked) => setValue('is_published', checked)}
            />
          </div>

          {/* Ações */}
          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {course ? 'Atualizar Curso' : 'Criar Curso'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
