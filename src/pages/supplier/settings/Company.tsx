import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { usePlatformSettings } from '@/hooks/usePlatformSettings';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, DollarSign, Percent, TrendingUp, AlertTriangle, Sparkles, Sliders, Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface CompanyForm {
  trade_name: string;
  legal_name: string;
  document: string;
  email: string;
  phone: string;
  // Novos campos de supplier_settings
  default_profit_margin_percentage: number;
  default_min_stock_level: number;
  auto_pricing_enabled: boolean;
  pricing_mode: string;
  price_rounding_strategy: string;
  allow_product_margin_override: boolean;
  low_stock_alert_enabled: boolean;
}

const SupplierCompanySettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const { data: orgData, isLoading: isOrgLoading } = useSupplierOrganization();
  const { settings: platformSettings, isLoading: isPlatformLoading } = usePlatformSettings();
  
  const org = orgData?.organization;
  const supplierSettings = orgData?.settings;

  const [form, setForm] = useState<CompanyForm>({
    trade_name: '',
    legal_name: '',
    document: '',
    email: '',
    phone: '',
    default_profit_margin_percentage: 20.00,
    default_min_stock_level: 100,
    auto_pricing_enabled: true,
    pricing_mode: 'markup',
    price_rounding_strategy: '90',
    allow_product_margin_override: true,
    low_stock_alert_enabled: true,
  });

  const [isSimulateOpen, setIsSimulateOpen] = useState(false);
  const [simulationData, setSimulationData] = useState<{
    totalProducts: number;
    avgOldPrice: number;
    avgNewPrice: number;
    totalOldValuation: number;
    totalNewValuation: number;
    impactPercentage: number;
  } | null>(null);
  const [isRecalculating, setIsRecalculating] = useState(false);

  useEffect(() => {
    if (org) {
      setForm({
        trade_name: org.trade_name ?? '',
        legal_name: org.legal_name ?? '',
        document: org.document ?? '',
        email: org.email ?? '',
        phone: org.phone ?? '',
        default_profit_margin_percentage: supplierSettings?.default_profit_margin_percentage ?? 20.00,
        default_min_stock_level: supplierSettings?.default_min_stock_level ?? 100,
        auto_pricing_enabled: supplierSettings?.auto_pricing_enabled ?? true,
        pricing_mode: supplierSettings?.pricing_mode ?? 'markup',
        price_rounding_strategy: supplierSettings?.price_rounding_strategy ?? '90',
        allow_product_margin_override: supplierSettings?.allow_product_margin_override ?? true,
        low_stock_alert_enabled: supplierSettings?.low_stock_alert_enabled ?? true,
      });
    }
  }, [org, supplierSettings]);

  const mutation = useMutation({
    mutationFn: async () => {
      if (!org) throw new Error('Organização não carregada');
      
      // 1. Atualizar dados cadastrais da empresa
      const { error: orgError } = await supabase
        .from('supplier_organizations')
        .update({
          trade_name: form.trade_name || null,
          legal_name: form.legal_name || null,
          document: form.document || null,
          email: form.email || null,
          phone: form.phone || null,
        })
        .eq('id', org.id);
      
      if (orgError) throw orgError;

      // 2. Atualizar configurações de precificação e estoque
      const { error: settingsError } = await supabase
        .from('supplier_settings')
        .update({
          default_profit_margin_percentage: Number(form.default_profit_margin_percentage),
          default_min_stock_level: Number(form.default_min_stock_level),
          auto_pricing_enabled: form.auto_pricing_enabled,
          pricing_mode: form.pricing_mode,
          price_rounding_strategy: form.price_rounding_strategy,
          allow_product_margin_override: form.allow_product_margin_override,
          low_stock_alert_enabled: form.low_stock_alert_enabled,
        })
        .eq('organization_id', org.id);

      if (settingsError) throw settingsError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
      toast({ title: 'Configurações atualizadas com sucesso!' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao salvar configurações', description: error.message, variant: 'destructive' });
    },
  });

  const calculatePrice = (cost: number, margin: number): number => {
    if (!cost) return 0;
    let fixedFees = 0;
    let percentFees = 0;

    if (platformSettings) {
      if (platformSettings.platform_fee_type === 'fixed') {
        fixedFees += platformSettings.platform_fee_value;
      } else {
        percentFees += platformSettings.platform_fee_value / 100;
      }
      percentFees += (platformSettings.gateway_fee_percentage || 0) / 100;

      if (platformSettings.additional_costs && Array.isArray(platformSettings.additional_costs)) {
        platformSettings.additional_costs.forEach((c: any) => {
          if (c.active) {
            if (c.type === 'fixed') {
              fixedFees += c.value;
            } else {
              percentFees += c.value / 100;
            }
          }
        });
      }
    }

    const denominator = Math.max(0.05, 1 - (margin / 100) - percentFees);
    let calculated = (cost + fixedFees) / denominator;

    // Aplicar arredondamento
    if (form.price_rounding_strategy === '90') {
      calculated = Math.ceil(calculated - 0.90) + 0.90;
    } else if (form.price_rounding_strategy === '99') {
      calculated = Math.ceil(calculated - 0.99) + 0.99;
    } else {
      calculated = Math.round(calculated * 100) / 100;
    }

    return calculated;
  };

  const handleSimulateRecalculate = async () => {
    if (!org) return;
    setIsSimulateOpen(true);
    setSimulationData(null);

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, name, cost_price, price, stock_quantity, use_default_profit_margin, custom_profit_margin_percentage')
        .eq('supplier_organization_id', org.id)
        .eq('active', true);

      if (error) throw error;

      if (!products || products.length === 0) {
        setSimulationData({
          totalProducts: 0,
          avgOldPrice: 0,
          avgNewPrice: 0,
          totalOldValuation: 0,
          totalNewValuation: 0,
          impactPercentage: 0
        });
        return;
      }

      let totalProducts = 0;
      let sumOldPrice = 0;
      let sumNewPrice = 0;
      let totalOldValuation = 0;
      let totalNewValuation = 0;

      products.forEach(p => {
        // Apenas recalcula produtos que usam a margem padrão (ou todos sob solicitação)
        // Se usar margem personalizada e override for ativo, ignora
        const margin = p.use_default_profit_margin 
          ? form.default_profit_margin_percentage 
          : (p.custom_profit_margin_percentage ?? form.default_profit_margin_percentage);

        const newPrice = calculatePrice(p.cost_price || 0, margin);
        const stock = p.stock_quantity || 0;

        totalProducts++;
        sumOldPrice += p.price || 0;
        sumNewPrice += newPrice;
        totalOldValuation += (p.price || 0) * stock;
        totalNewValuation += newPrice * stock;
      });

      const avgOldPrice = sumOldPrice / totalProducts;
      const avgNewPrice = sumNewPrice / totalProducts;
      const diff = avgNewPrice - avgOldPrice;
      const impactPercentage = avgOldPrice > 0 ? (diff / avgOldPrice) * 100 : 0;

      setSimulationData({
        totalProducts,
        avgOldPrice,
        avgNewPrice,
        totalOldValuation,
        totalNewValuation,
        impactPercentage
      });
    } catch (err: any) {
      toast({
        title: 'Erro na simulação',
        description: err.message,
        variant: 'destructive'
      });
      setIsSimulateOpen(false);
    }
  };

  const handleApplyRecalculate = async () => {
    if (!org) return;
    setIsRecalculating(true);

    try {
      const { data: products, error } = await supabase
        .from('products')
        .select('id, cost_price, use_default_profit_margin, custom_profit_margin_percentage')
        .eq('supplier_organization_id', org.id)
        .eq('active', true);

      if (error) throw error;

      if (products && products.length > 0) {
        // Executar atualizações em lote via loops síncronos
        for (const p of products) {
          const margin = p.use_default_profit_margin 
            ? form.default_profit_margin_percentage 
            : (p.custom_profit_margin_percentage ?? form.default_profit_margin_percentage);

          const newPrice = calculatePrice(p.cost_price || 0, margin);
          
          await supabase
            .from('products')
            .update({
              price: newPrice,
              calculated_price: newPrice,
              updated_at: new Date().toISOString()
            })
            .eq('id', p.id);
        }
      }

      toast({ title: 'Recálculo em lote concluído!', description: 'Os preços de venda dos produtos ativos foram atualizados.' });
      setIsSimulateOpen(false);
      queryClient.invalidateQueries({ queryKey: supplierKeys.all });
    } catch (err: any) {
      toast({ title: 'Erro ao recalcular', description: err.message, variant: 'destructive' });
    } finally {
      setIsRecalculating(false);
    }
  };

  if (isOrgLoading || isPlatformLoading) {
    return (
      <div className="space-y-6 max-w-2xl">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!org) {
    return (
      <p className="text-muted-foreground">
        Nenhuma organização encontrada para este usuário. Contate o suporte.
      </p>
    );
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Settings className="h-6 w-6 text-primary" />
          Configurações da Empresa
        </h1>
        <p className="text-muted-foreground">Gerencie os dados cadastrais, precificação automática e regras de estoque.</p>
      </div>

      {/* 1. Card de Identificação Cadastral */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            Identificação da Empresa
            <Badge variant="outline" className="ml-auto">Código: {org.org_code}</Badge>
          </CardTitle>
          <CardDescription>
            Esses dados são usados para faturamento e prefixo de SKUs.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="trade_name">Nome Fantasia</Label>
              <Input 
                id="trade_name" 
                value={form.trade_name} 
                onChange={(e) => setForm({ ...form, trade_name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name">Razão Social</Label>
              <Input 
                id="legal_name" 
                value={form.legal_name} 
                onChange={(e) => setForm({ ...form, legal_name: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="document">CNPJ / CPF</Label>
              <Input 
                id="document" 
                value={form.document} 
                onChange={(e) => setForm({ ...form, document: e.target.value })} 
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">E-mail Comercial</Label>
              <Input 
                id="email" 
                type="email" 
                value={form.email} 
                onChange={(e) => setForm({ ...form, email: e.target.value })} 
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="phone">Telefone de Contato</Label>
              <Input 
                id="phone" 
                value={form.phone} 
                onChange={(e) => setForm({ ...form, phone: e.target.value })} 
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 2. Card de Precificação Dinâmica e Custos */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Sliders className="h-5 w-5 text-primary" />
            Precificação e Margens
          </CardTitle>
          <CardDescription>
            Configure a margem de lucro padrão e regras de arredondamento aplicadas aos produtos.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between pb-2 border-b border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Habilitar Precificação Automática</Label>
              <p className="text-xs text-muted-foreground">Preços são recalculados na alteração de custos.</p>
            </div>
            <Switch 
              checked={form.auto_pricing_enabled}
              onCheckedChange={(checked) => setForm({ ...form, auto_pricing_enabled: checked })}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <Percent className="h-4 w-4 text-muted-foreground" />
                Margem de Lucro Padrão (%)
              </Label>
              <Input 
                type="number" 
                step="0.1" 
                value={form.default_profit_margin_percentage} 
                onChange={(e) => setForm({ ...form, default_profit_margin_percentage: parseFloat(e.target.value) || 0 })} 
              />
            </div>

            <div className="space-y-2">
              <Label>Estratégia de Arredondamento</Label>
              <Select
                value={form.price_rounding_strategy}
                onValueChange={(val) => setForm({ ...form, price_rounding_strategy: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-background border border-border shadow-lg">
                  <SelectItem value="90">Terminar em R$ X.90 (Recomendado)</SelectItem>
                  <SelectItem value="99">Terminar em R$ X.99</SelectItem>
                  <SelectItem value="none">Sem Arredondamento Especial</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Permitir Margem Personalizada por Produto</Label>
              <p className="text-xs text-muted-foreground">Permite que produtos individuais ignorem a margem global da empresa.</p>
            </div>
            <Switch 
              checked={form.allow_product_margin_override}
              onCheckedChange={(checked) => setForm({ ...form, allow_product_margin_override: checked })}
            />
          </div>

          <div className="pt-2 flex flex-col gap-2">
            <Label className="text-sm font-medium">Recalcular preços existentes</Label>
            <p className="text-xs text-muted-foreground">
              Aplica a margem padrão e arredondamento a todos os produtos ativos. Útil após alterar a margem padrão acima.
            </p>
            <Button 
              type="button" 
              variant="outline" 
              className="mt-2 w-fit gap-2 border-primary/30 hover:bg-primary/5"
              onClick={handleSimulateRecalculate}
            >
              <Sparkles className="h-4 w-4 text-primary" />
              Simular e Recalcular Preços em Lote
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* 3. Card de Estoque e Alertas */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="h-5 w-5 text-primary" />
            Estoque e Alertas
          </CardTitle>
          <CardDescription>
            Configure fallbacks de estoque e notificações.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Estoque Mínimo Padrão</Label>
              <Input 
                type="number" 
                value={form.default_min_stock_level} 
                onChange={(e) => setForm({ ...form, default_min_stock_level: parseInt(e.target.value) || 0 })} 
              />
              <p className="text-xs text-muted-foreground">Usado caso o produto não tenha estoque mínimo próprio definido.</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-border/50">
            <div className="space-y-0.5">
              <Label className="text-sm font-medium">Alertas de Baixo Estoque</Label>
              <p className="text-xs text-muted-foreground">Notifica painéis quando o estoque estiver abaixo do mínimo.</p>
            </div>
            <Switch 
              checked={form.low_stock_alert_enabled}
              onCheckedChange={(checked) => setForm({ ...form, low_stock_alert_enabled: checked })}
            />
          </div>
        </CardContent>
      </Card>

      {/* Ação de Salvar Geral */}
      <div className="flex justify-end gap-3 pt-2">
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending} className="w-32">
          {mutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </div>

      {/* Dialog do Modal de Simulação de Impacto */}
      <Dialog open={isSimulateOpen} onOpenChange={setIsSimulateOpen}>
        <DialogContent className="max-w-md bg-background border border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg">
              <TrendingUp className="h-5 w-5 text-green-600" />
              Simulação de Impacto de Preço
            </DialogTitle>
            <DialogDescription>
              Veja o impacto projetado nos preços do seu catálogo ativo antes de aplicar em lote.
            </DialogDescription>
          </DialogHeader>

          {!simulationData ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-3">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Calculando novos preços dos produtos...</p>
            </div>
          ) : simulationData.totalProducts === 0 ? (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Nenhum produto ativo encontrado para recálculo.
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border p-3 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Produtos Afetados</span>
                  <span className="text-lg font-bold">{simulationData.totalProducts}</span>
                </div>
                <div className="rounded-lg border p-3 bg-muted/20">
                  <span className="text-xs text-muted-foreground block">Variação Média</span>
                  <span className={`text-lg font-bold ${simulationData.impactPercentage >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {simulationData.impactPercentage >= 0 ? '+' : ''}{simulationData.impactPercentage.toFixed(2)}%
                  </span>
                </div>
              </div>

              <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Preço Médio Anterior</span>
                  <span className="font-mono">{simulationData.avgOldPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Preço Médio Projetado</span>
                  <span className="font-mono text-primary">{simulationData.avgNewPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <div className="space-y-2 border rounded-lg p-3 bg-muted/10">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Avaliação de Estoque Atual</span>
                  <span className="font-mono">{simulationData.totalOldValuation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
                <div className="flex justify-between text-sm font-semibold">
                  <span className="text-foreground">Avaliação de Estoque Projetada</span>
                  <span className="font-mono text-green-600">{simulationData.totalNewValuation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
              </div>

              <div className="rounded-md bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200/50 p-3 text-xs text-yellow-800 dark:text-yellow-400 flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
                <span>
                  <strong>Aviso:</strong> Esta operação irá sobrescrever síncronamente o preço de venda de todos os produtos ativos que utilizam precificação automática. Esta ação não poderá ser desfeita de forma automatizada.
                </span>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setIsSimulateOpen(false)} disabled={isRecalculating}>
              Cancelar
            </Button>
            <Button 
              onClick={handleApplyRecalculate} 
              disabled={isRecalculating || !simulationData || simulationData.totalProducts === 0}
              className="gap-2"
            >
              {isRecalculating && <Loader2 className="h-4 w-4 animate-spin" />}
              Confirmar e Aplicar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierCompanySettings;
