import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  StageOneProductForm,
  type StageOneFormValues,
} from '@/components/supplier/products/StageOneProductForm';

const SupplierProductCreate = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getEffectiveUserId } = useAuth();
  const { data: orgData } = useSupplierOrganization();

  const mutation = useMutation({
    mutationFn: async (values: StageOneFormValues) => {
      const { data, error } = await supabase
        .from('products')
        .insert({
          name: values.name,
          description: values.description,
          price: values.price,
          weight: values.weight,
          height: values.height,
          width: values.width,
          length: values.length,
          main_image_url: values.photo_url,
          image_url: values.photo_url,
          supplier_id: getEffectiveUserId()!,
          stage: 'stage_1_basic',
          active: false,
          approval_status: 'draft',
        })
        .select('id')
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (product) => {
      if (orgData) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgData.organization.id) });
      toast({
        title: 'Produto criado (Estágio 1)',
        description: 'Agora busque um produto de referência para habilitá-lo na loja.',
      });
      navigate(`/supplier/produtos/${product.id}`);
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar produto', description: error.message, variant: 'destructive' });
    },
  });

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Novo Produto</h1>
        <p className="text-muted-foreground">
          Estágio 1: informe o essencial. O enriquecimento vem depois, com a busca de referências.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Cadastro básico</CardTitle>
          <CardDescription>
            Foto, título, descrição, dimensões e preço — o produto fica invisível na loja até ser
            enriquecido e habilitado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <StageOneProductForm
            onSubmit={(values) => mutation.mutate(values)}
            isSubmitting={mutation.isPending}
            submitLabel="Criar produto"
          />
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierProductCreate;
