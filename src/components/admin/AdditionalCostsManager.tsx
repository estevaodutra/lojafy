import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, Edit, X, Check, Package } from 'lucide-react';
import { AdditionalCost } from '@/hooks/usePlatformSettings';

interface AdditionalCostsManagerProps {
  costs: AdditionalCost[];
  onAdd: (cost: Omit<AdditionalCost, 'id' | 'created_at'>) => void;
  onUpdate: (costId: string, updates: Partial<AdditionalCost>) => void;
  onDelete: (costId: string) => void;
}

export const AdditionalCostsManager: React.FC<AdditionalCostsManagerProps> = ({
  costs,
  onAdd,
  onUpdate,
  onDelete,
}) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [newCost, setNewCost] = useState({
    name: '',
    value: 0,
    type: 'fixed' as 'fixed' | 'percentage',
    active: true,
  });
  const [editCost, setEditCost] = useState<Partial<AdditionalCost>>({});

  const handleAdd = () => {
    if (newCost.name && newCost.value > 0) {
      onAdd(newCost);
      setNewCost({ name: '', value: 0, type: 'fixed', active: true });
      setIsAdding(false);
    }
  };

  const handleEdit = (cost: AdditionalCost) => {
    setEditingId(cost.id);
    setEditCost(cost);
  };

  const handleSaveEdit = () => {
    if (editingId && editCost.name && editCost.value && editCost.value > 0) {
      onUpdate(editingId, editCost);
      setEditingId(null);
      setEditCost({});
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditCost({});
  };

  const formatDisplay = (value: number, type: 'fixed' | 'percentage') => {
    if (type === 'percentage') {
      return `${value}%`;
    }
    return `R$ ${value.toFixed(2)}`;
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-primary" />
            <CardTitle>Custos Adicionais do Produto</CardTitle>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />
              Adicionar Custo
            </Button>
          )}
        </div>
        <CardDescription>
          Configure custos adicionais que serão aplicados automaticamente no cálculo de preços
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Add new cost form */}
          {isAdding && (
            <div className="p-4 border rounded-lg bg-muted/30 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="new-name">Nome do Custo</Label>
                  <Input
                    id="new-name"
                    placeholder="Ex: Embalagem"
                    value={newCost.name}
                    onChange={(e) => setNewCost({ ...newCost, name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-value">Valor</Label>
                  <div className="flex gap-2">
                    <Input
                      id="new-value"
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={newCost.value || ''}
                      onChange={(e) => setNewCost({ ...newCost, value: parseFloat(e.target.value) || 0 })}
                      className="flex-1"
                    />
                    <Select 
                      value={newCost.type}
                      onValueChange={(val) => setNewCost({ ...newCost, type: val as 'fixed' | 'percentage' })}
                    >
                      <SelectTrigger className="w-24">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">R$</SelectItem>
                        <SelectItem value="percentage">%</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button onClick={handleAdd} size="sm" className="flex-1">
                  <Check className="h-4 w-4 mr-1" />
                  Adicionar
                </Button>
                <Button onClick={() => setIsAdding(false)} variant="outline" size="sm">
                  <X className="h-4 w-4 mr-1" />
                  Cancelar
                </Button>
              </div>
            </div>
          )}

          {/* List existing costs */}
          {costs.length === 0 && !isAdding && (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhum custo adicional configurado</p>
              <p className="text-sm">Clique em "Adicionar Custo" para começar</p>
            </div>
          )}

          {costs.map((cost) => (
            <div key={cost.id} className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
              {editingId === cost.id ? (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label>Nome do Custo</Label>
                      <Input
                        value={editCost.name || ''}
                        onChange={(e) => setEditCost({ ...editCost, name: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Valor</Label>
                      <div className="flex gap-2">
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          value={editCost.value || ''}
                          onChange={(e) => setEditCost({ ...editCost, value: parseFloat(e.target.value) || 0 })}
                          className="flex-1"
                        />
                        <Select 
                          value={editCost.type || 'fixed'}
                          onValueChange={(val) => setEditCost({ ...editCost, type: val as 'fixed' | 'percentage' })}
                        >
                          <SelectTrigger className="w-24">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="fixed">R$</SelectItem>
                            <SelectItem value="percentage">%</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleSaveEdit} size="sm" className="flex-1">
                      <Check className="h-4 w-4 mr-1" />
                      Salvar
                    </Button>
                    <Button onClick={handleCancelEdit} variant="outline" size="sm">
                      <X className="h-4 w-4 mr-1" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 flex-1">
                    <Switch
                      checked={cost.active}
                      onCheckedChange={(checked) => onUpdate(cost.id, { active: checked })}
                    />
                    <div className="flex-1">
                      <p className="font-medium">{cost.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {formatDisplay(cost.value, cost.type)} • {cost.type === 'percentage' ? 'Percentual' : 'Fixo'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleEdit(cost)}
                      className="h-8 w-8 p-0"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => {
                        if (confirm(`Deseja remover o custo "${cost.name}"?`)) {
                          onDelete(cost.id);
                        }
                      }}
                      className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
