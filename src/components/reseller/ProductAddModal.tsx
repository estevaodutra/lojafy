import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url?: string;
  stock_quantity?: number;
}

interface ProductAddModalProps {
  product: Product | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (customPrice: number, activateNow: boolean) => void;
  suggestedMargin?: number;
}

export const ProductAddModal = ({
  product,
  open,
  onOpenChange,
  onConfirm,
  suggestedMargin = 30,
}: ProductAddModalProps) => {
  const [customPrice, setCustomPrice] = useState<number>(0);
  const [activateNow, setActivateNow] = useState(true);

  if (!product) return null;

  const suggestedPrice = product.price * (1 + suggestedMargin / 100);
  const profitAmount = customPrice - product.price;
  const profitPercentage = ((profitAmount / product.price) * 100).toFixed(1);

  const handleConfirm = () => {
    onConfirm(customPrice || suggestedPrice, activateNow);
    onOpenChange(false);
    setCustomPrice(0);
    setActivateNow(true);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Adicionar produto à loja</DialogTitle>
          <DialogDescription>
            Configure o preço de venda para "{product.name}"
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {product.image_url && (
            <div className="flex justify-center">
              <img
                src={product.image_url}
                alt={product.name}
                className="w-32 h-32 object-cover rounded-lg"
              />
            </div>
          )}

          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço de custo:</span>
              <span className="font-medium">
                {product.price.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Preço sugerido (+{suggestedMargin}%):</span>
              <span className="font-medium text-green-600">
                {suggestedPrice.toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </span>
            </div>
            {product.stock_quantity !== undefined && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Estoque:</span>
                <span className="font-medium">{product.stock_quantity} unidades</span>
              </div>
            )}
          </div>

          <Separator />

          <div className="space-y-2">
            <Label htmlFor="customPrice">Seu preço de venda</Label>
            <Input
              id="customPrice"
              type="number"
              placeholder={suggestedPrice.toFixed(2)}
              value={customPrice || ""}
              onChange={(e) => setCustomPrice(Number(e.target.value))}
              min={product.price}
              step="0.01"
            />
            {customPrice > 0 && (
              <div className="text-xs space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Lucro por venda:</span>
                  <span className={profitAmount > 0 ? "text-green-600 font-medium" : "text-red-600"}>
                    {profitAmount.toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })} ({profitPercentage}%)
                  </span>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <div className="space-y-0.5">
              <Label htmlFor="activate-now">Ativar agora</Label>
              <p className="text-xs text-muted-foreground">
                Produto ficará visível na sua loja imediatamente
              </p>
            </div>
            <Switch
              id="activate-now"
              checked={activateNow}
              onCheckedChange={setActivateNow}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={handleConfirm}>
            Adicionar à Loja
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
