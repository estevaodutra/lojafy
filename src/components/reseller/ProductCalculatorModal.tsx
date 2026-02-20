import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator, TrendingUp, TrendingDown, AlertTriangle } from 'lucide-react';
import { CatalogProduct } from '@/hooks/useResellerCatalog';

const TAXAS_ML = {
  classico: 0.14,
  premium: 0.19,
} as const;

type TipoAnuncio = keyof typeof TAXAS_ML;

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
  const [tipoAnuncio, setTipoAnuncio] = useState<TipoAnuncio>('classico');

  useEffect(() => {
    if (product && isOpen) {
      const suggestedPrice = product.original_price || product.price;
      setCustomPrice(suggestedPrice.toString());
    }
  }, [product, isOpen]);

  if (!product) return null;

  const costPrice = product.cost_price || 0;
  const currentPrice = parseFloat(customPrice) || 0;
  const marginPercent = parseFloat(desiredMargin) || 0;
  const taxaML = TAXAS_ML[tipoAnuncio];

  // Cálculos com taxa ML
  const valorTaxa = currentPrice * taxaML;
  const lucroReal = currentPrice - costPrice - valorTaxa;
  const margemReal = currentPrice > 0 ? (lucroReal / currentPrice) * 100 : 0;

  const calcularPrecoMinimo = (margem: number): number => {
    const divisor = 1 - taxaML - margem / 100;
    if (divisor <= 0) return Infinity;
    return costPrice / divisor;
  };

  const precoMinimo = calcularPrecoMinimo(marginPercent);

  const handleCalculateFromMargin = () => {
    if (isFinite(precoMinimo) && precoMinimo > 0) {
      setCustomPrice((Math.ceil(precoMinimo * 100) / 100).toFixed(2));
    }
  };

  const handleAddToStore = () => {
    if (currentPrice > 0) {
      onAddToStore(product.id, currentPrice);
      onClose();
    }
  };

  const getStatus = () => {
    if (lucroReal < 0) return { label: '❌ Prejuízo', color: 'text-red-600' };
    if (margemReal < 10) return { label: '⚠️ Margem baixa', color: 'text-red-600' };
    if (margemReal < 20) return { label: '✅ Margem OK', color: 'text-yellow-600' };
    return { label: '🚀 Margem ótima', color: 'text-green-600' };
  };

  const status = getStatus();
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
  const margensRef = [10, 15, 20, 25, 30, 35, 40];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Calculadora de Margem
          </DialogTitle>
          <DialogDescription>
            Configure o preço ideal para {product.name}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5">
          {/* Produto */}
          <div className="flex gap-4 p-4 bg-muted/30 rounded-lg">
            <div className="w-20 h-20 bg-muted rounded-lg flex-shrink-0 overflow-hidden">
              {product.main_image_url ? (
                <img src={product.main_image_url} alt={product.name} className="w-full h-full object-cover" />
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
                  <p className="font-medium text-lg">{fmt(costPrice)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-muted-foreground">Preço Sugerido:</p>
                  <p className="font-medium text-lg">{fmt(product.price)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Tipo de Anúncio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Tipo de Anúncio (Mercado Livre)</Label>
            <Select value={tipoAnuncio} onValueChange={(v) => setTipoAnuncio(v as TipoAnuncio)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="classico">Clássico — Taxa 14%</SelectItem>
                <SelectItem value="premium">Premium — Taxa 19%</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Calculadora */}
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="custom-price" className="text-sm font-medium">Preço de Venda</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">R$</span>
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
                <Label htmlFor="desired-margin" className="text-sm font-medium">Margem Desejada</Label>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <Input
                      id="desired-margin"
                      type="number"
                      step="1"
                      min="0"
                      max="80"
                      value={desiredMargin}
                      onChange={(e) => setDesiredMargin(e.target.value)}
                      placeholder="0"
                      className="pr-8"
                    />
                    <span className="absolute right-3 top-1/2 transform -translate-y-1/2 text-sm text-muted-foreground">%</span>
                  </div>
                  <Button type="button" variant="outline" onClick={handleCalculateFromMargin} className="px-4">
                    Calcular
                  </Button>
                </div>
                {isFinite(precoMinimo) && precoMinimo > 0 && (
                  <p className="text-xs text-muted-foreground">
                    Preço mínimo para {marginPercent}%: {fmt(precoMinimo)}
                  </p>
                )}
              </div>
            </div>

            {/* Resultado */}
            <div className="p-4 bg-gradient-to-br from-primary/5 to-primary/10 rounded-lg border space-y-3">
              <h4 className="font-semibold flex items-center gap-2">💰 Resultado</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between p-1.5 bg-background/50 rounded">
                  <span className="text-muted-foreground">Taxa ML ({(taxaML * 100).toFixed(0)}%):</span>
                  <span className="font-medium text-red-500">- {fmt(valorTaxa)}</span>
                </div>
                <div className="flex justify-between p-1.5 bg-background/50 rounded">
                  <span className="text-muted-foreground">Custo:</span>
                  <span className="font-medium">- {fmt(costPrice)}</span>
                </div>
                <div className="border-t my-1" />
                <div className="flex justify-between p-1.5 bg-background/50 rounded">
                  <span className="text-muted-foreground">Lucro:</span>
                  <span className={`font-bold text-lg ${lucroReal >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {fmt(lucroReal)}
                  </span>
                </div>
                <div className="flex justify-between p-1.5 bg-background/50 rounded">
                  <span className="text-muted-foreground">Margem:</span>
                  <span className={`font-bold text-lg ${status.color}`}>
                    {margemReal.toFixed(1)}%
                  </span>
                </div>
                <div className="text-xs text-center pt-1 border-t">
                  <span className={status.color}>{status.label}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabela de Referência */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Tabela de Referência ({tipoAnuncio === 'classico' ? 'Clássico 14%' : 'Premium 19%'})</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="h-8 text-xs">Margem</TableHead>
                  <TableHead className="h-8 text-xs">Preço Mín.</TableHead>
                  <TableHead className="h-8 text-xs">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {margensRef.map((m) => {
                  const pm = calcularPrecoMinimo(m);
                  const lucro = isFinite(pm) ? pm - costPrice - pm * taxaML : 0;
                  return (
                    <TableRow key={m} className="text-xs">
                      <TableCell className="py-1.5">{m}%</TableCell>
                      <TableCell className="py-1.5">{isFinite(pm) ? fmt(pm) : '—'}</TableCell>
                      <TableCell className="py-1.5">{isFinite(pm) ? fmt(lucro) : '—'}</TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleAddToStore} disabled={!currentPrice || currentPrice <= 0} className="flex-1">
              {product.isInMyStore ? 'Atualizar Preço' : 'Adicionar à Loja'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
