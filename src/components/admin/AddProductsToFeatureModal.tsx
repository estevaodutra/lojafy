import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
}

interface AddProductsToFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  existingProductIds: string[];
  onAdd: (productIds: string[]) => void;
  limite?: number | null;
  currentCount: number;
}

export const AddProductsToFeatureModal: React.FC<AddProductsToFeatureModalProps> = ({
  isOpen,
  onClose,
  featureId,
  existingProductIds,
  onAdd,
  limite,
  currentCount,
}) => {
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setResults([]);
      setSelected([]);
      return;
    }
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase
      .from('products')
      .select('id, name, sku, price, image_url')
      .eq('active', true)
      .order('name')
      .limit(20);

    if (existingProductIds.length > 0) {
      // Filter out already linked products - use not.in filter
      query = query.not('id', 'in', `(${existingProductIds.join(',')})`);
    }

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data } = await query;
    setResults(data || []);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const maxCanAdd = limite ? limite - currentCount : Infinity;

  const handleAdd = () => {
    onAdd(selected);
    onClose();
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Adicionar Produtos</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 min-h-[200px] max-h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
            </div>
          ) : results.length === 0 ? (
            <p className="text-center text-muted-foreground py-8 text-sm">
              Nenhum produto encontrado
            </p>
          ) : (
            results.map((product) => {
              const isSelected = selected.includes(product.id);
              const disabled = !isSelected && selected.length >= maxCanAdd;
              return (
                <div
                  key={product.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    isSelected ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'
                  } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                  onClick={() => !disabled && toggleSelect(product.id)}
                >
                  <Checkbox checked={isSelected} disabled={disabled} />
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-10 h-10 rounded object-cover"
                    />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{product.name}</p>
                    <p className="text-xs text-muted-foreground">
                      SKU: {product.sku} | {formatPrice(product.price)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between">
          <span className="text-sm text-muted-foreground">
            {selected.length} selecionado(s)
            {limite && ` • Limite: ${limite - currentCount} restante(s)`}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose}>
              Cancelar
            </Button>
            <Button onClick={handleAdd} disabled={selected.length === 0}>
              Adicionar
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
