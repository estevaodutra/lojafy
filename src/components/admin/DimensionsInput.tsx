import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Ruler, Weight } from 'lucide-react';

interface Dimensions {
  height?: number;
  width?: number;
  length?: number;
  weight?: number;
}

interface DimensionsInputProps {
  dimensions: Dimensions;
  onDimensionsChange: (dimensions: Dimensions) => void;
}

export const DimensionsInput: React.FC<DimensionsInputProps> = ({
  dimensions,
  onDimensionsChange
}) => {
  const updateDimension = (field: keyof Dimensions, value: string) => {
    const numericValue = value === '' ? undefined : parseFloat(value);
    onDimensionsChange({
      ...dimensions,
      [field]: numericValue
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Ruler className="h-4 w-4" />
          Dimensões e Peso
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Dimensões */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Ruler className="h-3 w-3" />
              Dimensões (cm)
            </h4>
            
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label htmlFor="height" className="text-xs">Altura</Label>
                <Input
                  id="height"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={dimensions.height || ''}
                  onChange={(e) => updateDimension('height', e.target.value)}
                  className="text-center"
                />
                <div className="text-xs text-muted-foreground text-center">cm</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="width" className="text-xs">Largura</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={dimensions.width || ''}
                  onChange={(e) => updateDimension('width', e.target.value)}
                  className="text-center"
                />
                <div className="text-xs text-muted-foreground text-center">cm</div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="length" className="text-xs">Comprimento</Label>
                <Input
                  id="length"
                  type="number"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={dimensions.length || ''}
                  onChange={(e) => updateDimension('length', e.target.value)}
                  className="text-center"
                />
                <div className="text-xs text-muted-foreground text-center">cm</div>
              </div>
            </div>
          </div>

          {/* Peso */}
          <div className="space-y-4">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Weight className="h-3 w-3" />
              Peso
            </h4>
            
            <div className="space-y-2">
              <Label htmlFor="weight" className="text-xs">Peso em Gramas</Label>
              <Input
                id="weight"
                type="number"
                step="1"
                min="0"
                placeholder="0"
                value={dimensions.weight || ''}
                onChange={(e) => updateDimension('weight', e.target.value)}
                className="text-center"
              />
              <div className="text-xs text-muted-foreground text-center">gramas</div>
            </div>

            {/* Volume calculado */}
            {dimensions.height && dimensions.width && dimensions.length && (
              <div className="bg-muted/50 rounded-lg p-3 space-y-1">
                <div className="text-xs font-medium">Volume Calculado</div>
                <div className="text-sm">
                  {(dimensions.height * dimensions.width * dimensions.length / 1000).toFixed(2)} litros
                </div>
                <div className="text-xs text-muted-foreground">
                  {dimensions.height} × {dimensions.width} × {dimensions.length} cm³
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Dicas */}
        <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
          <h5 className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">
            Dicas para medição
          </h5>
          <ul className="text-xs text-blue-600 dark:text-blue-400 space-y-0.5">
            <li>• Meça sempre com a embalagem do produto</li>
            <li>• Use as dimensões externas da caixa</li>
            <li>• Peso deve incluir embalagem e proteções</li>
            <li>• Essas medidas são usadas para cálculo de frete</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
};