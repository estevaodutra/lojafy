import React from 'react';
import { Button } from '@/components/ui/button';
import { Send, Check, Loader2 } from 'lucide-react';

interface MercadoLivreButtonProps {
  productId: string;
  isPublished: boolean;
  isPublishing: boolean;
  isInStore: boolean;
  onPublish: (addToStoreFirst?: () => Promise<void>) => Promise<void>;
  onAddToStore: () => Promise<void>;
  compact?: boolean;
}

export const MercadoLivreButton: React.FC<MercadoLivreButtonProps> = ({
  productId,
  isPublished,
  isPublishing,
  isInStore,
  onPublish,
  onAddToStore,
  compact = false,
}) => {
  const handleClick = async () => {
    if (isPublished || isPublishing) return;
    
    // If product is not in store, add it first
    if (!isInStore) {
      await onPublish(onAddToStore);
    } else {
      await onPublish();
    }
  };

  if (isPublished) {
    return (
      <Button
        className="w-full bg-green-500 hover:bg-green-500 text-white cursor-default"
        disabled
      >
        <Check className="h-4 w-4 mr-2" />
        Publicado no Mercado Livre
      </Button>
    );
  }

  if (isPublishing) {
    return (
      <Button
        className="w-full bg-amber-500 hover:bg-amber-500 text-white"
        disabled
      >
        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
        Publicando...
      </Button>
    );
  }

  return (
    <Button
      className="w-full bg-amber-500 hover:bg-amber-600 text-white"
      onClick={handleClick}
    >
      <Send className="h-4 w-4 mr-2" />
      {compact ? "Mercado Livre" : "Publicar no Mercado Livre"}
    </Button>
  );
};
