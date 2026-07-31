import { useEffect, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Loader2 } from 'lucide-react';

interface CompanyForm {
  trade_name: string;
  legal_name: string;
  document: string;
  email: string;
  phone: string;
}

const SupplierCompanySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData, isLoading } = useSupplierOrganization();
  const org = orgData?.organization;

  const [form, setForm] = useState<CompanyForm>({
    trade_name: '', legal_name: '', document: '', email: '', phone: '',
  });

  useEffect(() => {
    if (org) {
      setForm({
        trade_name: org.trade_name ?? '',
        legal_name: org.legal_name ?? '',
        document: org.document ?? '',
        email: org.email ?? '',
        phone: org.phone ?? '',
      });
    }
  }, [org]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error('Organização não carregada');
      const { error } = await supabase
        .from('supplier_organizations')
        .update({
          trade_name: form.trade_name || null,
          legal_name: form.legal_name || null,
          document: form.document || null,
          email: form.email || null,
          phone: form.phone || null,
        })
        .eq('id', org.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast({ title: 'Dados da empresa atualizados' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) {
    return <Skeleton className="h-64 w-full max-w-2xl" />;
  }

  if (!org) {
    return (
      <p className="text-muted-foreground">
        Nenhuma organização encontrada para este usuário. Contate o suporte.
      </p>
    );
  }

  const setField = (key: keyof CompanyForm) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Empresa</h1>
        <p className="text-muted-foreground">Dados cadastrais da sua organização</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Identificação
            <Badge variant="outline">Código: {org.org_code}</Badge>
          </CardTitle>
          <CardDescription>
            O código da organização compõe o prefixo dos SKUs internos gerados automaticamente.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome fantasia</Label>
              <Input id="trade_name" value={form.trade_name} onChange={setField('trade_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão social</Label>
              <Input id="legal_name" value={form.legal_name} onChange={setField('legal_name')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">CNPJ/CPF</Label>
              <Input id="document" value={form.document} onChange={setField('document')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" value={form.email} onChange={setField('email')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Telefone</Label>
              <Input id="phone" value={form.phone} onChange={setField('phone')} />
            </div>
          </div>
          <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Salvar
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default SupplierCompanySettings;
