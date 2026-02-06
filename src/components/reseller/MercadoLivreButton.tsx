import React from 'react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Send, Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MercadoLivreButtonProps {
  productId: string;
  isPublished: boolean;
  isPublishing: boolean;
  isInStore: boolean;
  onPublish: (addToStoreFirst?: () => Promise<void>) => Promise<void>;
  onAddToStore: () => Promise<void>;
}

export const MercadoLivreButton: React.FC<MercadoLivreButtonProps> = ({
  productId,
  isPublished,
  isPublishing,
  isInStore,
  onPublish,
  onAddToStore,
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
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 border-green-500 bg-green-50 hover:bg-green-100 dark:bg-green-950 dark:hover:bg-green-900"
            disabled
          >
            <Check className="h-4 w-4 text-green-600" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Publicado no Mercado Livre</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  if (isPublishing) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="h-9 w-9 border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900"
            disabled
          >
            <Loader2 className="h-4 w-4 text-amber-600 animate-spin" />
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Publicando...</p>
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          size="icon"
          variant="outline"
          className="h-9 w-9 border-amber-500 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950 dark:hover:bg-amber-900"
          onClick={handleClick}
        >
          <Send className="h-4 w-4 text-amber-600" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>
        <p>Publicar no Mercado Livre</p>
      </TooltipContent>
    </Tooltip>
  );
};
