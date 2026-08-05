import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, Link2, Trash2, RefreshCw } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface LinkedReferenceSectionProps {
  referenceUrl?: string;
  originalName?: string;
  originalPrice?: number;
  onRestoreOriginal?: () => void;
}

export const LinkedReferenceSection: React.FC<LinkedReferenceSectionProps> = ({
  referenceUrl,
  originalName,
  originalPrice,
  onRestoreOriginal,
}) => {
  if (!referenceUrl && !originalName) {
    return (
      <div className="p-4 text-center border border-dashed rounded-lg text-xs text-muted-foreground">
        Nenhum anúncio de referência vinculado a este produto.
      </div>
    );
  }

  return (
    <Card className="border-border/60 bg-muted/10 shadow-2xs">
      <CardContent className="p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
          <div className="flex items-center space-x-2">
            <Link2 className="h-4 w-4 text-primary" />
            <span className="text-xs font-bold text-foreground">Anúncio Vinculado</span>
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
              Mercado Livre
            </Badge>
          </div>

          {referenceUrl && (
            <a
              href={referenceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-xs text-primary hover:underline flex items-center gap-1 font-medium"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Anúncio Original
            </a>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {originalName && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Nome Original Importado:</span>
              <span className="font-medium text-foreground">{originalName}</span>
            </div>
          )}

          {originalPrice !== undefined && originalPrice !== null && (
            <div>
              <span className="text-muted-foreground block text-[11px]">Preço Original Mercado Livre:</span>
              <span className="font-mono font-bold text-foreground">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(originalPrice)}
              </span>
            </div>
          )}
        </div>

        {onRestoreOriginal && (
          <div className="pt-2 border-t flex justify-end">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRestoreOriginal}
              className="h-8 text-xs text-amber-600 border-amber-500/30 hover:bg-amber-500/10"
            >
              <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
              Restaurar Dados Originais
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
