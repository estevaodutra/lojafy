import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
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
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Feature } from '@/hooks/useFeatures';

const formSchema = z.object({
  slug: z.string().min(1, 'Slug é obrigatório').regex(/^[a-z_]+$/, 'Apenas letras minúsculas e underscores'),
  nome: z.string().min(1, 'Nome é obrigatório'),
  descricao: z.string().optional(),
  icone: z.string().default('Sparkles'),
  categoria: z.string().min(1, 'Categoria é obrigatória'),
  ordem_exibicao: z.number().default(0),
  preco_mensal: z.number().nullable().optional(),
  preco_anual: z.number().nullable().optional(),
  preco_vitalicio: z.number().nullable().optional(),
  trial_dias: z.number().default(0),
  ativo: z.boolean().default(true),
  visivel_catalogo: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface FeatureFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature?: Feature | null;
  onSave: (data: Partial<Feature>) => void;
}

const categorias = [
  { value: 'loja', label: 'Loja' },
  { value: 'recursos', label: 'Recursos' },
  { value: 'acessos', label: 'Acessos' },
  { value: 'geral', label: 'Geral' },
];

const icones = [
  { value: 'Store', label: 'Loja' },
  { value: 'Trophy', label: 'Troféu' },
  { value: 'Globe', label: 'Globo' },
  { value: 'BarChart2', label: 'Gráfico' },
  { value: 'TrendingUp', label: 'Tendência' },
  { value: 'ShoppingCart', label: 'Carrinho' },
  { value: 'Award', label: 'Prêmio' },
  { value: 'Sparkles', label: 'Estrelas' },
];

export const FeatureFormModal: React.FC<FeatureFormModalProps> = ({
  isOpen,
  onClose,
  feature,
  onSave,
}) => {
  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      slug: '',
      nome: '',
      descricao: '',
      icone: 'Sparkles',
      categoria: 'geral',
      ordem_exibicao: 0,
      preco_mensal: null,
      preco_anual: null,
      preco_vitalicio: null,
      trial_dias: 0,
      ativo: true,
      visivel_catalogo: false,
    },
  });

  useEffect(() => {
    if (feature) {
      form.reset({
        slug: feature.slug,
        nome: feature.nome,
        descricao: feature.descricao || '',
        icone: feature.icone,
        categoria: feature.categoria,
        ordem_exibicao: feature.ordem_exibicao,
        preco_mensal: feature.preco_mensal,
        preco_anual: feature.preco_anual,
        preco_vitalicio: feature.preco_vitalicio,
        trial_dias: feature.trial_dias,
        ativo: feature.ativo,
        visivel_catalogo: feature.visivel_catalogo,
      });
    } else {
      form.reset({
        slug: '',
        nome: '',
        descricao: '',
        icone: 'Sparkles',
        categoria: 'geral',
        ordem_exibicao: 0,
        preco_mensal: null,
        preco_anual: null,
        preco_vitalicio: null,
        trial_dias: 0,
        ativo: true,
        visivel_catalogo: false,
      });
    }
  }, [feature, form]);

  const onSubmit = (data: FormData) => {
    onSave({
      ...data,
      id: feature?.id,
    });
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {feature ? 'Editar Feature' : 'Nova Feature'}
          </DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="slug"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Slug</FormLabel>
                    <FormControl>
                      <Input
                        {...field}
                        placeholder="minha_feature"
                        disabled={!!feature}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="nome"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome</FormLabel>
                    <FormControl>
                      <Input {...field} placeholder="Minha Feature" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="descricao"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Descrição</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder="Descrição da feature..."
                      rows={2}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="categoria"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Categoria</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {categorias.map((cat) => (
                          <SelectItem key={cat.value} value={cat.value}>
                            {cat.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="icone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ícone</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {icones.map((icon) => (
                          <SelectItem key={icon.value} value={icon.value}>
                            {icon.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="preco_mensal"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Mensal</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_anual"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Anual</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="preco_vitalicio"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Preço Vitalício</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        {...field}
                        value={field.value ?? ''}
                        onChange={(e) =>
                          field.onChange(
                            e.target.value ? parseFloat(e.target.value) : null
                          )
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="trial_dias"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Dias de Trial</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="ordem_exibicao"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ordem de Exibição</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        {...field}
                        onChange={(e) => field.onChange(parseInt(e.target.value) || 0)}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex gap-6">
              <FormField
                control={form.control}
                name="ativo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Ativo</FormLabel>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="visivel_catalogo"
                render={({ field }) => (
                  <FormItem className="flex items-center gap-2">
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                    <FormLabel className="!mt-0">Visível no Catálogo</FormLabel>
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-4">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit">Salvar</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
};
