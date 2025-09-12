import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useCart } from '@/contexts/CartContext';

interface PriceUpdateBannerProps {
  show: boolean;
  onDismiss: () => void;
}

export const PriceUpdateBanner = ({ show, onDismiss }: PriceUpdateBannerProps) => {
  const { syncPrices, isUpdatingPrices } = useCart();
  const [isVisible, setIsVisible] = useState(show);

  if (!isVisible || !show) return null;

  const handleDismiss = () => {
    setIsVisible(false);
    onDismiss();
  };

  const handleUpdatePrices = async () => {
    await syncPrices();
    handleDismiss();
  };

  return (
    <Card className="mb-4 border-warning bg-warning/10">
      <CardContent className="p-4">
        <div className="flex items-start justify-between space-x-4">
          <div className="flex items-start space-x-3">
            <AlertTriangle className="w-5 h-5 text-warning-foreground mt-0.5" />
            <div>
              <h4 className="font-medium text-warning-foreground">
                Preços podem ter mudado
              </h4>
              <p className="text-sm text-warning-foreground/80 mt-1">
                Alguns produtos no seu carrinho podem ter preços desatualizados. 
                Recomendamos verificar os preços antes de finalizar a compra.
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleUpdatePrices}
              disabled={isUpdatingPrices}
              className="border-warning text-warning-foreground hover:bg-warning/20"
            >
              {isUpdatingPrices ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar preços
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleDismiss}
              className="text-warning-foreground hover:bg-warning/20"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};