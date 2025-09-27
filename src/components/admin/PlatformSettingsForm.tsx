import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, TrendingUp, TrendingDown } from 'lucide-react';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';

const formSchema = z.object({
  platform_fee_value: z.number().min(0).max(100),
  platform_fee_type: z.enum(['percentage', 'fixed']),
  gateway_fee_percentage: z.number().min(0).max(100),
  reseller_withdrawal_fee_value: z.number().min(0).max(100),
  reseller_withdrawal_fee_type: z.enum(['percentage', 'fixed']),
  recalculate_prices: z.boolean().default(false),
});

type FormData = z.infer<typeof formSchema>;

interface PlatformSettingsFormProps {
  onClose: () => void;
}

export const PlatformSettingsForm: React.FC<PlatformSettingsFormProps> = ({ onClose }) => {
  const { settings, updateSettings, isUpdating, calculatePriceImpact } = usePlatformSettings();
  const [priceImpact, setPriceImpact] = useState<{ affected_products: number; average_change: number } | null>(null);
  const [calculatingImpact, setCalculatingImpact] = useState(false);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      platform_fee_value: settings?.platform_fee_value || 5,
      platform_fee_type: settings?.platform_fee_type || 'percentage',
      gateway_fee_percentage: settings?.gateway_fee_percentage || 3.5,
      reseller_withdrawal_fee_value: settings?.reseller_withdrawal_fee_value || 5,
      reseller_withdrawal_fee_type: settings?.reseller_withdrawal_fee_type || 'fixed',
      recalculate_prices: false,
    },
  });

  const watchedValues = form.watch();

  // Calculate price impact when form values change
  useEffect(() => {
    if (settings) {
      const calculateImpact = async () => {
        setCalculatingImpact(true);
        try {
          const impact = await calculatePriceImpact({
            platform_fee_value: watchedValues.platform_fee_value,
            platform_fee_type: watchedValues.platform_fee_type,
            gateway_fee_percentage: watchedValues.gateway_fee_percentage,
          });
          setPriceImpact(impact);
        } catch (error) {
          console.error('Error calculating price impact:', error);
        } finally {
          setCalculatingImpact(false);
        }
      };

      const hasChanges = 
        watchedValues.platform_fee_value !== settings.platform_fee_value ||
        watchedValues.platform_fee_type !== settings.platform_fee_type ||
        watchedValues.gateway_fee_percentage !== settings.gateway_fee_percentage;

      if (hasChanges) {
        calculateImpact();
      } else {
        setPriceImpact(null);
      }
    }
  }, [watchedValues, settings, calculatePriceImpact]);

  const onSubmit = (data: FormData) => {
    updateSettings(data);
    onClose();
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Configurações de Taxas</CardTitle>
          <CardDescription>
            Altere as taxas da plataforma e escolha se deseja recalcular os preços dos produtos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="platform_fee_value">Taxa da Plataforma</Label>
                <div className="flex gap-2">
                  <Input
                    id="platform_fee_value"
                    type="number"
                    step="0.01"
                    {...form.register('platform_fee_value', { valueAsNumber: true })}
                    className="flex-1"
                  />
                  <Select 
                    value={form.watch('platform_fee_type')} 
                    onValueChange={(value) => form.setValue('platform_fee_type', value as 'percentage' | 'fixed')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="gateway_fee_percentage">Taxa de Transação (%)</Label>
                <Input
                  id="gateway_fee_percentage"
                  type="number"
                  step="0.01"
                  {...form.register('gateway_fee_percentage', { valueAsNumber: true })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="reseller_withdrawal_fee_value">Taxa de Saque Revendedor</Label>
                <div className="flex gap-2">
                  <Input
                    id="reseller_withdrawal_fee_value"
                    type="number"
                    step="0.01"
                    {...form.register('reseller_withdrawal_fee_value', { valueAsNumber: true })}
                    className="flex-1"
                  />
                  <Select 
                    value={form.watch('reseller_withdrawal_fee_type')} 
                    onValueChange={(value) => form.setValue('reseller_withdrawal_fee_type', value as 'percentage' | 'fixed')}
                  >
                    <SelectTrigger className="w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">Fixo</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {/* Price Impact Preview */}
            {calculatingImpact && (
              <Alert>
                <Loader2 className="h-4 w-4 animate-spin" />
                <AlertDescription>
                  Calculando impacto nos preços...
                </AlertDescription>
              </Alert>
            )}

            {priceImpact && !calculatingImpact && (
              <Alert>
                <div className="flex items-center gap-2">
                  {priceImpact.average_change > 0 ? (
                    <TrendingUp className="h-4 w-4 text-orange-500" />
                  ) : priceImpact.average_change < 0 ? (
                    <TrendingDown className="h-4 w-4 text-success" />
                  ) : (
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
                <AlertDescription>
                  <div className="space-y-1">
                    <p><strong>{priceImpact.affected_products}</strong> produtos serão afetados</p>
                    <p>
                      Variação média: 
                      <span className={priceImpact.average_change > 0 ? 'text-orange-500 font-medium' : 'text-success font-medium'}>
                        {priceImpact.average_change > 0 ? '+' : ''}{priceImpact.average_change.toFixed(2)}%
                      </span>
                    </p>
                  </div>
                </AlertDescription>
              </Alert>
            )}

            <div className="flex items-center space-x-2">
              <Checkbox
                id="recalculate_prices"
                checked={form.watch('recalculate_prices')}
                onCheckedChange={(checked) => form.setValue('recalculate_prices', !!checked)}
              />
              <Label htmlFor="recalculate_prices" className="text-sm">
                Recalcular preços dos produtos automaticamente
              </Label>
            </div>

            {form.watch('recalculate_prices') && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Esta ação irá alterar os preços de todos os produtos com base nas novas taxas.
                  Esta operação não pode ser desfeita automaticamente.
                </AlertDescription>
              </Alert>
            )}

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={onClose}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isUpdating}>
                {isUpdating && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Salvar Configurações
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};