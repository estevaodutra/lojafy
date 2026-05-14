import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Save, CheckCircle2, AlertCircle } from 'lucide-react';

interface ProductMlConfigProps {
  productId: string;
  productName: string;
}

export function ProductMlConfig({ productId, productName }: ProductMlConfigProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [categorySearch, setCategorySearch] = useState('');
  const [categoryResults, setCategoryResults] = useState<{ id: string; name: string }[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const { data: mlData, isLoading } = useQuery({
    queryKey: ['product-ml-config', productId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('product_marketplace_data')
        .select('*')
        .eq('product_id', productId)
        .eq('marketplace', 'mercadolivre')
        .maybeSingle();
      if (error) throw error;
      return data;
    },
  });

  const validated = (mlData?.validated_body as any) ?? {};
  const [form, setForm] = useState<Record<string, any>>({});

  const val = (key: string, fallback: any = '') =>
    form[key] !== undefined ? form[key] : (validated[key] ?? fallback);

  const updateField = (key: string, value: any) =>
    setForm(f => ({ ...f, [key]: value }));

  // Buscar categorias na ML API via Supabase (precisamos de access_token)
  const searchCategories = async () => {
    if (!categorySearch.trim()) return;
    setIsSearching(true);
    try {
      const res = await fetch(
        `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(categorySearch)}&limit=5`
      );
      const data = await res.json();
      setCategoryResults((data ?? []).map((c: any) => ({ id: c.category_id, name: c.category_name })));
    } catch {
      toast({ variant: 'destructive', title: 'Erro ao buscar categorias' });
    } finally {
      setIsSearching(false);
    }
  };

  const saveMutation = useMutation({
    mutationFn: async () => {
      const newValidatedBody = {
        ...validated,
        ...Object.fromEntries(
          Object.entries(form).filter(([, v]) => v !== undefined && v !== '')
        ),
      };

      const { error } = await supabase
        .from('product_marketplace_data')
        .upsert({
          product_id: productId,
          marketplace: 'mercadolivre',
          validated_body: newValidatedBody,
          is_validated: !!newValidatedBody.category_id,
          validated_at: new Date().toISOString(),
          listing_status: 'draft',
          updated_at: new Date().toISOString(),
        }, { onConflict: 'product_id,marketplace' });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['product-ml-config', productId] });
      setForm({});
      toast({ title: 'Configuração ML salva!' });
    },
    onError: (e: Error) => {
      toast({ variant: 'destructive', title: 'Erro ao salvar', description: e.message });
    },
  });

  if (isLoading) return <div className="space-y-2"><Skeleton className="h-8 w-full" /><Skeleton className="h-8 w-full" /></div>;

  const isConfigured = !!(mlData?.is_validated && validated.category_id);

  return (
    <div className="space-y-5">
      {/* Status */}
      <div className="flex items-center gap-2">
        {isConfigured ? (
          <Badge className="bg-green-100 text-green-800 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Configurado para ML
          </Badge>
        ) : (
          <Badge variant="outline" className="text-amber-700 border-amber-400 gap-1">
            <AlertCircle className="h-3 w-3" /> Sem configuração ML
          </Badge>
        )}
        {validated.category_id && (
          <span className="text-xs text-muted-foreground">Categoria: {validated.category_id}</span>
        )}
      </div>

      {/* Busca de categoria */}
      <div className="space-y-2">
        <Label>Categoria Mercado Livre</Label>
        <div className="flex gap-2">
          <Input
            placeholder={`Buscar categoria (ex: ${productName.split(' ').slice(0, 2).join(' ')})`}
            value={categorySearch}
            onChange={e => setCategorySearch(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && searchCategories()}
          />
          <Button variant="outline" size="icon" onClick={searchCategories} disabled={isSearching}>
            <Search className="h-4 w-4" />
          </Button>
        </div>
        {categoryResults.length > 0 && (
          <div className="border rounded-md divide-y bg-background shadow-sm">
            {categoryResults.map(cat => (
              <button
                key={cat.id}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-muted transition-colors ${val('category_id') === cat.id ? 'bg-primary/10 font-medium' : ''}`}
                onClick={() => { updateField('category_id', cat.id); setCategoryResults([]); }}
              >
                <span className="font-mono text-xs text-muted-foreground mr-2">{cat.id}</span>
                {cat.name}
              </button>
            ))}
          </div>
        )}
        {val('category_id') && (
          <p className="text-xs text-muted-foreground">
            Selecionado: <strong>{val('category_id')}</strong>
          </p>
        )}
      </div>

      {/* Tipo de anúncio */}
      <div className="space-y-1">
        <Label>Tipo de anúncio</Label>
        <Select value={val('listing_type_id', 'gold_special')} onValueChange={v => updateField('listing_type_id', v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="gold_pro">Gold Pro (Premium)</SelectItem>
            <SelectItem value="gold_special">Gold Special (Recomendado)</SelectItem>
            <SelectItem value="gold">Gold</SelectItem>
            <SelectItem value="silver">Silver</SelectItem>
            <SelectItem value="bronze">Bronze (Grátis)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Condição */}
      <div className="space-y-1">
        <Label>Condição</Label>
        <Select value={val('condition', 'new')} onValueChange={v => updateField('condition', v)}>
          <SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="new">Novo</SelectItem>
            <SelectItem value="used">Usado</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Frete grátis */}
      <div className="flex items-center justify-between">
        <Label>Frete grátis</Label>
        <Switch
          checked={val('shipping', {})?.free_shipping ?? false}
          onCheckedChange={v => updateField('shipping', { mode: 'me2', free_shipping: v })}
        />
      </div>

      <Button
        className="w-full"
        onClick={() => saveMutation.mutate()}
        disabled={saveMutation.isPending || Object.keys(form).length === 0}
      >
        <Save className="h-4 w-4 mr-2" />
        {saveMutation.isPending ? 'Salvando...' : 'Salvar configuração ML'}
      </Button>
    </div>
  );
}
