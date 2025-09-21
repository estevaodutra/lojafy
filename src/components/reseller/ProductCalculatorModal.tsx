import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, DollarSign } from 'lucide-react';
import { CatalogProduct } from '@/hooks/useResellerCatalog';

interface ProductCalculatorModalProps {
  product: CatalogProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToStore: (productId: string, customPrice: number) => void;
}

export const ProductCalculatorModal: React.FC<ProductCalculatorModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToStore,
}) => {
  const [customPrice, setCustomPrice] = useState<string>('');
  const [desiredMargin, setDesiredMargin] = useState<string>('30');

  useEffect(() => {
    if (product && isOpen) {
      // Pre-populate with suggested price or current price
      const suggestedPrice = product.original_price || product.price;
      setCustomPrice(suggestedPrice.toString());
    }
  }, [product, isOpen]);

  if (!product) return null;

  const costPrice = product.cost_price || 0;
  const currentPrice = parseFloat(customPrice) || 0;
  const marginPercent = parseFloat(desiredMargin) || 0;

  const calculateMargin = (): number => {
    if (!costPrice || costPrice === 0 || !currentPrice) return 0;
    return ((currentPrice - costPrice) / costPrice) * 100;
  };

  const calculatePriceFromMargin = (): number => {
    if (!costPrice || costPrice === 0) return 0;
    return costPrice * (1 + marginPercent / 100);
  };

  const handleCalculateFromMargin = () => {
    const calculatedPrice = calculatePriceFromMargin();
    setCustomPrice(calculatedPrice.toFixed(2));
  };

  const handleAddToStore = () => {
    if (currentPrice > 0) {
      onAddToStore(product.id, currentPrice);
      onClose();
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-600';
    if (margin >= 15) return 'text-yellow-600';
    return 'text-red-600';
  };

  const currentMargin = calculateMargin();

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Margem
          </DialogTitle>
          <DialogDescription>
            Configure o preço ideal para {product.name}
          </DialogDescription>
        </DialogHeader>

          <div className="space-y-6">
            {/* Informações do Produto */}
            <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
              <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
                {product.main_image_url ? (
                  <img 
                    src={product.main_image_url} 
                    alt={product.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-muted to-muted-foreground/20 flex items-center justify-center">
                    <span className="text-xs text-muted-foreground">Sem foto</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-base mb-3">{product.name}</h3>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Preço de Custo:</p>
                    <p className="font-medium text-lg">
                      {product.cost_price ? 
                        new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.cost_price) 
                        : 'R$ 0,00'
                      }
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-muted-foreground">Preço Sugerido:</p>
                    <p className="font-medium text-lg">
                      {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(product.price)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Calculadora */}
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="custom-price" className="text-sm font-medium">
                    Preço de Venda
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                      R$
                    </span>
                    <Input
                      id="custom-price"
                      type="number"
                      step="0.01"
                      min="0"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      placeholder="0,00"
                      className="pl-8"
                    />
                  </div>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="desired-margin" className="text-sm font-medium">
                    Margem Desejada
                  </Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="desired-margin"
                        type="number"
                        step="1"
                        min="0"
                        max="100"
                        value={desiredMargin}
                        onChange={(e) => setDesiredMargin(e.target.value)}
                        placeholder="0"
                        className="pr-8"
                      />
                      <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">
                        %
                      </span>
                    </div>
                    <Button 
                      type="button" 
                      variant="outline"
                      onClick={handleCalculateFromMargin}
                      className="px-4"
                    >
                      Calcular
                    </Button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border">
                  <h4 className="font-semibold mb-4 flex items-center gap-2">
                    💰 Resultado da Análise
                  </h4>
                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                      <span className="text-sm text-muted-foreground">Lucro:</span>
                      <span className="font-bold text-lg text-green-600">
                        {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Math.max(0, currentPrice - costPrice))}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-background/50 rounded">
                      <span className="text-sm text-muted-foreground">Margem:</span>
                      <span className={`font-bold text-lg ${getMarginColor(currentMargin)}`}>
                        {currentMargin.toFixed(1)}%
                      </span>
                    </div>
                    {currentMargin > 0 && (
                      <div className="text-xs text-muted-foreground text-center pt-2 border-t">
                        {currentMargin < 20 ? '⚠️ Margem baixa' : 
                         currentMargin < 40 ? '✅ Margem adequada' : 
                         '🚀 Margem excelente'}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleAddToStore} 
              disabled={!currentPrice || currentPrice <= 0}
              className="flex-1"
            >
              {product.isInMyStore ? 'Atualizar Preço' : 'Adicionar à Loja'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};