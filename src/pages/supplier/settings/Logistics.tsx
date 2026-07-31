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
import { Loader2 } from 'lucide-react';

const SupplierLogisticsSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData, isLoading } = useSupplierOrganization();
  const org = orgData?.organization;
  const settings = orgData?.settings;

  const [pickingSla, setPickingSla] = useState('24');
  const [shippingSla, setShippingSla] = useState('48');
  const [carrier, setCarrier] = useState('');
  const [lowStock, setLowStock] = useState('5');

  useEffect(() => {
    if (settings) {
      setPickingSla(String(settings.picking_sla_hours));
      setShippingSla(String(settings.shipping_sla_hours));
      setCarrier(settings.default_carrier ?? '');
      setLowStock(String(settings.low_stock_threshold));
    }
  }, [settings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error('Organização não carregada');
      const { error } = await supabase
        .from('supplier_settings')
        .upsert({
          organization_id: org.id,
          picking_sla_hours: Math.max(1, parseInt(pickingSla, 10) || 24),
          shipping_sla_hours: Math.max(1, parseInt(shippingSla, 10) || 48),
          default_carrier: carrier || null,
          low_stock_threshold: Math.max(0, parseInt(lowStock, 10) || 5),
        });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast({ title: 'Configurações de logística atualizadas' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading) return <Skeleton className="h-64 w-full max-w-2xl" />;
  if (!org) return <p className="text-muted-foreground">Nenhuma organização encontrada.</p>;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold">Logística</h1>
        <p className="text-muted-foreground">
          Prazos de SLA usados para calcular vencimentos nos novos pedidos
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Prazos e transporte</CardTitle>
          <CardDescription>
            Os prazos valem para fulfillments criados a partir de agora; pedidos existentes não são recalculados.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="picking_sla">SLA de separação (horas)</Label>
              <Input id="picking_sla" type="number" min={1} value={pickingSla} onChange={(e) => setPickingSla(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shipping_sla">SLA de envio (horas)</Label>
              <Input id="shipping_sla" type="number" min={1} value={shippingSla} onChange={(e) => setShippingSla(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="carrier">Transportadora padrão</Label>
              <Input id="carrier" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="Ex.: Correios" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="low_stock">Alerta de estoque mínimo</Label>
              <Input id="low_stock" type="number" min={0} value={lowStock} onChange={(e) => setLowStock(e.target.value)} />
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

export default SupplierLogisticsSettings;
