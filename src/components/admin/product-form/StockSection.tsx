import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Package, AlertTriangle, Flame, CheckCircle2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface StockSectionProps {
  form: UseFormReturn<any>;
}

export const StockSection: React.FC<StockSectionProps> = ({ form }) => {
  const stockQty = form.watch('stock_quantity') || 0;
  const minStock = form.watch('min_stock_level') || 5;

  const isLowStock = stockQty <= minStock;
  const isOutOfStock = stockQty === 0;

  return (
    <div className="space-y-4">
      
      {/* Resumo da Saúde do Estoque */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20">
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">Status do Estoque:</span>
          {isOutOfStock ? (
            <Badge variant="destructive" className="text-[11px] px-2 py-0 h-5">
              Sem Estoque
            </Badge>
          ) : isLowStock ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[11px] px-2 py-0 h-5">
              <AlertTriangle className="h-3 w-3 mr-1" /> Estoque Baixo
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[11px] px-2 py-0 h-5">
              <CheckCircle2 className="h-3 w-3 mr-1" /> Estoque Saudável ({stockQty} un)
            </Badge>
          )}
        </div>

        <span className="text-xs text-muted-foreground font-mono">
          Alerta Mínimo: {minStock} unidades
        </span>
      </div>

      {/* Grid de Campos Compactos */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        
        {/* Quantidade em Estoque */}
        <FormField
          control={form.control}
          name="stock_quantity"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">
                Estoque Atual <span className="text-destructive">*</span>
              </FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="0"
                  placeholder="Ex: 100"
                  {...field}
                  className="h-9 text-xs font-mono font-bold"
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Estoque Mínimo */}
        <FormField
          control={form.control}
          name="min_stock_level"
          render={({ field }) => (
            <FormItem>
              <FormLabel className="text-xs font-semibold">Estoque Mínimo</FormLabel>
              <FormControl>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ex: 5"
                  {...field}
                  className="h-9 text-xs font-mono"
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

        {/* Alerta de Estoque Baixo */}
        <FormField
          control={form.control}
          name="low_stock_alert"
          render={({ field }) => (
            <FormItem className="flex flex-col justify-between p-2.5 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold cursor-pointer">Alerta de Estoque</FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-[10px]">Notificar quando atingir o nível mínimo.</FormDescription>
            </FormItem>
          )}
        />

        {/* Alta Rotatividade */}
        <FormField
          control={form.control}
          name="high_rotation"
          render={({ field }) => (
            <FormItem className="flex flex-col justify-between p-2.5 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold cursor-pointer flex items-center gap-1">
                  <Flame className="h-3.5 w-3.5 text-amber-500" />
                  Alta Rotatividade
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-[10px]">Destaque em relatórios de reposição.</FormDescription>
            </FormItem>
          )}
        />

      </div>
    </div>
  );
};
