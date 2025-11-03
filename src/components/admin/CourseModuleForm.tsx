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
import { CourseModule } from '@/types/courses';
import { SimpleImageUpload } from './SimpleImageUpload';

const moduleSchema = z.object({
  title: z.string().min(1, 'Título é obrigatório'),
  description: z.string().optional(),
  thumbnail_url: z.string().optional(),
  position: z.coerce.number().min(1).default(1),
  is_published: z.boolean().default(false),
});

type ModuleFormData = z.infer<typeof moduleSchema>;

interface CourseModuleFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  courseId: string;
  module?: CourseModule | null;
  onSuccess?: () => void;
}

export function CourseModuleForm({
  open,
  onOpenChange,
  courseId,
  module,
  onSuccess,
}: CourseModuleFormProps) {
  const form = useForm<ModuleFormData>({
    resolver: zodResolver(moduleSchema),
    defaultValues: {
      title: '',
      description: '',
      thumbnail_url: '',
      position: 1,
      is_published: false,
    },
  });

  useEffect(() => {
    if (module) {
      form.reset({
        title: module.title,
        description: module.description || '',
        thumbnail_url: module.thumbnail_url || '',
        position: module.position,
        is_published: module.is_published,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        thumbnail_url: '',
        position: 1,
        is_published: false,
      });
    }
  }, [module, form]);

  const onSubmit = async (data: ModuleFormData) => {
    try {
      const moduleData = {
        title: data.title,
        description: data.description || null,
        thumbnail_url: data.thumbnail_url || null,
        position: data.position,
        is_published: data.is_published,
        course_id: courseId,
      };

      if (module?.id) {
        const { error } = await supabase
          .from('course_modules')
          .update(moduleData)
          .eq('id', module.id);
        if (error) throw error;
        toast.success('Módulo atualizado com sucesso');
      } else {
        const { error } = await supabase
          .from('course_modules')
          .insert([moduleData]);
        if (error) throw error;
        toast.success('Módulo criado com sucesso');
      }

      onSuccess?.();
      onOpenChange(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || 'Erro ao salvar módulo');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{module ? 'Editar Módulo' : 'Novo Módulo'}</DialogTitle>
          <DialogDescription>
            {module ? 'Edite as informações do módulo' : 'Adicione um novo módulo ao curso'}
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
                    <Input placeholder="Ex: Introdução ao Curso" {...field} />
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
                      placeholder="Descreva o conteúdo deste módulo..."
                      rows={3}
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
                    Recomendado: 1280x720px (16:9). Imagem exibida no card do módulo.
                  </p>
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

            <FormField
              control={form.control}
              name="is_published"
              render={({ field }) => (
                <FormItem className="flex items-center justify-between rounded-lg border p-4">
                  <div className="space-y-0.5">
                    <FormLabel className="text-base">Publicar módulo</FormLabel>
                    <p className="text-sm text-muted-foreground">
                      Módulos publicados ficam visíveis para os alunos
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
