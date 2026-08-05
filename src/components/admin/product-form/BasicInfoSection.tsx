import React from 'react';
import { UseFormReturn } from 'react-hook-form';
import { FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Plus, RefreshCw, Sparkles, Tag, Barcode, Info } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface BasicInfoSectionProps {
  form: UseFormReturn<any>;
  categories: any[];
  subcategories: any[];
  selectedCategory: string;
  onOpenCategoryModal: () => void;
  onOpenSubcategoryModal: () => void;
  onAutoCategorize: () => void;
  onGenerateGtin: () => void;
  isGeneratingGtin: boolean;
  onOpenMlSearch?: () => void;
}

export const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  form,
  categories,
  subcategories,
  selectedCategory,
  onOpenCategoryModal,
  onOpenSubcategoryModal,
  onAutoCategorize,
  onGenerateGtin,
  isGeneratingGtin,
  onOpenMlSearch,
}) => {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Coluna 1: Identificação Comercial (Esquerda - 7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center space-x-2 border-b pb-2">
            <Tag className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Identificação Comercial</h3>
          </div>

          {/* Nome do Produto */}
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold">
                  Nome do Produto <span className="text-destructive">*</span>
                </FormLabel>
                <div className="flex flex-wrap sm:flex-nowrap gap-2">
                  <FormControl>
                    <Input placeholder="Ex: Mini Balança Digital De Alta Precisão" {...field} className="h-9 text-sm min-w-0 flex-1" />
                  </FormControl>

                  {onOpenMlSearch && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={onOpenMlSearch}
                      className="h-9 text-xs px-2.5 shrink-0 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400 font-semibold"
                      title="Buscar anúncio de referência no Mercado Livre e preencher tudo com 1 clique"
                    >
                      <ShoppingBag className="h-3.5 w-3.5 mr-1" />
                      Puxar do Mercado Livre
                    </Button>
                  )}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onAutoCategorize}
                    className="h-9 text-xs px-2.5 shrink-0 bg-primary/5 hover:bg-primary/10 text-primary border-primary/20"
                    title="Sugerir categoria automaticamente"
                  >
                    <Sparkles className="h-3.5 w-3.5 mr-1" />
                    Auto Categoria
                  </Button>
                </div>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* Categoria e Subcategoria */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField
              control={form.control}
              name="category_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold">Categoria</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onOpenCategoryModal}
                      className="h-5 text-[11px] p-0 text-primary hover:bg-transparent"
                    >
                      <Plus className="h-3 w-3 mr-0.5" /> Nova
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value || ''}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione uma categoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {categories?.map((cat) => (
                        <SelectItem key={cat.id} value={cat.id} className="text-xs">
                          {cat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="subcategory_id"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel className="text-xs font-semibold">Subcategoria</FormLabel>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={onOpenSubcategoryModal}
                      disabled={!selectedCategory}
                      className="h-5 text-[11px] p-0 text-primary hover:bg-transparent disabled:opacity-50"
                    >
                      <Plus className="h-3 w-3 mr-0.5" /> Nova
                    </Button>
                  </div>
                  <Select onValueChange={field.onChange} value={field.value || 'none'} disabled={!selectedCategory}>
                    <FormControl>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue placeholder="Selecione uma subcategoria" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none" className="text-xs">Nenhuma</SelectItem>
                      {subcategories?.map((subcat) => (
                        <SelectItem key={subcat.id} value={subcat.id} className="text-xs">
                          {subcat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage className="text-[11px]" />
                </FormItem>
              )}
            />
          </div>

          {/* Descrição */}
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold">Descrição do Produto</FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Descreva as características técnicas, diferenciais e uso do produto..."
                    rows={4}
                    {...field}
                    className="text-xs resize-y min-h-[100px]"
                  />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

        {/* Coluna 2: Identificadores e Marca (Direita - 5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="flex items-center space-x-2 border-b pb-2">
            <Barcode className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Identificadores e Códigos</h3>
          </div>

          {/* Marca */}
          <FormField
            control={form.control}
            name="brand"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold">Marca / Fabricante</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: New, Xiaomi, Tramontina" {...field} className="h-9 text-xs" />
                </FormControl>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* SKU */}
          <FormField
            control={form.control}
            name="sku"
            render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-semibold">SKU (Código Interno)</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: LJF026000223" {...field} className="h-9 text-xs font-mono uppercase" />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Identificador único do produto no seu estoque.
                </FormDescription>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />

          {/* GTIN / EAN-13 */}
          <FormField
            control={form.control}
            name="gtin_ean13"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel className="text-xs font-semibold">GTIN / EAN-13 (Código de Barras)</FormLabel>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onGenerateGtin}
                    disabled={isGeneratingGtin}
                    className="h-5 text-[11px] px-1 text-primary hover:bg-primary/5"
                  >
                    <RefreshCw className={`h-3 w-3 mr-1 ${isGeneratingGtin ? 'animate-spin' : ''}`} />
                    Gerar EAN
                  </Button>
                </div>
                <FormControl>
                  <Input
                    placeholder="7890000000000 (13 dígitos)"
                    maxLength={13}
                    {...field}
                    className="h-9 text-xs font-mono"
                  />
                </FormControl>
                <FormDescription className="text-[10px]">
                  Necessário para sincronização oficial com Mercado Livre e marketplaces.
                </FormDescription>
                <FormMessage className="text-[11px]" />
              </FormItem>
            )}
          />
        </div>

      </div>
    </div>
  );
};
