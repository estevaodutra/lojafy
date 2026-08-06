import React from 'react';
import { ArrowLeft, Save, Loader2, AlertCircle, CheckCircle2, Package, Sparkles, Rocket } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface ProductEditHeaderProps {
  productName: string;
  sku?: string;
  mainImageUrl?: string;
  isSubmitting: boolean;
  isPublishing?: boolean;
  isDirty: boolean;
  isExisting: boolean;
  activeStatus: boolean;
  updatedAt?: string;
  onCancel: () => void;
  onSubmit: () => void;
  onPublish?: () => void;
}

export const ProductEditHeader: React.FC<ProductEditHeaderProps> = ({
  productName,
  sku,
  mainImageUrl,
  isSubmitting,
  isPublishing,
  isDirty,
  isExisting,
  activeStatus,
  updatedAt,
  onCancel,
  onSubmit,
  onPublish,
}) => {
  const formattedDate = updatedAt 
    ? new Date(updatedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : null;

  return (
    <header className="sticky top-0 z-30 w-full border-b bg-background/95 backdrop-blur-md supports-[backdrop-filter]:bg-background/80 shadow-xs py-3 px-4 transition-all">
      <div className="w-full flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        
        {/* Left Section: Back button + Product Mini Summary */}
        <div className="flex items-center space-x-3 min-w-0">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onCancel}
            className="h-9 w-9 shrink-0 rounded-full hover:bg-muted"
            title="Voltar para a lista de produtos"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Product Thumbnail */}
          <div className="relative h-10 w-10 shrink-0 rounded-lg border bg-muted/40 overflow-hidden flex items-center justify-center">
            {mainImageUrl ? (
              <img
                src={mainImageUrl}
                alt={productName || 'Produto'}
                className="h-full w-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <Package className="h-5 w-5 text-muted-foreground/60" />
            )}
          </div>

          {/* Title & Metadata */}
          <div className="min-w-0 space-y-0.5">
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold truncate tracking-tight text-foreground max-w-[280px] sm:max-w-[400px] md:max-w-[500px]">
                {productName || (isExisting ? 'Editar Produto' : 'Novo Produto')}
              </h1>

              {activeStatus ? (
                <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] px-2 py-0 h-5 font-medium shrink-0">
                  Ativo
                </Badge>
              ) : (
                <Badge variant="outline" className="bg-muted text-muted-foreground border-border text-[11px] px-2 py-0 h-5 font-medium shrink-0">
                  Inativo
                </Badge>
              )}

              {isDirty && (
                <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30 text-[11px] px-2 py-0 h-5 font-medium shrink-0 animate-pulse">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Não salvo
                </Badge>
              )}
            </div>

            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              {sku && <span>SKU: <code className="font-mono text-foreground font-semibold">{sku}</code></span>}
              {formattedDate && <span className="hidden md:inline">Atualizado em: {formattedDate}</span>}
            </div>
          </div>
        </div>

        {/* Right Section: Actions */}
        <div className="flex items-center space-x-2 shrink-0 self-end sm:self-auto w-full sm:w-auto justify-end">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting || isPublishing}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>

          {onPublish && (
            <Button
              type="button"
              size="sm"
              onClick={onPublish}
              disabled={isSubmitting || isPublishing}
              className="h-9 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm gap-1.5"
            >
              {isPublishing ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Publicando...
                </>
              ) : (
                <>
                  <Rocket className="h-3.5 w-3.5" />
                  Publicar e Ativar
                </>
              )}
            </Button>
          )}

          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting || isPublishing}
            className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm min-w-[130px]"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <Save className="h-3.5 w-3.5 mr-1.5" />
                {isExisting ? 'Atualizar Produto' : 'Salvar Produto'}
              </>
            )}
          </Button>
        </div>

      </div>
    </header>
  );
};
