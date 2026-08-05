import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Settings, Star, Eye, ExternalLink, Tag } from 'lucide-react';

interface SettingsSectionProps {
  form: UseFormReturn<any>;
}

export const SettingsSection: React.FC<SettingsSectionProps> = ({ form }) => {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        
        {/* Produto Ativo */}
        <FormField
          control={form.control}
          name="active"
          render={({ field }) => (
            <FormItem className="flex flex-col justify-between p-3 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  Produto Ativo na Loja
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-[10px]">
                Visível para clientes realizarem compras.
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Produto em Destaque */}
        <FormField
          control={form.control}
          name="featured"
          render={({ field }) => (
            <FormItem className="flex flex-col justify-between p-3 rounded-lg border bg-background">
              <div className="flex items-center justify-between">
                <FormLabel className="text-xs font-semibold cursor-pointer flex items-center gap-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500/20" />
                  Em Destaque
                </FormLabel>
                <FormControl>
                  <Switch
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
              </div>
              <FormDescription className="text-[10px]">
                Exibir nas vitrines principais da plataforma.
              </FormDescription>
            </FormItem>
          )}
        />

        {/* Selo / Badge */}
        <FormField
          control={form.control}
          name="badge"
          render={({ field }) => (
            <FormItem className="p-3 rounded-lg border bg-background space-y-1">
              <FormLabel className="text-xs font-semibold flex items-center gap-1.5">
                <Tag className="h-3.5 w-3.5 text-primary" />
                Selo Promocional
              </FormLabel>
              <FormControl>
                <Input
                  placeholder="Ex: Lançamento, Mais Vendido"
                  {...field}
                  className="h-8 text-xs"
                />
              </FormControl>
              <FormMessage className="text-[11px]" />
            </FormItem>
          )}
        />

      </div>

      {/* URL de Anúncio de Referência */}
      <FormField
        control={form.control}
        name="reference_ad_url"
        render={({ field }) => (
          <FormItem className="p-3 rounded-lg border bg-background space-y-1">
            <FormLabel className="text-xs font-semibold flex items-center gap-1.5">
              <ExternalLink className="h-3.5 w-3.5 text-primary" />
              Link de Anúncio de Referência (Mercado Livre)
            </FormLabel>
            <FormControl>
              <Input
                placeholder="https://produto.mercadolivre.com.br/MLB-..."
                {...field}
                className="h-8 text-xs font-mono"
              />
            </FormControl>
            <FormDescription className="text-[10px]">
              Vincule um anúncio concorrente do Mercado Livre para análise e sincronização contínua.
            </FormDescription>
            <FormMessage className="text-[11px]" />
          </FormItem>
        )}
      />
    </div>
  );
};
