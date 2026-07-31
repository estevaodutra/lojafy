import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { skuPreview } from '@/lib/skuPreview';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';

const stageOneSchema = z.object({
  photo_url: z.string().url('Informe uma URL de imagem válida'),
  name: z.string().min(10, 'Título deve ter pelo menos 10 caracteres').max(150),
  description: z.string().min(20, 'Descrição deve ter pelo menos 20 caracteres'),
  price: z.coerce.number().positive('Preço deve ser maior que zero'),
  weight: z.coerce.number().positive('Peso deve ser maior que zero'),
  height: z.coerce.number().positive('Altura deve ser maior que zero'),
  width: z.coerce.number().positive('Largura deve ser maior que zero'),
  length: z.coerce.number().positive('Comprimento deve ser maior que zero'),
});

export type StageOneFormValues = z.infer<typeof stageOneSchema>;

interface StageOneProductFormProps {
  defaultValues?: Partial<StageOneFormValues>;
  onSubmit: (values: StageOneFormValues) => void;
  isSubmitting?: boolean;
  submitLabel?: string;
}

/**
 * Formulário do Estágio 1: os 8 campos essenciais.
 * Substitui, para o fornecedor, o formulário de admin de 1300+ linhas —
 * o enriquecimento vem depois, pela importação de referência do ML.
 */
export const StageOneProductForm = ({
  defaultValues,
  onSubmit,
  isSubmitting,
  submitLabel = 'Salvar produto',
}: StageOneProductFormProps) => {
  const { data: orgData } = useSupplierOrganization();

  const form = useForm<StageOneFormValues>({
    resolver: zodResolver(stageOneSchema),
    defaultValues: {
      photo_url: '',
      name: '',
      description: '',
      price: undefined as unknown as number,
      weight: undefined as unknown as number,
      height: undefined as unknown as number,
      width: undefined as unknown as number,
      length: undefined as unknown as number,
      ...defaultValues,
    },
  });

  const photoUrl = form.watch('photo_url');

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="photo_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Foto principal (URL)</FormLabel>
              <FormControl>
                <Input placeholder="https://..." {...field} />
              </FormControl>
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Prévia"
                  className="mt-2 h-32 w-32 rounded-md border object-cover"
                  onError={(e) => ((e.target as HTMLImageElement).style.display = 'none')}
                />
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Título</FormLabel>
              <FormControl>
                <Input placeholder="Nome completo do produto" {...field} />
              </FormControl>
              <FormDescription>
                SKU interno gerado automaticamente: {skuPreview(orgData?.organization.org_code)}
              </FormDescription>
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
                <Textarea rows={5} {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <FormField
            control={form.control}
            name="price"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Preço (R$)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.01" min="0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="weight"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Peso (kg)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.001" min="0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Altura (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Largura (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="length"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Comprimento (cm)</FormLabel>
                <FormControl>
                  <Input type="number" step="0.1" min="0" {...field} value={field.value ?? ''} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {submitLabel}
        </Button>
      </form>
    </Form>
  );
};
