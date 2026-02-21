import React, { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calculator } from 'lucide-react';
import { CatalogProduct } from '@/hooks/useResellerCatalog';

const TAXAS_ML = { classico: 0.14, premium: 0.19 } as const;
const MARGENS_REF = [10, 15, 20, 25, 30, 35, 40];

interface ProductCalculatorModalProps {
  product: CatalogProduct | null;
  isOpen: boolean;
  onClose: () => void;
  onAddToStore: (productId: string, customPrice: number) => void;
}

type TipoAnuncio = 'classico' | 'premium';

interface PrecoSelecionado {
  preco: number;
  tipo: TipoAnuncio;
  margem: number;
}

export const ProductCalculatorModal: React.FC<ProductCalculatorModalProps> = ({
  product,
  isOpen,
  onClose,
  onAddToStore,
}) => {
  const [desiredMargin, setDesiredMargin] = useState<string>('30');
  const [precoSelecionado, setPrecoSelecionado] = useState<PrecoSelecionado | null>(null);

  if (!product) return null;

  const costPrice = product.price; // Preço definido pelo admin = custo do revendedor
  const suggestedPrice = costPrice * 1.30; // 30% de margem
  const marginPercent = parseFloat(desiredMargin) || 0;
  const fmt = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

  const calcularPrecoMinimo = (margem: number, taxa: number): number => {
    const divisor = 1 - taxa - margem / 100;
    if (divisor <= 0) return Infinity;
    return costPrice / divisor;
  };

  const calcularLucro = (preco: number, taxa: number): number => {
    return preco - costPrice - preco * taxa;
  };

  const handleSelectCell = (margem: number, tipo: TipoAnuncio) => {
    const taxa = TAXAS_ML[tipo];
    const preco = calcularPrecoMinimo(margem, taxa);
    if (isFinite(preco)) {
      setPrecoSelecionado({ preco: Math.ceil(preco * 100) / 100, tipo, margem });
    }
  };

  const handleAddToStore = () => {
    if (precoSelecionado) {
      onAddToStore(product.id, precoSelecionado.preco);
      onClose();
    }
  };

  const precoMinClassico = calcularPrecoMinimo(marginPercent, TAXAS_ML.classico);
  const precoMinPremium = calcularPrecoMinimo(marginPercent, TAXAS_ML.premium);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
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
                  <p className="font-medium text-lg">{fmt(suggestedPrice)}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Margem Desejada */}
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
              <Button type="button" variant="outline" className="px-4">
                Calcular
              </Button>
            </div>
            {marginPercent > 0 && (
              <p className="text-xs text-muted-foreground">
                Clássico: {isFinite(precoMinClassico) ? fmt(precoMinClassico) : '—'} | Premium: {isFinite(precoMinPremium) ? fmt(precoMinPremium) : '—'}
              </p>
            )}
          </div>

          {/* Tabela Comparativa */}
          <div className="space-y-2">
            <h4 className="text-sm font-medium text-muted-foreground">Tabela de Referência</h4>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead rowSpan={2} className="h-8 text-xs align-middle">Margem</TableHead>
                  <TableHead colSpan={2} className="h-8 text-xs text-center border-l">Clássico (14%)</TableHead>
                  <TableHead colSpan={2} className="h-8 text-xs text-center border-l">Premium (19%)</TableHead>
                </TableRow>
                <TableRow>
                  <TableHead className="h-8 text-xs border-l">Preço</TableHead>
                  <TableHead className="h-8 text-xs">Lucro</TableHead>
                  <TableHead className="h-8 text-xs border-l">Preço</TableHead>
                  <TableHead className="h-8 text-xs">Lucro</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MARGENS_REF.map((m) => {
                  const pcClass = calcularPrecoMinimo(m, TAXAS_ML.classico);
                  const lcClass = isFinite(pcClass) ? calcularLucro(pcClass, TAXAS_ML.classico) : 0;
                  const pcPrem = calcularPrecoMinimo(m, TAXAS_ML.premium);
                  const lcPrem = isFinite(pcPrem) ? calcularLucro(pcPrem, TAXAS_ML.premium) : 0;

                  const selClass = precoSelecionado?.margem === m && precoSelecionado?.tipo === 'classico';
                  const selPrem = precoSelecionado?.margem === m && precoSelecionado?.tipo === 'premium';

                  return (
                    <TableRow key={m} className="text-xs">
                      <TableCell className="py-1.5 font-medium">{m}%</TableCell>
                      <TableCell
                        className={`py-1.5 border-l cursor-pointer transition-colors hover:bg-primary/5 ${selClass ? 'bg-primary/10 ring-2 ring-primary ring-inset font-bold' : ''}`}
                        onClick={() => handleSelectCell(m, 'classico')}
                      >
                        {isFinite(pcClass) ? fmt(pcClass) : '—'}
                      </TableCell>
                      <TableCell
                        className={`py-1.5 cursor-pointer transition-colors hover:bg-primary/5 ${selClass ? 'bg-primary/10 ring-2 ring-primary ring-inset font-bold' : ''}`}
                        onClick={() => handleSelectCell(m, 'classico')}
                      >
                        {isFinite(pcClass) ? fmt(lcClass) : '—'}
                      </TableCell>
                      <TableCell
                        className={`py-1.5 border-l cursor-pointer transition-colors hover:bg-primary/5 ${selPrem ? 'bg-primary/10 ring-2 ring-primary ring-inset font-bold' : ''}`}
                        onClick={() => handleSelectCell(m, 'premium')}
                      >
                        {isFinite(pcPrem) ? fmt(pcPrem) : '—'}
                      </TableCell>
                      <TableCell
                        className={`py-1.5 cursor-pointer transition-colors hover:bg-primary/5 ${selPrem ? 'bg-primary/10 ring-2 ring-primary ring-inset font-bold' : ''}`}
                        onClick={() => handleSelectCell(m, 'premium')}
                      >
                        {isFinite(pcPrem) ? fmt(lcPrem) : '—'}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <p className="text-xs text-muted-foreground text-center">Clique em uma célula para selecionar o preço</p>
          </div>

          {/* Seleção */}
          {precoSelecionado && (
            <div className="p-3 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Selecionado:</span>
                <span className="font-bold text-primary">
                  {fmt(precoSelecionado.preco)} ({precoSelecionado.tipo === 'classico' ? 'Clássico' : 'Premium'} — {precoSelecionado.margem}%)
                </span>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Button variant="outline" onClick={onClose} className="flex-1">Cancelar</Button>
            <Button onClick={handleAddToStore} disabled={!precoSelecionado} className="flex-1">
              {product.isInMyStore ? 'Atualizar Preço' : 'Adicionar à Loja'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
