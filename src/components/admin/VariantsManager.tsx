import React, { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';

export interface ProductVariant {
  id: string;
  type: string;
  name: string;
  value: string;
  costPrice: number;
  priceModifier: number;
  stockQuantity: number;
  imageUrl?: string;
  active: boolean;
  sku?: string;
}

interface PlatformSettings {
  platform_fee_value: number;
  platform_fee_type: 'percentage' | 'fixed';
  gateway_fee_percentage: number;
  additional_costs?: Array<{
    id: string;
    name: string;
    value: number;
    type: 'percentage' | 'fixed';
    active: boolean;
  }>;
}

interface VariantsManagerProps {
  variants: ProductVariant[];
  onVariantsChange: (variants: ProductVariant[]) => void;
  platformSettings?: PlatformSettings | null;
  productCostPrice?: number;
  useAutoPricing?: boolean;
}

// Calculate selling price based on cost and platform fees
const calculateSellingPrice = (
  costPrice: number,
  settings?: PlatformSettings | null
): number => {
  if (!settings || !costPrice) return costPrice;

  let price = costPrice;

  // Apply platform fee
  if (settings.platform_fee_type === 'percentage') {
    price += (costPrice * settings.platform_fee_value / 100);
  } else {
    price += settings.platform_fee_value;
  }

  // Apply additional costs
  if (settings.additional_costs && Array.isArray(settings.additional_costs)) {
    settings.additional_costs.forEach(cost => {
      if (cost.active) {
        if (cost.type === 'percentage') {
          price += (costPrice * cost.value / 100);
        } else {
          price += cost.value;
        }
      }
    });
  }

  // Apply gateway fee (divide to include in final price)
  if (settings.gateway_fee_percentage > 0) {
    price = price / (1 - settings.gateway_fee_percentage / 100);
  }

  return Math.round(price * 100) / 100;
};

export interface CustomVariantType {
  id: string;
  label: string;
}

const DEFAULT_VARIANT_TYPES: CustomVariantType[] = [
  { id: 'color', label: 'Cor' },
  { id: 'size', label: 'Tamanho' },
  { id: 'model', label: 'Modelo' },
];

const LOCAL_STORAGE_KEY_VARIANTS = 'lojafy_custom_variant_types';

export const VariantsManager: React.FC<VariantsManagerProps> = ({
  variants,
  onVariantsChange,
  platformSettings,
  productCostPrice = 0,
  useAutoPricing = false
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  
  // Tipos de variação customizados salvos pelo usuário (persistidos em localStorage)
  const [customTypes, setCustomTypes] = useState<CustomVariantType[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_VARIANTS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  const [isAddTypeDialogOpen, setIsAddTypeDialogOpen] = useState(false);
  const [newTypeName, setNewTypeName] = useState('');

  const allVariantTypes = [...DEFAULT_VARIANT_TYPES, ...customTypes];

  const handleCreateCustomType = () => {
    const trimmed = newTypeName.trim();
    if (!trimmed) return;

    const slug = trimmed.toLowerCase().replace(/\s+/g, '_');
    const existing = allVariantTypes.find(t => t.id === slug || t.label.toLowerCase() === trimmed.toLowerCase());
    
    if (existing) {
      setNewVariant(prev => ({ ...prev, type: existing.id }));
      setNewTypeName('');
      setIsAddTypeDialogOpen(false);
      return;
    }

    const newTypeObj: CustomVariantType = { id: slug, label: trimmed };
    const updatedCustom = [...customTypes, newTypeObj];
    setCustomTypes(updatedCustom);

    try {
      localStorage.setItem(LOCAL_STORAGE_KEY_VARIANTS, JSON.stringify(updatedCustom));
    } catch (e) {
      console.warn('Erro ao salvar tipo no localStorage:', e);
    }

    setNewVariant(prev => ({ ...prev, type: slug }));
    setNewTypeName('');
    setIsAddTypeDialogOpen(false);
  };

  const getVariantTypeLabel = (typeId: string): string => {
    const found = allVariantTypes.find(t => t.id === typeId || t.label.toLowerCase() === typeId.toLowerCase());
    return found ? found.label : (typeId.charAt(0).toUpperCase() + typeId.slice(1));
  };

  const [newVariant, setNewVariant] = useState<Partial<ProductVariant>>({
    type: 'color',
    name: '',
    value: '',
    costPrice: 0,
    priceModifier: 0,
    stockQuantity: 0,
    imageUrl: '',
    active: true
  });
  const [isAddingNew, setIsAddingNew] = useState(false);
  const prevCostPriceRef = useRef(productCostPrice);

  // Sync all variant costs when product cost price changes and auto pricing is active
  useEffect(() => {
    if (useAutoPricing && variants.length > 0 && productCostPrice !== prevCostPriceRef.current) {
      prevCostPriceRef.current = productCostPrice;
      const updatedVariants = variants.map(variant => ({
        ...variant,
        costPrice: productCostPrice,
        priceModifier: calculateSellingPrice(productCostPrice, platformSettings)
      }));
      onVariantsChange(updatedVariants);
    }
  }, [productCostPrice, useAutoPricing, platformSettings]);

  const variantTypeLabels = {
    color: 'Cor',
    size: 'Tamanho',
    model: 'Modelo'
  };

  const addVariant = () => {
    if (!newVariant.name || !newVariant.value) return;

    const costPrice = useAutoPricing ? productCostPrice : (newVariant.costPrice || 0);
    const sellingPrice = calculateSellingPrice(costPrice, platformSettings);

    const variant: ProductVariant = {
      id: `variant-${Date.now()}`,
      type: newVariant.type as 'color' | 'size' | 'model',
      name: newVariant.name,
      value: newVariant.value,
      costPrice: costPrice,
      priceModifier: sellingPrice,
      stockQuantity: newVariant.stockQuantity || 0,
      imageUrl: newVariant.imageUrl || '',
      active: newVariant.active !== false
    };

    onVariantsChange([...variants, variant]);
    
    // Reset form
    setNewVariant({
      type: 'color',
      name: '',
      value: '',
      costPrice: 0,
      priceModifier: 0,
      stockQuantity: 0,
      imageUrl: '',
      active: true
    });
    setIsAddingNew(false);
  };

  const updateVariant = (id: string, updates: Partial<ProductVariant>) => {
    const updatedVariants = variants.map(variant => {
      if (variant.id !== id) return variant;
      
      const updated = { ...variant, ...updates };
      
      // Recalculate selling price if costPrice changed
      if ('costPrice' in updates) {
        updated.priceModifier = calculateSellingPrice(updated.costPrice, platformSettings);
      }
      
      return updated;
    });
    onVariantsChange(updatedVariants);
  };

  const removeVariant = (id: string) => {
    onVariantsChange(variants.filter(variant => variant.id !== id));
  };

  const formatCurrency = (value: number) => {
    return `R$ ${value.toFixed(2)}`;
  };

  // Calculate selling price preview for new variant form
  const newVariantSellingPrice = calculateSellingPrice(newVariant.costPrice || 0, platformSettings);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-medium">Variações do Produto</h3>
          <p className="text-sm text-muted-foreground">
            Adicione variações como cor, tamanho ou modelo com preços e estoque específicos
          </p>
        </div>
        <Button 
          onClick={() => setIsAddingNew(true)} 
          size="sm"
          disabled={isAddingNew}
        >
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Variação
        </Button>
      </div>

      {/* Add new variant form */}
      {isAddingNew && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Nova Variação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Tipo</Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-5 px-1.5 text-[11px] text-primary hover:text-primary/80"
                    onClick={() => setIsAddTypeDialogOpen(true)}
                  >
                    <Plus className="h-3 w-3 mr-1" />
                    Novo Tipo
                  </Button>
                </div>
                <Select
                  value={newVariant.type}
                  onValueChange={(value) => {
                    if (value === '__add_new_type__') {
                      setIsAddTypeDialogOpen(true);
                    } else {
                      setNewVariant({ ...newVariant, type: value });
                    }
                  }}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allVariantTypes.map(vt => (
                      <SelectItem key={vt.id} value={vt.id}>{vt.label}</SelectItem>
                    ))}
                    <SelectItem value="__add_new_type__" className="text-primary font-medium border-t mt-1">
                      + Criar novo tipo...
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Nome da Variação</Label>
                <Input
                  placeholder="Ex: Azul, M, Pro"
                  value={newVariant.name}
                  onChange={(e) => setNewVariant({ ...newVariant, name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>Valor/Código</Label>
                <Input
                  placeholder="Ex: #0066CC, M, PRO-001"
                  value={newVariant.value}
                  onChange={(e) => setNewVariant({ ...newVariant, value: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {!useAutoPricing && (
                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={newVariant.costPrice || ''}
                    onChange={(e) => setNewVariant({ ...newVariant, costPrice: parseFloat(e.target.value) || 0 })}
                  />
                  {platformSettings && (newVariant.costPrice || 0) > 0 && (
                    <div className="flex items-center gap-1 text-xs text-green-600">
                      <Calculator className="h-3 w-3" />
                      Preço de venda: {formatCurrency(newVariantSellingPrice)}
                    </div>
                  )}
                </div>
              )}
              {useAutoPricing && (
                <div className="space-y-2">
                  <Label>Preço de Custo (R$)</Label>
                  <Input
                    type="number"
                    value={productCostPrice}
                    readOnly
                    className="bg-muted cursor-not-allowed"
                  />
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <Calculator className="h-3 w-3" />
                    Herdado do produto - Venda: {formatCurrency(calculateSellingPrice(productCostPrice, platformSettings))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Estoque</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={newVariant.stockQuantity}
                  onChange={(e) => setNewVariant({ ...newVariant, stockQuantity: parseInt(e.target.value) || 0 })}
                />
              </div>

              <div className="space-y-2">
                <Label>SKU da Variante</Label>
                <Input
                  placeholder="Ex: LJF-FN-000001-AZ"
                  value={newVariant.sku || ''}
                  onChange={(e) => setNewVariant({ ...newVariant, sku: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label>URL da Imagem (opcional)</Label>
                <Input
                  placeholder="https://..."
                  value={newVariant.imageUrl}
                  onChange={(e) => setNewVariant({ ...newVariant, imageUrl: e.target.value })}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  checked={newVariant.active !== false}
                  onCheckedChange={(checked) => setNewVariant({ ...newVariant, active: checked })}
                />
                <Label>Ativo</Label>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsAddingNew(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancelar
                </Button>
                <Button onClick={addVariant} disabled={!newVariant.name || !newVariant.value}>
                  <Check className="h-4 w-4 mr-2" />
                  Adicionar
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Variants list */}
      {variants.length > 0 ? (
        <div className="space-y-3">
          <h4 className="text-sm font-medium">Variações Cadastradas ({variants.length})</h4>
          
          <div className="grid gap-3">
            {variants.map((variant) => (
              <Card key={variant.id} className="border">
                <CardContent className="p-4">
                  {editingId === variant.id ? (
                    // Edit mode
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Tipo</Label>
                          <Select
                            value={variant.type}
                            onValueChange={(value) => {
                              if (value === '__add_new_type__') {
                                setIsAddTypeDialogOpen(true);
                              } else {
                                updateVariant(variant.id, { type: value });
                              }
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {allVariantTypes.map(vt => (
                                <SelectItem key={vt.id} value={vt.id}>{vt.label}</SelectItem>
                              ))}
                              <SelectItem value="__add_new_type__" className="text-primary font-medium border-t mt-1">
                                + Criar novo tipo...
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label>Nome</Label>
                          <Input
                            value={variant.name}
                            onChange={(e) => updateVariant(variant.id, { name: e.target.value })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>Valor</Label>
                          <Input
                            value={variant.value}
                            onChange={(e) => updateVariant(variant.id, { value: e.target.value })}
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>Preço de Custo (R$)</Label>
                          {useAutoPricing ? (
                            <>
                              <Input
                                type="number"
                                value={productCostPrice}
                                readOnly
                                className="bg-muted cursor-not-allowed"
                              />
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <Calculator className="h-3 w-3" />
                                Herdado do produto - Venda: {formatCurrency(variant.priceModifier)}
                              </div>
                            </>
                          ) : (
                            <>
                              <Input
                                type="number"
                                step="0.01"
                                value={variant.costPrice || ''}
                                onChange={(e) => updateVariant(variant.id, { costPrice: parseFloat(e.target.value) || 0 })}
                              />
                              {platformSettings && variant.costPrice > 0 && (
                                <div className="flex items-center gap-1 text-xs text-green-600">
                                  <Calculator className="h-3 w-3" />
                                  Preço de venda: {formatCurrency(variant.priceModifier)}
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label>Estoque</Label>
                          <Input
                            type="number"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariant(variant.id, { stockQuantity: parseInt(e.target.value) || 0 })}
                          />
                        </div>

                        <div className="space-y-2">
                          <Label>SKU da Variante</Label>
                          <Input
                            value={variant.sku || ''}
                            onChange={(e) => updateVariant(variant.id, { sku: e.target.value })}
                            placeholder="Gerado se vazio"
                          />
                        </div>
                      </div>

                      <div className="flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={variant.active}
                            onCheckedChange={(checked) => updateVariant(variant.id, { active: checked })}
                          />
                          <Label>Ativo</Label>
                        </div>

                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" onClick={() => setEditingId(null)}>
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <div className="flex items-center justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">
                            {getVariantTypeLabel(variant.type)}
                          </Badge>
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-muted-foreground">({variant.value})</span>
                          {!variant.active && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                          {variant.sku && <Badge variant="outline" className="font-mono text-[10px]">{variant.sku}</Badge>}
                          <span>Custo: {formatCurrency(variant.costPrice || 0)}</span>
                          <span className="text-green-600 font-medium">Venda: {formatCurrency(variant.priceModifier)}</span>
                          <span>Estoque: {variant.stockQuantity} unidades</span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        <Button variant="outline" size="sm" onClick={() => setEditingId(variant.id)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => removeVariant(variant.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      ) : (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <div className="text-muted-foreground">
              <div className="mb-2">Nenhuma variação cadastrada</div>
              <div className="text-sm">Clique em "Adicionar Variação" para começar</div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Modal para Adicionar Novo Tipo de Variação */}
      <Dialog open={isAddTypeDialogOpen} onOpenChange={setIsAddTypeDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base font-bold flex items-center gap-2">
              <Plus className="h-4 w-4 text-primary" />
              Novo Tipo de Variação
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie um tipo de variação personalizado (ex: Voltagem, Sabor, Fragrância, Material). Ele ficará <strong>salvo para sempre</strong> para todos os seus produtos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <div className="space-y-1.5">
              <Label className="text-xs">Nome do Tipo de Variação</Label>
              <Input
                placeholder="Ex: Voltagem, Sabor, Capacidade, Tensão"
                value={newTypeName}
                onChange={(e) => setNewTypeName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreateCustomType()}
                className="h-9 text-xs"
              />
            </div>

            {customTypes.length > 0 && (
              <div className="space-y-1.5 pt-2">
                <Label className="text-[11px] text-muted-foreground">Tipos personalizados salvos:</Label>
                <div className="flex flex-wrap gap-1.5">
                  {customTypes.map((ct) => (
                    <Badge key={ct.id} variant="outline" className="text-[10px] bg-muted/30">
                      {ct.label}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsAddTypeDialogOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handleCreateCustomType}
              disabled={!newTypeName.trim()}
            >
              Salvar e Selecionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
