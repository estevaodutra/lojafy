import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Search,
  PlusCircle,
  PackagePlus,
  Link,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { createAndLinkManualProduct } from '@/services/topProductsService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';

interface Product {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string | null;
  active?: boolean;
}

interface AddProductsToFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureId: string;
  existingProductIds: string[];
  onAdd: (productIds: string[]) => void;
  limite?: number | null;
  currentCount: number;
}

export const AddProductsToFeatureModal: React.FC<AddProductsToFeatureModalProps> = ({
  isOpen,
  onClose,
  featureId,
  existingProductIds,
  onAdd,
  limite,
  currentCount,
}) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<'search' | 'manual'>('search');

  // Search tab state
  const [search, setSearch] = useState('');
  const [results, setResults] = useState<Product[]>([]);
  const [selected, setSelected] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Manual product tab state
  const [manualName, setManualName] = useState('');
  const [manualSku, setManualSku] = useState('');
  const [manualPrice, setManualPrice] = useState('');
  const [manualCostPrice, setManualCostPrice] = useState('');
  const [manualImageUrl, setManualImageUrl] = useState('');
  const [manualReferenceLink, setManualReferenceLink] = useState('');
  const [manualPosition, setManualPosition] = useState<'start' | 'end'>('end');
  const [isSubmittingManual, setIsSubmittingManual] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setSearch('');
      setResults([]);
      setSelected([]);
      resetManualForm();
      setActiveTab('search');
      return;
    }
    const timer = setTimeout(() => fetchProducts(), 300);
    return () => clearTimeout(timer);
  }, [search, isOpen]);

  const resetManualForm = () => {
    setManualName('');
    setManualSku('');
    setManualPrice('');
    setManualCostPrice('');
    setManualImageUrl('');
    setManualReferenceLink('');
    setManualPosition('end');
  };

  const generateAutoSku = () => {
    const randomDigits = Math.floor(1000 + Math.random() * 9000);
    setManualSku(`LJF-TOP-${randomDigits}`);
  };

  const fetchProducts = async () => {
    setLoading(true);
    // Permite buscar todos os produtos (inclusive inativos ou de outras contas)
    let query = supabase
      .from('products')
      .select('id, name, sku, price, image_url, active')
      .order('name')
      .limit(30);

    if (existingProductIds.length > 0) {
      query = query.not('id', 'in', `(${existingProductIds.join(',')})`);
    }

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`);
    }

    const { data } = await query;
    setResults(data || []);
    setLoading(false);
  };

  const toggleSelect = (id: string) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const maxCanAdd = limite ? limite - currentCount : Infinity;

  const handleAddSelected = () => {
    onAdd(selected);
    onClose();
  };

  const handleCreateManualProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!manualName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe o nome do produto.',
        variant: 'destructive',
      });
      return;
    }

    const priceNum = parseFloat(manualPrice.replace(',', '.'));
    if (isNaN(priceNum) || priceNum <= 0) {
      toast({
        title: 'Preço inválido',
        description: 'Informe um preço de venda válido maior que zero.',
        variant: 'destructive',
      });
      return;
    }

    const costNum = manualCostPrice
      ? parseFloat(manualCostPrice.replace(',', '.'))
      : null;

    setIsSubmittingManual(true);
    try {
      await createAndLinkManualProduct({
        featureId,
        productData: {
          name: manualName,
          sku: manualSku,
          price: priceNum,
          cost_price: costNum,
          image_url: manualImageUrl,
          reference_link: manualReferenceLink,
        },
        position: manualPosition,
      });

      queryClient.invalidateQueries({ queryKey: ['feature-products', featureId] });
      queryClient.invalidateQueries({ queryKey: ['features'] });

      toast({
        title: 'Produto vinculado com sucesso!',
        description: `"${manualName}" foi cadastrado e posicionado no ranking.`,
      });

      resetManualForm();
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao cadastrar produto',
        description: error.message || 'Falha ao vincular o produto manual.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmittingManual(false);
    }
  };

  const formatPrice = (price: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(price);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-primary" />
            Vincular Produtos ao Ranking
          </DialogTitle>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(v) => setActiveTab(v as 'search' | 'manual')}
          className="flex-1 flex flex-col min-h-0"
        >
          <TabsList className="grid grid-cols-2 w-full mb-3">
            <TabsTrigger value="search" className="flex items-center gap-1.5 text-xs">
              <Search className="w-3.5 h-3.5" />
              Buscar no Catálogo
            </TabsTrigger>
            <TabsTrigger value="manual" className="flex items-center gap-1.5 text-xs">
              <PlusCircle className="w-3.5 h-3.5" />
              Cadastrar / Vincular Manual
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: BUSCAR NO CATÁLOGO */}
          <TabsContent value="search" className="flex-1 flex flex-col min-h-0 space-y-3 mt-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, SKU ou código..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 text-xs h-9"
              />
            </div>

            <div className="flex-1 overflow-y-auto space-y-1.5 min-h-[180px] max-h-[320px] border rounded-lg p-2 bg-muted/20">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <RefreshCw className="animate-spin h-5 w-5 text-primary" />
                </div>
              ) : results.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <p className="text-xs">Nenhum produto encontrado no catálogo.</p>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-xs mt-1 text-primary"
                    onClick={() => setActiveTab('manual')}
                  >
                    + Cadastrar produto manualmente
                  </Button>
                </div>
              ) : (
                results.map((product) => {
                  const isSelected = selected.includes(product.id);
                  const disabled = !isSelected && selected.length >= maxCanAdd;
                  return (
                    <div
                      key={product.id}
                      className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                        isSelected
                          ? 'border-primary bg-primary/5'
                          : 'border-border bg-background hover:bg-muted/50'
                      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={() => !disabled && toggleSelect(product.id)}
                    >
                      <Checkbox checked={isSelected} disabled={disabled} />
                      {product.image_url ? (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-10 h-10 rounded object-cover border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground border">
                          Sem foto
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{product.name}</p>
                        <p className="text-[11px] text-muted-foreground">
                          SKU: {product.sku || 'N/A'} | {formatPrice(product.price)}
                        </p>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            <DialogFooter className="flex items-center justify-between sm:justify-between pt-2 border-t">
              <span className="text-xs text-muted-foreground">
                {selected.length} selecionado(s)
                {limite && ` • Limite restante: ${limite - currentCount}`}
              </span>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={onClose}>
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  onClick={handleAddSelected}
                  disabled={selected.length === 0}
                >
                  Adicionar ({selected.length})
                </Button>
              </div>
            </DialogFooter>
          </TabsContent>

          {/* TAB 2: CADASTRAR PRODUTO MANUAL (ESCALADO EM OUTRA CONTA) */}
          <TabsContent value="manual" className="flex-1 overflow-y-auto pr-1 space-y-3 mt-0">
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-xs text-amber-900 dark:text-amber-200">
              <p className="font-semibold flex items-center gap-1 mb-0.5">
                <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                Produto Escalado em Outra Conta / Marketplace
              </p>
              <p className="text-[11px] opacity-90 leading-tight">
                Utilize esta opção para incluir produtos que estão performando em outra conta ou fornecedor e não aparecem na listagem padrão.
              </p>
            </div>

            <form onSubmit={handleCreateManualProduct} className="space-y-3">
              <div>
                <Label className="text-xs font-semibold">Nome do Produto *</Label>
                <Input
                  placeholder="Ex: Mascara Facial Térmica Quente e Fria Relaxante"
                  value={manualName}
                  onChange={(e) => setManualName(e.target.value)}
                  className="h-8 text-xs mt-1"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-semibold">SKU / Código</Label>
                    <button
                      type="button"
                      onClick={generateAutoSku}
                      className="text-[10px] text-primary hover:underline"
                    >
                      Gerar Auto
                    </button>
                  </div>
                  <Input
                    placeholder="Ex: LJFADM000220"
                    value={manualSku}
                    onChange={(e) => setManualSku(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Posição no Ranking</Label>
                  <Select
                    value={manualPosition}
                    onValueChange={(v: 'start' | 'end') => setManualPosition(v)}
                  >
                    <SelectTrigger className="h-8 text-xs mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="end">No final da lista</SelectItem>
                      <SelectItem value="start">No topo (#1 Lugar)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs font-semibold">Preço de Venda (R$) *</Label>
                  <Input
                    placeholder="Ex: 28,90"
                    value={manualPrice}
                    onChange={(e) => setManualPrice(e.target.value)}
                    className="h-8 text-xs mt-1"
                    required
                  />
                </div>

                <div>
                  <Label className="text-xs font-semibold">Preço de Custo (R$) (Opcional)</Label>
                  <Input
                    placeholder="Ex: 14,50"
                    value={manualCostPrice}
                    onChange={(e) => setManualCostPrice(e.target.value)}
                    className="h-8 text-xs mt-1"
                  />
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold">URL da Imagem do Produto</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    placeholder="https://exemplo.com/foto-produto.jpg"
                    value={manualImageUrl}
                    onChange={(e) => setManualImageUrl(e.target.value)}
                    className="h-8 text-xs flex-1"
                  />
                  {manualImageUrl ? (
                    <img
                      src={manualImageUrl}
                      alt="Preview"
                      className="w-8 h-8 rounded object-cover border flex-shrink-0"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-8 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground flex-shrink-0 border">
                      <ImageIcon className="w-3.5 h-3.5" />
                    </div>
                  )}
                </div>
              </div>

              <div>
                <Label className="text-xs font-semibold flex items-center gap-1">
                  <Link className="w-3 h-3 text-muted-foreground" />
                  Link de Referência (Mercado Livre / Shopee)
                </Label>
                <Input
                  placeholder="https://produto.mercadolivre.com.br/MLB-..."
                  value={manualReferenceLink}
                  onChange={(e) => setManualReferenceLink(e.target.value)}
                  className="h-8 text-xs mt-1"
                />
              </div>

              <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onClose}
                  disabled={isSubmittingManual}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={isSubmittingManual}
                  className="gap-1.5"
                >
                  {isSubmittingManual ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      Cadastrando...
                    </>
                  ) : (
                    <>
                      <PlusCircle className="w-3.5 h-3.5" />
                      Cadastrar e Vincular
                    </>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
};
