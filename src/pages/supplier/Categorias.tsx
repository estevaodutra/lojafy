import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FolderTree, Plus, Settings2 } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';

export default function SupplierCategorias() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [newCatName, setNewCatName] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());

  // Fetch categories
  const { data: categories = [], isLoading: isLoadingCategories } = useQuery({
    queryKey: ['supplier-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('categories').select('*').order('name');
      if (error) throw error;
      return data;
    }
  });

  // Fetch supplier products
  const { data: products = [], isLoading: isLoadingProducts } = useQuery({
    queryKey: ['supplier-products-for-categories'],
    queryFn: async () => {
      const { data, error } = await supabase.from('products').select('id, name, category_id, sku, active').order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    }
  });

  // Create Category
  const createCategory = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/\s+/g, '-').replace(/[^\w-]/g, '');
      const { data, error } = await supabase.from('categories').insert({ name, slug }).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast({ title: 'Categoria criada com sucesso!' });
      setNewCatName('');
      queryClient.invalidateQueries({ queryKey: ['supplier-categories'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar categoria', description: error.message, variant: 'destructive' });
    }
  });

  // Bulk update category
  const bulkUpdate = useMutation({
    mutationFn: async () => {
      if (!selectedCategory || selectedProducts.size === 0) throw new Error('Selecione uma categoria e ao menos um produto');
      const productIds = Array.from(selectedProducts);
      const { error } = await supabase.from('products').update({ category_id: selectedCategory }).in('id', productIds);
      if (error) throw error;
      return productIds.length;
    },
    onSuccess: (count) => {
      toast({ title: 'Sucesso!', description: `${count} produtos atualizados.` });
      setSelectedProducts(new Set());
      queryClient.invalidateQueries({ queryKey: ['supplier-products-for-categories'] });
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    }
  });

  const toggleProduct = (id: string) => {
    const newSet = new Set(selectedProducts);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelectedProducts(newSet);
  };

  const toggleAll = () => {
    if (selectedProducts.size === products.length) {
      setSelectedProducts(new Set());
    } else {
      setSelectedProducts(new Set(products.map(p => p.id)));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FolderTree className="h-8 w-8 text-primary" />
          Categorias & Ações em Massa
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie as categorias do catálogo e organize seus produtos rapidamente.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Gestão de Categorias */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>Nova Categoria</CardTitle>
            <CardDescription>Crie categorias (ex: "Moda &gt; Camisas")</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input 
                placeholder="Ex: Eletrônicos > Celulares" 
                value={newCatName} 
                onChange={e => setNewCatName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && newCatName && createCategory.mutate(newCatName)}
              />
              <Button disabled={!newCatName || createCategory.isPending} onClick={() => createCategory.mutate(newCatName)}>
                {createCategory.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              </Button>
            </div>
            
            <div className="mt-6">
              <h3 className="font-semibold text-sm text-muted-foreground mb-3">Categorias Existentes ({categories.length})</h3>
              <ScrollArea className="h-[400px] border rounded-md p-2 bg-muted/20">
                {isLoadingCategories ? (
                  <div className="flex justify-center p-4"><Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /></div>
                ) : (
                  <ul className="space-y-1">
                    {categories.map((c: any) => (
                      <li key={c.id} className="text-sm px-2 py-1.5 rounded-sm hover:bg-muted/50 truncate" title={c.name}>
                        {c.name}
                      </li>
                    ))}
                  </ul>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        {/* Ações em Massa */}
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="w-5 h-5" />
              Atribuição em Massa
            </CardTitle>
            <CardDescription>Selecione produtos e mova-os para a categoria desejada de uma só vez.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-4 p-4 bg-muted/30 rounded-lg border items-end sm:items-center">
              <div className="flex-1 w-full">
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a categoria de destino..." />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c: any) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button 
                onClick={() => bulkUpdate.mutate()} 
                disabled={!selectedCategory || selectedProducts.size === 0 || bulkUpdate.isPending}
                className="w-full sm:w-auto bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {bulkUpdate.isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Mover {selectedProducts.size} Produto(s)
              </Button>
            </div>

            <div className="border rounded-md">
              <div className="bg-muted px-4 py-3 border-b flex items-center gap-3">
                <Checkbox 
                  checked={products.length > 0 && selectedProducts.size === products.length} 
                  onCheckedChange={toggleAll}
                  id="select-all-checkbox"
                />
                <label htmlFor="select-all-checkbox" className="text-sm font-semibold flex-1 cursor-pointer">
                  Selecionar Todos ({products.length})
                </label>
                <span className="text-sm text-muted-foreground w-1/3 hidden sm:block">Categoria Atual</span>
              </div>
              <ScrollArea className="h-[400px]">
                {isLoadingProducts ? (
                  <div className="flex justify-center p-8"><Loader2 className="w-8 h-8 animate-spin text-muted-foreground" /></div>
                ) : products.length === 0 ? (
                  <div className="p-8 text-center text-muted-foreground">Nenhum produto encontrado.</div>
                ) : (
                  <div className="divide-y">
                    {products.map((p: any) => {
                      const catName = categories.find((c: any) => c.id === p.category_id)?.name || 'Sem categoria';
                      return (
                        <div key={p.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-muted/20">
                          <Checkbox 
                            checked={selectedProducts.has(p.id)} 
                            onCheckedChange={() => toggleProduct(p.id)}
                            id={`check-${p.id}`}
                          />
                          <div className="flex-1 min-w-0 flex flex-col justify-center">
                            <label htmlFor={`check-${p.id}`} className="text-sm font-medium truncate cursor-pointer leading-tight">
                              {p.name}
                            </label>
                            <span className="text-xs text-muted-foreground mt-0.5">{p.sku || 'Sem SKU'}</span>
                          </div>
                          <div className="w-1/3 flex items-center justify-end sm:justify-start">
                            <span className={`text-xs px-2 py-0.5 rounded-full truncate max-w-full ${p.category_id ? 'bg-primary/10 text-primary' : 'bg-destructive/10 text-destructive'}`} title={catName}>
                              {catName}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
