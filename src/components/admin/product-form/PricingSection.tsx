import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { 
  DollarSign, 
  Percent, 
  TrendingUp, 
  ShieldCheck, 
  ArrowDown, 
  Factory, 
  Store, 
  Truck, 
  AlertTriangle,
  Info,
  CheckCircle2,
  Tag
} from 'lucide-react';
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
  isSupplier?: boolean;
}

export const PricingSection: React.FC<PricingSectionProps> = ({
  form,
  watchedUseAutoPricing,
  watchedUseDefaultProfitMargin,
  priceBreakdown,
  supplierSettings,
  isSupplier = false,
}) => {
  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val || 0);
  };

  const supplierCost = Number(form.watch('supplier_cost_price') || 0);
  const costPrice = Number(form.watch('cost_price') || 0);
  const salePrice = Number(form.watch('price') || 0);

  const supplierGrossMargin = (costPrice > 0 && supplierCost > 0 && costPrice > supplierCost) 
    ? costPrice - supplierCost 
    : 0;
  const supplierMarginPercent = (supplierCost > 0 && supplierGrossMargin > 0)
    ? ((supplierGrossMargin / supplierCost) * 100).toFixed(1)
    : null;

  const lojafyGrossMargin = (salePrice > 0 && costPrice > 0 && salePrice > costPrice)
    ? salePrice - costPrice
    : 0;

  const isPriceBelowCost = costPrice > 0 && salePrice > 0 && salePrice < costPrice;
  const isCostBelowSupplierCost = supplierCost > 0 && costPrice > 0 && costPrice < supplierCost;

  return (
    <div className="space-y-6">
      
      {/* Banner Explicativo da Regra de Hierarquia da Lojafy */}
      <div className="p-3.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 rounded-xl flex items-start gap-3">
        <div className="p-1.5 bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-lg shrink-0 mt-0.5">
          <Info className="h-4 w-4" />
        </div>
        <div className="text-xs space-y-1">
          <p className="font-semibold text-blue-950 dark:text-blue-200">
            Hierarquia de Precificação Lojafy (Regra Obrigatória)
          </p>
          <p className="text-blue-800/80 dark:text-blue-300/80 leading-relaxed">
            A precificação é composta em 3 níveis somados: <strong>1. Custo do Fornecedor</strong> → <strong>2. Preço de Venda do Fornecedor (Custo Lojafy)</strong> → <strong>3. Preço de Venda da Lojafy</strong>. O vendedor/lojista <strong>sempre paga o Preço de Venda da Lojafy</strong> (Passo 3) por unidade faturada.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Bloco 1: Configuração e Hierarquia Passo a Passo (Esquerda - 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          
          {/* Regra de Precificação Automática */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <div className="flex items-center space-x-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <span className="text-xs font-bold text-foreground">Precificação Automática</span>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Calcula o preço de venda da Lojafy automaticamente aplicando margem e taxas da plataforma sobre o custo do fornecedor.
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
                        <FormLabel className="text-xs font-semibold">Margem Customizada da Lojafy (%)</FormLabel>
                        <div className="relative">
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              placeholder="Ex: 35"
                              {...field}
                              className="h-9 text-xs pr-8 font-mono"
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

          {/* HIERARQUIA VISUAL DE PREÇOS */}
          <div className="space-y-3">
            
            {/* ========================================================================= */}
            {/* NÍVEL 1: CUSTO DO FORNECEDOR */}
            {/* ========================================================================= */}
            <div className="p-4 rounded-xl border border-border/80 bg-background/60 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-slate-500/10 text-slate-600 dark:text-slate-400 flex items-center justify-center text-[11px] font-bold">
                    1
                  </div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Factory className="h-3.5 w-3.5 text-muted-foreground" />
                    {isSupplier ? '1. Seu Custo de Compra / Produção (R$)' : '1. Custo do Fornecedor (R$)'}
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground bg-muted/40">
                  Opcional • Referência
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="supplier_cost_price"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 5,00"
                        {...field}
                        className="h-9 text-xs font-mono font-medium"
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      {isSupplier 
                        ? 'Quanto custa para você produzir ou adquirir este produto (referência interna do fornecedor).' 
                        : 'Custo declarado pelo fornecedor para produção/aquisição (referência interna para análise de margem).'}
                    </p>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

            {/* CONECTOR HIERÁRQUICO 1 -> 2 */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-muted/60 border text-[11px] text-muted-foreground">
                <ArrowDown className="h-3 w-3 text-primary shrink-0" />
                <span>+ Margem de Lucro do Fornecedor</span>
                {supplierGrossMargin > 0 && supplierMarginPercent && (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400 font-mono">
                    (+{formatCurrency(supplierGrossMargin)} | +{supplierMarginPercent}%)
                  </span>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* NÍVEL 2: PREÇO DE VENDA DO FORNECEDOR = CUSTO LOJAFY */}
            {/* ========================================================================= */}
            <div className={`p-4 rounded-xl border bg-background/60 shadow-2xs space-y-2 ${
              isCostBelowSupplierCost ? 'border-amber-400 bg-amber-50/10' : 'border-border/80'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center text-[11px] font-bold">
                    2
                  </div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Truck className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
                    {isSupplier 
                      ? '2. Seu Preço de Venda para a Lojafy (R$)' 
                      : '2. Preço de Venda do Fornecedor (Custo Lojafy) (R$)'}
                    <span className="text-destructive">*</span>
                  </span>
                </div>
                <Badge variant="outline" className="text-[10px] font-semibold text-blue-700 dark:text-blue-300 bg-blue-500/10 border-blue-300 dark:border-blue-800">
                  Repasse Fornecedor
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="cost_price"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 8,00"
                        {...field}
                        className="h-9 text-xs font-mono font-medium text-foreground"
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      {isSupplier 
                        ? 'Valor líquido que você receberá da Lojafy por cada unidade vendida.' 
                        : 'Valor cobrado pelo fornecedor e pago pela Lojafy a cada venda (repasse). É o custo base da Lojafy.'}
                    </p>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {isCostBelowSupplierCost && (
                <div className="flex items-center gap-1.5 text-[11px] text-amber-600 dark:text-amber-400 pt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Atenção: O preço de venda do fornecedor está menor que o custo de produção declarado ({formatCurrency(supplierCost)}).</span>
                </div>
              )}
            </div>

            {/* CONECTOR HIERÁRQUICO 2 -> 3 */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-[11px] text-primary font-medium">
                <ArrowDown className="h-3 w-3 shrink-0" />
                <span>+ Margem da Lojafy & Custos da Plataforma</span>
                {lojafyGrossMargin > 0 && (
                  <span className="font-semibold font-mono">
                    (+{formatCurrency(lojafyGrossMargin)})
                  </span>
                )}
              </div>
            </div>

            {/* ========================================================================= */}
            {/* NÍVEL 3: PREÇO DE VENDA DA LOJAFY (COBRADO DO VENDEDOR) */}
            {/* ========================================================================= */}
            <div className={`p-4 rounded-xl border-2 transition-all space-y-2 ${
              isPriceBelowCost 
                ? 'border-destructive/80 bg-destructive/5' 
                : 'border-primary/60 bg-primary/[0.03] shadow-xs'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-[11px] font-bold">
                    3
                  </div>
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <Store className="h-3.5 w-3.5 text-primary" />
                    {isSupplier 
                      ? '3. Preço de Venda da Lojafy aos Vendedores (R$)' 
                      : '3. Preço de Venda da Lojafy (R$)'}
                    <span className="text-destructive">*</span>
                  </span>
                </div>
                <Badge variant="default" className="text-[10px] font-bold bg-primary text-primary-foreground">
                  Pago pelo Vendedor
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="price"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 12,00"
                        disabled={watchedUseAutoPricing}
                        {...field}
                        className={`h-9 text-xs font-mono font-bold ${
                          watchedUseAutoPricing 
                            ? 'bg-muted/50 cursor-not-allowed text-primary font-extrabold' 
                            : 'text-foreground'
                        }`}
                      />
                    </FormControl>
                    <p className="text-[11px] text-muted-foreground">
                      {watchedUseAutoPricing 
                        ? 'Calculado automaticamente aplicando a margem da Lojafy e taxas sobre o Preço do Fornecedor.' 
                        : 'Preço de venda cobrado pela Lojafy. REGRA: O vendedor sempre pagará este valor por unidade.'}
                    </p>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />

              {isPriceBelowCost && (
                <div className="flex items-center gap-1.5 text-[11px] text-destructive font-semibold pt-1">
                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                  <span>Erro Crítico: O Preço de Venda da Lojafy ({formatCurrency(salePrice)}) não pode ser inferior ao Preço do Fornecedor ({formatCurrency(costPrice)}). O vendedor sempre deve pagar o Preço de Venda da Lojafy!</span>
                </div>
              )}

              <div className="pt-2 border-t border-primary/10 flex items-center gap-1.5 text-[11px] text-primary/90 font-medium">
                <ShieldCheck className="h-3.5 w-3.5 text-primary shrink-0" />
                <span>Regra Inviolável: O vendedor/lojista sempre pagará este valor ({formatCurrency(salePrice || 0)}) no checkout/fulfillment.</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* NÍVEL COMPLEMENTAR: PREÇO PROMOCIONAL "DE" */}
            {/* ========================================================================= */}
            <div className="p-3.5 rounded-xl border border-dashed border-border/80 bg-muted/10 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5 text-muted-foreground" />
                  Preço Promocional "De" (R$)
                </span>
                <Badge variant="outline" className="text-[10px] font-normal text-muted-foreground">
                  Opcional • Vitrine
                </Badge>
              </div>

              <FormField
                control={form.control}
                name="original_price"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Ex: 39,90"
                        {...field}
                        className="h-8 text-xs font-mono text-muted-foreground"
                      />
                    </FormControl>
                    <p className="text-[10px] text-muted-foreground">
                      Valor riscado sugerido de oferta anterior (ex: De R$ 39,90 por ...) para atrair compradores na vitrine das lojas.
                    </p>
                    <FormMessage className="text-[11px]" />
                  </FormItem>
                )}
              />
            </div>

          </div>

        </div>

        {/* Bloco 2: Snapshot da Hierarquia Financeira em Tempo Real (Direita - 5 cols) */}
        <div className="lg:col-span-5">
          <Card className="h-full border-primary/30 bg-primary/[0.02] shadow-2xs flex flex-col">
            <CardContent className="p-4 space-y-4 flex-1 flex flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b pb-2">
                  <span className="text-xs font-bold text-foreground flex items-center gap-1.5">
                    <DollarSign className="h-4 w-4 text-primary" />
                    Hierarquia Financeira Lojafy
                  </span>
                  <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                    Tempo Real
                  </Badge>
                </div>

                {priceBreakdown ? (
                  <div className="space-y-2.5 text-xs">
                    
                    {/* 1. Custo do Fornecedor */}
                    {supplierCost > 0 && (
                      <div className="flex justify-between items-center text-muted-foreground bg-muted/20 p-2 rounded-lg">
                        <span className="flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-slate-500/20 text-slate-700 dark:text-slate-300 text-[10px] font-bold flex items-center justify-center">1</span>
                          Custo do Fornecedor:
                        </span>
                        <span className="font-mono font-medium text-foreground">
                          {formatCurrency(supplierCost)}
                        </span>
                      </div>
                    )}

                    {/* 2. Repasse ao Fornecedor */}
                    <div className="flex justify-between items-center text-muted-foreground bg-blue-500/5 border border-blue-500/10 p-2 rounded-lg">
                      <span className="flex items-center gap-1.5 text-blue-950 dark:text-blue-200 font-medium">
                        <span className="w-4 h-4 rounded-full bg-blue-500/20 text-blue-700 dark:text-blue-300 text-[10px] font-bold flex items-center justify-center">2</span>
                        {isSupplier ? 'Seu Repasse da Venda:' : 'Repasse ao Fornecedor (Custo):'}
                      </span>
                      <span className="font-mono font-bold text-blue-900 dark:text-blue-100">
                        {formatCurrency(priceBreakdown.costPrice)}
                      </span>
                    </div>

                    {/* Margem Lojafy */}
                    <div className="flex justify-between text-muted-foreground px-2 pt-1">
                      <span>(+) Margem da Lojafy:</span>
                      <span className="font-mono font-medium text-foreground">
                        {priceBreakdown.margin}%
                      </span>
                    </div>

                    {/* Taxas Plataforma / Gateway */}
                    <div className="flex justify-between text-muted-foreground px-2">
                      <span>(+) Gateway e Plataforma:</span>
                      <span className="font-mono font-medium text-foreground">
                        {formatCurrency(priceBreakdown.gatewayFeeAmount + priceBreakdown.platformFeeAmount)}
                      </span>
                    </div>

                    {/* 3. Preço de Venda da Lojafy */}
                    <div className="border-t border-primary/20 pt-2.5 mt-2 bg-primary/10 border rounded-xl p-3 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="font-bold text-foreground flex items-center gap-1.5">
                          <span className="w-4 h-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">3</span>
                          Preço de Venda Lojafy:
                        </span>
                        <span className="font-mono text-base text-primary font-black">
                          {formatCurrency(priceBreakdown.totalPrice)}
                        </span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Valor faturado do revendedor/lojista por unidade.
                      </p>
                    </div>

                    {/* Lucro Líquido Lojafy */}
                    <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-2.5 flex justify-between items-center text-emerald-700 dark:text-emerald-400 font-bold mt-2">
                      <span className="text-[11px] flex items-center gap-1.5">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                        {isSupplier ? 'Lucro Líquido Lojafy:' : 'Lucro Líquido Estimado:'}
                      </span>
                      <span className="font-mono text-sm font-black">{formatCurrency(priceBreakdown.estimatedNetProfit)}</span>
                    </div>

                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground space-y-2">
                    <p>Informe o Preço de Venda do Fornecedor (Passo 2) para calcular a projeção financeira em tempo real.</p>
                  </div>
                )}
              </div>

              {/* Box Regra de Ouro no Rodapé do Snapshot */}
              <div className="mt-4 p-3 bg-muted/40 border rounded-xl text-[11px] space-y-1 text-muted-foreground">
                <div className="font-bold text-foreground flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-primary" />
                  Regra de Pagamento da Plataforma:
                </div>
                <p>
                  O cliente/vendedor <strong>sempre paga o Preço de Venda da Lojafy (Passo 3)</strong>. O preço pago ao fornecedor (Passo 2) é repassado automaticamente após o envio do pedido.
                </p>
              </div>

            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
};
