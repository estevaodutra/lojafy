import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Check, Loader2, X } from 'lucide-react';

interface MercadoLivreButtonProps {
  productId: string;
  isPublished: boolean;
  isPublishing: boolean;
  isUnpublishing?: boolean;
  isInStore: boolean;
  onPublish: (addToStoreFirst?: () => Promise<void>) => Promise<void>;
  onUnpublish?: () => Promise<void>;
  onAddToStore: () => Promise<void>;
  compact?: boolean;
}

export const MercadoLivreButton: React.FC<MercadoLivreButtonProps> = ({
  productId,
  isPublished,
  isPublishing,
  isUnpublishing = false,
  isInStore,
  onPublish,
  onUnpublish,
  onAddToStore,
  compact = false,
}) => {
  const handlePublishClick = async () => {
    if (isPublished || isPublishing) return;
    
    // If product is not in store, add it first
    if (!isInStore) {
      await onPublish(onAddToStore);
    } else {
      await onPublish();
    }
  };

  const handleUnpublishClick = async () => {
    if (isUnpublishing || !onUnpublish) return;
    await onUnpublish();
  };

  // Unpublishing state
  if (isUnpublishing) {
    return (
      <Button
        className="w-full bg-red-500 hover:bg-red-500 text-white"
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Despublicando...
      </Button>
    );
  }

  // Published state - show both status and unpublish option
  if (isPublished) {
    return (
      <div className="flex flex-col gap-1 w-full">
        <Button
          className="w-full bg-green-500 hover:bg-green-500 text-white cursor-default"
          disabled
        >
          <Check className="h-4 w-4 mr-2" />
          {compact ? "Publicado" : "Publicado no ML"}
        </Button>
        {onUnpublish && (
          <Button 
            size="sm"
            variant="outline" 
            className="w-full text-red-600 border-red-300 hover:bg-red-50 hover:text-red-700"
            onClick={handleUnpublishClick}
          >
            <X className="h-3 w-3 mr-1" />
            Despublicar
          </Button>
        )}
      </div>
    );
  }

  // Publishing state - just show a subtle indicator, doesn't block
  if (isPublishing) {
    return (
      <Button
        className="w-full bg-amber-500 hover:bg-amber-500 text-white"
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Enviando...
      </Button>
    );
  }

  // Default - not published
  return (
    <Button
      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
      onClick={handlePublishClick}
    >
      <Send className="h-4 w-4 mr-2" />
      {compact ? "Mercado Livre" : "Publicar no Mercado Livre"}
    </Button>
  );
};
