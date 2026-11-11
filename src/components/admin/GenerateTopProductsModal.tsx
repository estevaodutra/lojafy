import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Trophy, TrendingUp, Sparkles, AlertCircle, RefreshCw, CheckCircle2 } from 'lucide-react';
import {
  fetchTopSellingProducts,
  applyTopProductsToFeature,
  TopProductCandidate,
} from '@/services/topProductsService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface GenerateTopProductsModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  featureName?: string;
  onSuccess?: () => void;
}

export const GenerateTopProductsModal: React.FC<GenerateTopProductsModalProps> = ({
  isOpen,
  onClose,
  featureId,
  featureName = 'Top Produtos',
  onSuccess,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [topCount, setTopCount] = useState<number>(10);
  const [period, setPeriod] = useState<'7d' | 'all'>('7d');
  const [mode, setMode] = useState<'replace' | 'merge'>('replace');
  const [candidates, setCandidates] = useState<TopProductCandidate[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isApplying, setIsApplying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadCandidates(topCount, period);
    } else {
      setCandidates([]);
    }
  }, [isOpen, topCount, period]);

  const loadCandidates = async (count: number, selectedPeriod: '7d' | 'all') => {
    setIsLoading(true);
    try {
      const days = selectedPeriod === '7d' ? 7 : undefined;
      const data = await fetchTopSellingProducts(count, days);
      setCandidates(data);
    } catch (error: any) {
      toast({
        title: 'Erro ao analisar pedidos',
        description: error.message || 'Não foi possível calcular os mais vendidos.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = async () => {
    if (candidates.length === 0) {
      toast({
        title: 'Nenhum produto encontrado',
        description: 'Não há produtos disponíveis para gerar o ranking.',
        variant: 'destructive',
      });
      return;
    }

    setIsApplying(true);
    try {
      const { inserted } = await applyTopProductsToFeature({
        featureId,
        products: candidates.map((c) => ({ id: c.id })),
        mode,
      });

      queryClient.invalidateQueries({ queryKey: ['feature-products', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['top-products-real'] });

      toast({
        title: 'Ranking gerado com sucesso!',
        description: `${inserted} produtos ordenados no Top ${topCount} com base no processamento de pedidos.`,
      });

      if (onSuccess) onSuccess();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Falha ao aplicar produtos',
        description: error.message || 'Ocorreu um erro ao salvar o ranking.',
        variant: 'destructive',
      });
    } finally {
      setIsApplying(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[88vh] flex flex-col p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600">
              <Trophy className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-lg">Gerar Ranking por Vendas</DialogTitle>
              <DialogDescription className="text-xs">
                Métrica baseada nos pedidos processados (itens com maior quantidade vendida).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Seleção do Top N */}
        <div className="space-y-3 pt-2">
          <div>
            <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block mb-1.5">
              Quantidade de Produtos no Ranking
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 10, 20].map((num) => (
                <Button
                  key={num}
                  type="button"
                  variant={topCount === num ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setTopCount(num)}
                  className="flex items-center justify-center gap-2 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Top {num}
                </Button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 pt-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Período de Vendas:</span>
              <div className="flex gap-1">
                <Button
                  type="button"
                  size="sm"
                  variant={period === '7d' ? 'secondary' : 'ghost'}
                  onClick={() => setPeriod('7d')}
                  className="h-7 text-xs px-2.5"
                >
                  Últimos 7 dias (Semanal)
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={period === 'all' ? 'secondary' : 'ghost'}
                  onClick={() => setPeriod('all')}
                  className="h-7 text-xs px-2.5"
                >
                  Todo o Período
                </Button>
              </div>
            </div>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => loadCandidates(topCount, period)}
              disabled={isLoading}
              className="h-7 text-xs text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
              Recalcular
            </Button>
          </div>
        </div>

        {/* Prévia dos produtos calculados */}
        <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[180px] max-h-[290px] border rounded-lg p-2 bg-muted/20">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center h-44 gap-2 text-muted-foreground">
              <RefreshCw className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs">Processando vendas e calculando ranking...</p>
            </div>
          ) : candidates.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-44 text-muted-foreground text-center p-4">
              <AlertCircle className="w-8 h-8 opacity-40 mb-2" />
              <p className="text-xs font-medium">Nenhum pedido processado encontrado no período.</p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Cadastre ou processe pedidos ou tente "Todo o Período" para ver o histórico.
              </p>
            </div>
          ) : (
            candidates.map((product, index) => (
              <div
                key={product.id}
                className="flex items-center gap-3 p-2 rounded-md bg-background border border-border/70 hover:border-primary/40 transition-colors"
              >
                <Badge
                  variant={index < 3 ? 'default' : 'outline'}
                  className={`min-w-[28px] justify-center text-xs font-bold ${
                    index === 0
                      ? 'bg-amber-500 hover:bg-amber-600 text-white'
                      : index === 1
                      ? 'bg-slate-400 hover:bg-slate-500 text-white'
                      : index === 2
                      ? 'bg-amber-700 hover:bg-amber-800 text-white'
                      : ''
                  }`}
                >
                  #{index + 1}
                </Badge>

                {product.image_url ? (
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-9 h-9 rounded object-cover border"
                  />
                ) : (
                  <div className="w-9 h-9 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border">
                    Sem foto
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate leading-tight">{product.name}</p>
                  <p className="text-[11px] text-muted-foreground">
                    SKU: {product.sku || 'N/A'} • {formatPrice(product.price)}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <Badge variant="secondary" className="text-[10px] font-medium bg-emerald-50 text-emerald-700 border-emerald-200">
                    <TrendingUp className="w-2.5 h-2.5 mr-1" />
                    {product.total_sales_quantity} un. vendidas
                  </Badge>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Opção de substituição ou mesclagem */}
        <div className="pt-2 border-t mt-2">
          <RadioGroup
            value={mode}
            onValueChange={(val: 'replace' | 'merge') => setMode(val)}
            className="flex items-center gap-6"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="replace" id="replace-mode" />
              <Label htmlFor="replace-mode" className="text-xs cursor-pointer font-medium">
                Substituir lista atual pelo Top {topCount}
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="merge" id="merge-mode" />
              <Label htmlFor="merge-mode" className="text-xs cursor-pointer text-muted-foreground">
                Manter manuais e adicionar novos
              </Label>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between pt-3 border-t">
          <span className="text-xs text-muted-foreground">
            {candidates.length} produto(s) pronto(s) para vincular
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClose} disabled={isApplying}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleApply}
              disabled={isApplying || candidates.length === 0}
              className="gap-1.5"
            >
              {isApplying ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  Aplicando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aplicar ao Ranking
                </>
              )}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
