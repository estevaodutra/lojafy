import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { DollarSign, Percent, TrendingUp, ShieldCheck, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface PriceBreakdown {
  costPrice: number;
  margin: number;
  gatewayFeeAmount: number;
  platformFeeAmount: number;
  additionalCosts: number;
  totalPrice: number;
  estimatedNetProfit: number;
}

interface PricingSectionProps {
  form: UseFormReturn<any>;
  watchedUseAutoPricing: boolean;
  watchedUseDefaultProfitMargin: boolean;
  priceBreakdown: PriceBreakdown | null;
  supplierSettings?: any;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  form,
  watchedUseAutoPricing,
  watchedUseDefaultProfitMargin,
  priceBreakdown,
  supplierSettings,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bloco 1 & 2: Regras e Valores (Esquerda - 7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          
          {/* Regra de Precificação Automática */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Precificação Automática</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Calcula o preço de venda automaticamente considerando margem e taxas da plataforma.
                </p>
              </div>
              <FormField
                control={form.control}
                name="use_auto_pricing"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Switch
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>

            {watchedUseAutoPricing && (
              <div className="pt-2 border-t space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-foreground font-medium">Usar Margem de Lucro Padrão</span>
                  <FormField
                    control={form.control}
                    name="use_default_profit_margin"
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>

                {!watchedUseDefaultProfitMargin && (
                  <FormField
                    control={form.control}
                    name="custom_profit_margin_percentage"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-semibold">Margem Customizada (%)</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="Ex: 35"
                              {...field}
                              className="h-9 text-xs pr-8"
                            />
                          </FormControl>
                          <Percent className="absolute right-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                        </div>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />
                )}
              </div>
            )}
          </div>

          {/* Valores de Preço */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            
            {/* Preço de Custo */}
            <FormField
              control={form.control}
              name="cost_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">
                    Preço de Custo (R$) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      {...field}
                      className="h-9 text-xs font-mono"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Preço de Venda */}
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">
                    Preço de Venda (R$) <span className="text-destructive">*</span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      disabled={watchedUseAutoPricing}
                      {...field}
                      className="h-9 text-xs font-mono font-bold text-foreground"
                    />
                  </FormControl>
                  {watchedUseAutoPricing && (
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Calculado via Precificação Automática. Desative a chave acima para digitar um valor manual.
                    </p>
                  )}
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            {/* Preço Promocional */}
            <FormField
              control={form.control}
              name="original_price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-semibold">Preço Promocional De (R$)</FormLabel>
                  <FormControl>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Ex: 39,90"
                      {...field}
                      className="h-9 text-xs font-mono text-muted-foreground"
                    />
                  </FormControl>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

          </div>
        </div>

        {/* Bloco 3: Resumo Financeiro em Tempo Real (Direita - 5 cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full border-primary/20 bg-primary/[0.02] shadow-2xs">
            <CardContent className="p-4 space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-primary" />
                  Snapshot Financeiro
                </span>
                <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                  Tempo Real
                </Badge>
              </div>

              {priceBreakdown ? (
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-muted-foreground">
                    <span>Preço de Custo:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(priceBreakdown.costPrice)}</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Margem Aplicada:</span>
                    <span className="font-mono font-medium text-foreground">{priceBreakdown.margin}%</span>
                  </div>

                  <div className="flex justify-between text-muted-foreground">
                    <span>Taxa da Plataforma / Gateway:</span>
                    <span className="font-mono font-medium text-foreground">{formatCurrency(priceBreakdown.gatewayFeeAmount + priceBreakdown.platformFeeAmount)}</span>
                  </div>

                  <div className="border-t pt-2 flex justify-between font-semibold text-foreground">
                    <span>Preço Final de Venda:</span>
                    <span className="font-mono text-sm text-primary font-bold">{formatCurrency(priceBreakdown.totalPrice)}</span>
                  </div>

                  <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-lg p-2.5 flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-bold mt-2">
                    <span className="text-[11px]">Lucro Líquido Estimado:</span>
                    <span className="font-mono text-sm">{formatCurrency(priceBreakdown.estimatedNetProfit)}</span>
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Informe o preço de custo para calcular a projeção financeira.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
