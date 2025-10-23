import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Edit, Loader2, Check, X } from 'lucide-react';
import { LucideIcon } from 'lucide-react';

interface EditableFeeCardProps {
  title: string;
  description: string;
  value: number;
  type: 'percentage' | 'fixed';
  icon: LucideIcon;
  onUpdate: (value: number, type: 'percentage' | 'fixed') => Promise<void>;
}

export const EditableFeeCard: React.FC<EditableFeeCardProps> = ({
  title,
  description,
  value,
  type,
  icon: Icon,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editValue, setEditValue] = useState(value);
  const [editType, setEditType] = useState(type);

  const formatDisplay = (val: number, t: 'percentage' | 'fixed') => {
    if (t === 'percentage') {
      return `${val}%`;
    }
    return `R$ ${val.toFixed(2)}`;
  };

  const handleEdit = () => {
    setEditValue(value);
    setEditType(type);
    setIsEditing(true);
  };

  const handleCancel = () => {
    setEditValue(value);
    setEditType(type);
    setIsEditing(false);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onUpdate(editValue, editType);
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving fee:', error);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Icon className="h-5 w-5 text-primary" />
            <CardTitle className="text-base">{title}</CardTitle>
          </div>
          {!isEditing && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={handleEdit}
              className="h-8 w-8 p-0"
            >
              <Edit className="h-4 w-4" />
            </Button>
          )}
        </div>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {isEditing ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                type="number"
                step="0.01"
                min="0"
                value={editValue}
                onChange={(e) => setEditValue(parseFloat(e.target.value) || 0)}
                className="flex-1"
                disabled={isSaving}
              />
              <Select 
                value={editType}
                onValueChange={(val) => setEditType(val as 'percentage' | 'fixed')}
                disabled={isSaving}
              >
                <SelectTrigger className="w-24">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">%</SelectItem>
                  <SelectItem value="fixed">R$</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2">
              <Button 
                onClick={handleSave} 
                size="sm" 
                className="flex-1"
                disabled={isSaving}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4 mr-1" />
                )}
                Salvar
              </Button>
              <Button 
                onClick={handleCancel} 
                variant="outline" 
                size="sm"
                disabled={isSaving}
              >
                <X className="h-4 w-4 mr-1" />
                Cancelar
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-2xl font-bold">{formatDisplay(value, type)}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {type === 'percentage' ? 'Percentual' : 'Valor fixo'}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
