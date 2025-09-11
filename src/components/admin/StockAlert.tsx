import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Package, Zap } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useState } from 'react';

interface StockAlertProps {
  products: any[];
  onRefresh: () => void;
}

const StockAlert: React.FC<StockAlertProps> = ({ products, onRefresh }) => {
  const [updatingStock, setUpdatingStock] = useState<{ [key: string]: boolean }>({});
  const [stockValues, setStockValues] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();

  const handleQuickStockUpdate = async (productId: string, currentStock: number) => {
    const newStockStr = stockValues[productId];
    if (!newStockStr || newStockStr.trim() === '') {
      toast({
        title: "Erro",
        description: "Digite uma quantidade válida.",
        variant: "destructive",
      });
      return;
    }

    const newStock = parseInt(newStockStr);
    if (isNaN(newStock) || newStock < 0) {
      toast({
        title: "Erro",
        description: "Quantidade deve ser um número positivo.",
        variant: "destructive",
      });
      return;
    }

    setUpdatingStock(prev => ({ ...prev, [productId]: true }));

    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          stock_quantity: newStock,
          updated_at: new Date().toISOString()
        })
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Estoque atualizado",
        description: `Estoque atualizado de ${currentStock} para ${newStock} unidades.`,
      });

      setStockValues(prev => ({ ...prev, [productId]: '' }));
      onRefresh();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({
        title: "Erro ao atualizar estoque",
        description: "Ocorreu um erro ao tentar atualizar o estoque.",
        variant: "destructive",
      });
    } finally {
      setUpdatingStock(prev => ({ ...prev, [productId]: false }));
    }
  };

  const handleSetStockValue = (productId: string, value: string) => {
    setStockValues(prev => ({ ...prev, [productId]: value }));
  };

  if (products.length === 0) return null;

  return (
    <Card className="border-warning/20 bg-warning/5">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-warning">
              <AlertTriangle className="h-5 w-5" />
              Alerta de Estoque Baixo
            </CardTitle>
            <CardDescription>
              {products.length} produto(s) com estoque abaixo do nível mínimo
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-warning/10 text-warning border-warning/20">
            Ação Necessária
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {products.map((product) => (
            <div
              key={product.id}
              className="p-4 border border-warning/20 rounded-lg bg-background/50"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h4 className="font-medium text-sm truncate">{product.name}</h4>
                  <p className="text-xs text-muted-foreground">
                    SKU: {product.sku || 'N/A'}
                  </p>
                </div>
                <Package className="h-4 w-4 text-muted-foreground flex-shrink-0 ml-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Estoque atual:</span>
                  <Badge variant="destructive" className="text-xs">
                    {product.stock_quantity}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-muted-foreground">Mínimo:</span>
                  <span>{product.min_stock_level}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-border">
                <Dialog>
                  <DialogTrigger asChild>
                    <Button 
                      size="sm" 
                      className="w-full"
                      variant="outline"
                    >
                      <Zap className="h-3 w-3 mr-1" />
                      Atualizar Estoque
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                      <DialogTitle>Atualizar Estoque</DialogTitle>
                      <DialogDescription>
                        {product.name}
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <Label className="text-xs text-muted-foreground">Estoque atual</Label>
                          <p className="font-medium">{product.stock_quantity} unidades</p>
                        </div>
                        <div>
                          <Label className="text-xs text-muted-foreground">Mínimo recomendado</Label>
                          <p className="font-medium">{product.min_stock_level} unidades</p>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor={`stock-${product.id}`}>Nova quantidade</Label>
                        <div className="flex gap-2">
                          <Input
                            id={`stock-${product.id}`}
                            type="number"
                            min="0"
                            placeholder="Digite a nova quantidade..."
                            value={stockValues[product.id] || ''}
                            onChange={(e) => handleSetStockValue(product.id, e.target.value)}
                          />
                          <Button
                            onClick={() => handleQuickStockUpdate(product.id, product.stock_quantity)}
                            disabled={updatingStock[product.id] || !stockValues[product.id]}
                          >
                            {updatingStock[product.id] ? (
                              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            ) : (
                              'Salvar'
                            )}
                          </Button>
                        </div>
                      </div>

                      <div className="text-xs text-muted-foreground bg-muted/50 p-3 rounded">
                        <strong>Dica:</strong> Mantenha sempre um estoque acima do nível mínimo para evitar rupturas de estoque e garantir a disponibilidade para seus clientes.
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default StockAlert;