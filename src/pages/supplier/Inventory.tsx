import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Package, 
  AlertTriangle, 
  Layers, 
  PackageX, 
  Loader2, 
  ArrowUpDown,
  Search,
  CheckCircle2,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface InventoryItem {
  id: string; // ID do produto ou da variante
  productId: string; // ID do produto pai
  name: string; // Nome (com a variante concatenada se aplicável)
  productName: string; // Nome do produto pai
  sku: string | null;
  currentStock: number;
  minStock: number;
  status: 'ok' | 'low' | 'out';
  isVariant: boolean;
  variantDetails?: {
    type: string;
    value: string;
  };
}

export default function SupplierInventory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [newStockQuantity, setNewStockQuantity] = useState('');
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  // Buscar produtos e variantes do fornecedor
  const { data: products = [], isLoading, refetch } = useQuery({
    queryKey: ['supplier-inventory', user?.id],
    queryFn: async () => {
      if (!user?.id) throw new Error('User not authenticated');

      const { data, error } = await supabase
        .from('products')
        .select(`
          id,
          name,
          sku,
          stock_quantity,
          min_stock_level,
          has_variations,
          product_variants (
            id,
            name,
            type,
            value,
            stock_quantity
          )
        `)
        .eq('supplier_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Achatatar a árvore de produtos e variações em uma lista linear para a tabela de estoque
  const inventoryItems: InventoryItem[] = React.useMemo(() => {
    const items: InventoryItem[] = [];

    products.forEach((product: any) => {
      const minStock = product.min_stock_level || 5;

      if (product.has_variations && product.product_variants && product.product_variants.length > 0) {
        // Se tem variações, listamos cada variação individualmente
        product.product_variants.forEach((variant: any) => {
          const stock = variant.stock_quantity || 0;
          let status: 'ok' | 'low' | 'out' = 'ok';
          if (stock === 0) status = 'out';
          else if (stock <= minStock) status = 'low';

          items.push({
            id: variant.id,
            productId: product.id,
            name: `${product.name} - ${variant.name} (${variant.value})`,
            productName: product.name,
            sku: product.sku, // Usa o SKU principal ou o SKU específico se houvesse no DB (não há SKU em variant no types.ts)
            currentStock: stock,
            minStock: minStock,
            status,
            isVariant: true,
            variantDetails: {
              type: variant.type,
              value: variant.value
            }
          });
        });
      } else {
        // Produto simples
        const stock = product.stock_quantity || 0;
        let status: 'ok' | 'low' | 'out' = 'ok';
        if (stock === 0) status = 'out';
        else if (stock <= minStock) status = 'low';

        items.push({
          id: product.id,
          productId: product.id,
          name: product.name,
          productName: product.name,
          sku: product.sku,
          currentStock: stock,
          minStock: minStock,
          status,
          isVariant: false
        });
      }
    });

    return items;
  }, [products]);

  // Estatísticas baseadas nos itens achatados
  const stats = React.useMemo(() => {
    const totalItems = inventoryItems.reduce((sum, item) => sum + item.currentStock, 0);
    const lowStock = inventoryItems.filter(item => item.status === 'low').length;
    const outOfStock = inventoryItems.filter(item => item.status === 'out').length;
    const totalUniqueItems = inventoryItems.length;

    return {
      totalItems,
      lowStock,
      outOfStock,
      totalUniqueItems
    };
  }, [inventoryItems]);

  // Filtrar itens por pesquisa
  const filteredItems = React.useMemo(() => {
    if (!searchTerm.trim()) return inventoryItems;
    const term = searchTerm.toLowerCase();
    return inventoryItems.filter(
      item => 
        item.name.toLowerCase().includes(term) || 
        (item.sku && item.sku.toLowerCase().includes(term))
    );
  }, [inventoryItems, searchTerm]);

  // Abrir modal de ajuste rápido
  const handleOpenAdjust = (item: InventoryItem) => {
    setSelectedItem(item);
    setNewStockQuantity(String(item.currentStock));
    setIsAdjustOpen(true);
  };

  // Salvar ajuste de estoque rápido no Supabase
  const handleSaveStock = async () => {
    if (!selectedItem) return;
    const stockVal = parseInt(newStockQuantity, 10);
    if (isNaN(stockVal) || stockVal < 0) {
      toast({
        title: 'Quantidade inválida',
        description: 'O estoque deve ser um número inteiro não-negativo.',
        variant: 'destructive',
      });
      return;
    }

    setIsUpdating(true);

    try {
      if (selectedItem.isVariant) {
        // 1. Atualizar estoque da variação específica
        const { error: variantError } = await supabase
          .from('product_variants')
          .update({ stock_quantity: stockVal })
          .eq('id', selectedItem.id);

        if (variantError) throw variantError;

        // 2. Recalcular a soma das variações e atualizar no produto pai
        // Primeiro buscamos todas as variações desse produto pai
        const { data: siblingVariants, error: fetchError } = await supabase
          .from('product_variants')
          .select('stock_quantity')
          .eq('product_id', selectedItem.productId);

        if (fetchError) throw fetchError;

        // Somamos a quantidade das variações (incluindo o valor novo)
        const totalVariantStock = (siblingVariants || []).reduce(
          (sum, v) => sum + (v.stock_quantity || 0), 
          0
        );

        // Atualizamos o produto pai com a soma total
        const { error: productError } = await supabase
          .from('products')
          .update({ stock_quantity: totalVariantStock })
          .eq('id', selectedItem.productId);

        if (productError) throw productError;

      } else {
        // Produto simples: atualiza direto no produto
        const { error } = await supabase
          .from('products')
          .update({ stock_quantity: stockVal })
          .eq('id', selectedItem.id);

        if (error) throw error;
      }

      toast({
        title: 'Estoque atualizado',
        description: `O estoque de "${selectedItem.name}" foi alterado para ${stockVal} unidades.`,
      });

      // Invalidar queries do fornecedor para reatividade
      queryClient.invalidateQueries({ queryKey: ['supplier-inventory'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-product-stats'] });

      setIsAdjustOpen(false);
      setSelectedItem(null);
    } catch (err: any) {
      console.error('Error updating stock:', err);
      toast({
        title: 'Erro ao atualizar',
        description: err.message || 'Houve um erro de banco ao tentar salvar o estoque.',
        variant: 'destructive',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getStatusBadge = (status: 'ok' | 'low' | 'out') => {
    switch (status) {
      case 'out':
        return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Esgotado</Badge>;
      case 'low':
        return <Badge variant="outline" className="bg-amber-100 text-amber-800 border-amber-200">Estoque Baixo</Badge>;
      case 'ok':
        return <Badge variant="outline" className="bg-green-100 text-green-800 border-green-200">Normal</Badge>;
      default:
        return <Badge variant="outline">Normal</Badge>;
    }
  };

  const getStockPercentage = (current: number, min: number) => {
    if (current === 0) return 0;
    const maxReference = min * 4; // Referência visual
    const percent = (current / maxReference) * 100;
    return Math.min(100, Math.max(5, percent));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Controle de Estoque</h1>
          <p className="text-muted-foreground">Monitore e ajuste rapidamente os níveis de inventário do seu catálogo</p>
        </div>
        <Button variant="outline" onClick={() => refetch()} className="gap-2" disabled={isLoading}>
          <ArrowUpDown className="h-4 w-4" />
          Atualizar Dados
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="relative overflow-hidden">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Consolidado</CardTitle>
            <Package className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl font-bold text-primary">{stats.totalItems}</div>
                <p className="text-xs text-muted-foreground">Unidades físicas totais</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens em Catálogo</CardTitle>
            <Layers className="w-4 h-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <div className="text-2xl font-bold">{stats.totalUniqueItems}</div>
                <p className="text-xs text-muted-foreground">Produtos e variações cadastrados</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={stats.lowStock > 0 ? 'border-amber-200 bg-amber-50/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Estoque Baixo</CardTitle>
            <AlertTriangle className={`w-4 h-4 ${stats.lowStock > 0 ? 'text-amber-500 animate-bounce' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.lowStock > 0 ? 'text-amber-600' : ''}`}>
                  {stats.lowStock}
                </div>
                <p className="text-xs text-muted-foreground">Requerem reposição imediata</p>
              </>
            )}
          </CardContent>
        </Card>

        <Card className={stats.outOfStock > 0 ? 'border-red-200 bg-red-50/10' : ''}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Itens Esgotados</CardTitle>
            <PackageX className={`w-4 h-4 ${stats.outOfStock > 0 ? 'text-red-500' : 'text-muted-foreground'}`} />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            ) : (
              <>
                <div className={`text-2xl font-bold ${stats.outOfStock > 0 ? 'text-red-600' : ''}`}>
                  {stats.outOfStock}
                </div>
                <p className="text-xs text-muted-foreground">Produtos sem estoque físico</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Barra de Pesquisa */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Buscar por nome do produto, variação ou SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      {/* Inventory Table */}
      <Card>
        <CardHeader>
          <CardTitle>Níveis de Estoque dos Produtos</CardTitle>
          <CardDescription>
            Visualize, filtre e gerencie as quantidades dos seus itens e variações ativas.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <p className="text-sm text-muted-foreground">Carregando estoque...</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredItems.length > 0 ? (
                <div className="grid gap-4">
                  {filteredItems.map((item) => (
                    <div key={item.id} className="p-4 border rounded-xl hover:shadow-sm transition-all duration-150 flex flex-col md:flex-row md:items-center justify-between gap-4">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-base text-foreground">{item.name}</h3>
                          {item.isVariant && (
                            <Badge variant="secondary" className="text-[10px] px-1.5 py-0">Variação</Badge>
                          )}
                          {getStatusBadge(item.status)}
                        </div>
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          {item.sku && (
                            <span><strong>SKU:</strong> {item.sku}</span>
                          )}
                          <span><strong>Mínimo Alerta:</strong> {item.minStock} unidades</span>
                        </div>
                        
                        {/* Indicador visual de nível de estoque */}
                        <div className="pt-2 max-w-md">
                          <div className="flex justify-between text-xs mb-1 text-muted-foreground">
                            <span>Quantidade: <strong>{item.currentStock} un.</strong></span>
                            <span>Limiar: {item.minStock} un.</span>
                          </div>
                          <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                            <div
                              className={`h-1.5 rounded-full transition-all duration-300 ${
                                item.status === 'out' 
                                  ? 'bg-red-500 w-0' 
                                  : item.status === 'low' 
                                    ? 'bg-amber-500' 
                                    : 'bg-primary'
                              }`}
                              style={{
                                width: `${getStockPercentage(item.currentStock, item.minStock)}%`
                              }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleOpenAdjust(item)}
                          className="h-9 px-3 gap-1 font-medium hover:bg-primary/5 hover:text-primary hover:border-primary/30"
                        >
                          Ajustar Estoque
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 border border-dashed rounded-xl flex flex-col items-center justify-center gap-2">
                  <PackageX className="h-10 w-10 text-muted-foreground" />
                  <h3 className="font-semibold text-lg">Nenhum item encontrado</h3>
                  <p className="text-sm text-muted-foreground">
                    {searchTerm ? 'Tente ajustar sua busca por outros termos.' : 'Cadastre produtos ou aguarde a aprovação do admin.'}
                  </p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Ajuste Rápido de Estoque */}
      <Dialog open={isAdjustOpen} onOpenChange={(open) => !isUpdating && !open && setIsAdjustOpen(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Ajustar Quantidade de Estoque
            </DialogTitle>
            <DialogDescription>
              Altere a quantidade atual do produto físico disponível para venda.
            </DialogDescription>
          </DialogHeader>

          {selectedItem && (
            <div className="space-y-4 py-4">
              <div className="p-3 bg-muted/50 border rounded-lg">
                <span className="text-xs text-muted-foreground block font-medium">Item Selecionado</span>
                <span className="text-sm font-semibold text-foreground">{selectedItem.name}</span>
                {selectedItem.sku && (
                  <span className="text-xs text-muted-foreground block mt-0.5">SKU: {selectedItem.sku}</span>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="stock-quantity" className="text-sm font-semibold">
                  Nova Quantidade em Estoque
                </Label>
                <div className="flex gap-2 items-center">
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 shrink-0 font-bold text-lg select-none"
                    onClick={() => {
                      const val = Math.max(0, parseInt(newStockQuantity, 10) - 1);
                      setNewStockQuantity(String(val));
                    }}
                    disabled={isUpdating}
                  >
                    -
                  </Button>
                  <Input
                    id="stock-quantity"
                    type="number"
                    value={newStockQuantity}
                    onChange={(e) => setNewStockQuantity(e.target.value)}
                    className="text-center font-bold text-lg h-10"
                    min="0"
                    placeholder="0"
                    disabled={isUpdating}
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    className="h-10 w-10 shrink-0 font-bold text-lg select-none"
                    onClick={() => {
                      const val = (parseInt(newStockQuantity, 10) || 0) + 1;
                      setNewStockQuantity(String(val));
                    }}
                    disabled={isUpdating}
                  >
                    +
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Quantidade atual no sistema: <strong>{selectedItem.currentStock} unidades</strong>
                </p>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAdjustOpen(false)} disabled={isUpdating}>
              Cancelar
            </Button>
            <Button onClick={handleSaveStock} disabled={isUpdating} className="gap-1">
              {isUpdating && <Loader2 className="h-4 w-4 animate-spin" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}