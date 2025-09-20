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
          {/* Product Info */}
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-4">
                {product.main_image_url && (
                  <img 
                    src={product.main_image_url} 
                    alt={product.name}
                    className="h-16 w-16 object-cover rounded-lg"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm truncate">{product.name}</h3>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {product.high_rotation && (
                      <Badge variant="secondary" className="text-xs">Alto Giro</Badge>
                    )}
                    <Badge variant="outline" className="text-xs">
                      Custo: R$ {costPrice.toFixed(2)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Price Calculator */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customPrice">Preço de Venda (R$)</Label>
              <Input
                id="customPrice"
                type="number"
                step="0.01"
                value={customPrice}
                onChange={(e) => setCustomPrice(e.target.value)}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="desiredMargin">Margem Desejada (%)</Label>
              <div className="flex gap-2">
                <Input
                  id="desiredMargin"
                  type="number"
                  step="1"
                  value={desiredMargin}
                  onChange={(e) => setDesiredMargin(e.target.value)}
                  placeholder="30"
                />
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCalculateFromMargin}
                  disabled={!costPrice}
                >
                  <Calculator className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Results */}
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                    <DollarSign className="h-4 w-4" />
                    Lucro
                  </div>
                  <p className="text-lg font-bold text-green-600">
                    R$ {Math.max(0, currentPrice - costPrice).toFixed(2)}
                  </p>
                </div>
                <div>
                  <div className="flex items-center justify-center gap-1 text-sm font-medium text-muted-foreground">
                    <TrendingUp className="h-4 w-4" />
                    Margem
                  </div>
                  <p className={`text-lg font-bold ${getMarginColor(currentMargin)}`}>
                    {currentMargin.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <div className="text-sm font-medium text-muted-foreground">
                    Sugerido
                  </div>
                  <p className="text-lg font-bold text-blue-600">
                    R$ {(product.original_price || product.price).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

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