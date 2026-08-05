import React from 'react';
import { DimensionsInput, Dimensions } from '../DimensionsInput';
import { Ruler, PackageCheck, HelpCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface DimensionsSectionProps {
  dimensions: Dimensions;
  onDimensionsChange: (dimensions: Dimensions) => void;
}

export const DimensionsSection: React.FC<DimensionsSectionProps> = ({
  dimensions,
  onDimensionsChange,
}) => {
  const height = dimensions.height || 0;
  const width = dimensions.width || 0;
  const length = dimensions.length || 0;
  const weight = dimensions.weight || 0;

  const volumeCm3 = height * width * length;

  return (
    <div className="space-y-4">
      {/* Resumo de Medidas Calculadas */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg border bg-muted/20 text-xs">
        <div className="flex items-center space-x-2">
          <Ruler className="h-4 w-4 text-primary" />
          <span className="font-semibold text-foreground">Resumo Logístico:</span>
          <code className="font-mono bg-background px-2 py-0.5 rounded border text-foreground">
            {height || '0'} × {width || '0'} × {length || '0'} cm
          </code>
          <code className="font-mono bg-background px-2 py-0.5 rounded border text-foreground">
            {weight || '0'} kg
          </code>
        </div>

        <div className="flex items-center space-x-2">
          <span className="text-muted-foreground">Volume Estimado:</span>
          <Badge variant="outline" className="font-mono text-[11px] bg-background">
            {volumeCm3 > 0 ? `${volumeCm3.toLocaleString('pt-BR')} cm³` : '0 cm³'}
          </Badge>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <button type="button" className="text-muted-foreground hover:text-foreground">
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="max-w-xs text-xs">
                As dimensões com embalagem são utilizadas para calcular o frete junto aos Correios e transportadoras no checkout.
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </div>

      {/* Inputs de Dimensões em Linha Única */}
      <DimensionsInput 
        dimensions={dimensions}
        onDimensionsChange={onDimensionsChange}
      />
    </div>
  );
};
