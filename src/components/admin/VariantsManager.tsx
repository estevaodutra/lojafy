import React, { useState } from 'react';
import { Plus, Trash2, Edit2, Check, X, Calculator } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';

export interface ProductVariant {
  id: string;
  type: 'color' | 'size' | 'model';
  name: string;
  value: string;
  costPrice: number;
  priceModifier: number;
  stockQuantity: number;
  imageUrl?: string;
  active: boolean;
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

export const VariantsManager: React.FC<VariantsManagerProps> = ({
  variants,
  onVariantsChange,
  platformSettings
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
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

  const variantTypeLabels = {
    color: 'Cor',
    size: 'Tamanho',
    model: 'Modelo'
  };

  const addVariant = () => {
    if (!newVariant.name || !newVariant.value) return;

    const costPrice = newVariant.costPrice || 0;
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
                <Label>Tipo</Label>
                <Select
                  value={newVariant.type}
                  onValueChange={(value) => setNewVariant({ ...newVariant, type: value as ProductVariant['type'] })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="color">Cor</SelectItem>
                    <SelectItem value="size">Tamanho</SelectItem>
                    <SelectItem value="model">Modelo</SelectItem>
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

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                            onValueChange={(value) => updateVariant(variant.id, { type: value as ProductVariant['type'] })}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="color">Cor</SelectItem>
                              <SelectItem value="size">Tamanho</SelectItem>
                              <SelectItem value="model">Modelo</SelectItem>
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Preço de Custo (R$)</Label>
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
                        </div>

                        <div className="space-y-2">
                          <Label>Estoque</Label>
                          <Input
                            type="number"
                            value={variant.stockQuantity}
                            onChange={(e) => updateVariant(variant.id, { stockQuantity: parseInt(e.target.value) || 0 })}
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
                            {variantTypeLabels[variant.type]}
                          </Badge>
                          <span className="font-medium">{variant.name}</span>
                          <span className="text-muted-foreground">({variant.value})</span>
                          {!variant.active && (
                            <Badge variant="destructive">Inativo</Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
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
    </div>
  );
};
