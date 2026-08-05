import React from 'react';
import { Save, Loader2, AlertTriangle, CheckCircle2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

interface StickySaveBarProps {
  isSubmitting: boolean;
  isDirty: boolean;
  isExisting: boolean;
  errorCount: number;
  onCancel: () => void;
  onSubmit: () => void;
  onScrollToFirstError?: () => void;
}

export const StickySaveBar: React.FC<StickySaveBarProps> = ({
  isSubmitting,
  isDirty,
  isExisting,
  errorCount,
  onCancel,
  onSubmit,
  onScrollToFirstError,
}) => {
  return (
    <div className="sticky bottom-0 z-30 w-full border-t bg-background/95 backdrop-blur-md shadow-lg py-3 px-4 transition-all">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        
        {/* Left Status Message */}
        <div className="flex items-center space-x-2">
          {errorCount > 0 ? (
            <button
              type="button"
              onClick={onScrollToFirstError}
              className="flex items-center space-x-1.5 text-xs font-semibold text-destructive hover:underline cursor-pointer bg-destructive/10 px-2.5 py-1 rounded-full border border-destructive/30"
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              <span>{errorCount} campo(s) com erro - Clique para corrigir</span>
            </button>
          ) : isDirty ? (
            <div className="flex items-center space-x-1.5 text-xs text-amber-600 dark:text-amber-400 font-medium">
              <span className="h-2 w-2 rounded-full bg-amber-500 animate-ping" />
              <span>Alterações pendentes de salvamento</span>
            </div>
          ) : (
            <div className="flex items-center space-x-1.5 text-xs text-muted-foreground font-medium">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              <span>Nenhuma alteração pendente</span>
            </div>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center space-x-2 ml-auto">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            disabled={isSubmitting}
            className="h-9 text-xs"
          >
            Cancelar
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={onSubmit}
            disabled={isSubmitting}
            className="h-9 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm min-w-[140px]"
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
    </div>
  );
};
