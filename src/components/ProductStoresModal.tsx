import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Store, ExternalLink } from "lucide-react";
import { ProductStore } from "@/hooks/useProductStores";

interface ProductStoresModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  stores: ProductStore[];
  productName: string;
  isLoading?: boolean;
}

export const ProductStoresModal = ({ 
  open, 
  onOpenChange, 
  stores, 
  productName, 
  isLoading = false 
}: ProductStoresModalProps) => {
  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  const getDisplayPrice = (store: ProductStore) => {
    return store.custom_price || store.original_price;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Store className="h-5 w-5" />
            Ver em outras lojas
          </DialogTitle>
          <p className="text-sm text-muted-foreground">
            {productName} está disponível nas seguintes lojas:
          </p>
        </DialogHeader>

        <div className="space-y-3 max-h-[400px] overflow-y-auto">
          {isLoading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 bg-muted rounded-lg"></div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted rounded w-20"></div>
                        <div className="h-3 bg-muted rounded w-16"></div>
                      </div>
                    </div>
                    <div className="h-8 bg-muted rounded w-16"></div>
                  </div>
                </div>
              ))}
            </div>
          ) : stores.length > 0 ? (
            stores.map((store) => (
              <div 
                key={store.id}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div 
                    className="w-12 h-12 rounded-lg flex items-center justify-center text-white font-bold"
                    style={{ backgroundColor: store.primary_color }}
                  >
                    {store.logo_url ? (
                      <img 
                        src={store.logo_url} 
                        alt={store.store_name}
                        className="w-full h-full object-cover rounded-lg"
                      />
                    ) : (
                      <Store className="h-6 w-6" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium">{store.store_name}</p>
                    <p className="text-lg font-bold text-primary">
                      {formatPrice(getDisplayPrice(store))}
                    </p>
                  </div>
                </div>
                
                <Button 
                  size="sm" 
                  variant="outline"
                  asChild
                  className="h-8"
                >
                  <a 
                    href={`/loja/${store.store_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1"
                  >
                    <span className="text-xs">Visitar</span>
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </Button>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Store className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">
                Este produto não está disponível em outras lojas no momento.
              </p>
            </div>
          )}
        </div>

        {stores.length > 0 && (
          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-xs text-muted-foreground">
              {stores.length} {stores.length === 1 ? 'loja encontrada' : 'lojas encontradas'}
            </p>
            <Badge variant="secondary" className="text-xs">
              Ordenado por preço
            </Badge>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};