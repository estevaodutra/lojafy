import React, { useState } from 'react';
import { ImageUploadArea, ImageFile } from '../ImageUploadArea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Image as ImageIcon, 
  Star, 
  Sparkles, 
  Layers, 
  ShieldCheck, 
  ExternalLink, 
  Copy, 
  Check, 
  X, 
  SlidersHorizontal,
  Maximize2
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';

interface ImagesSectionProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  productId?: string;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  productId,
}) => {
  const { toast } = useToast();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const mainImage = images.find(img => img.isMain) || images[0];
  const externalCount = images.filter(img => {
    const url = img.url || img.preview || '';
    return url.includes('mlstatic.com') || url.includes('mercadolibre.com');
  }).length;

  const setMainImage = (imageId: string) => {
    const updated = images.map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    onImagesChange(updated);
    toast({
      title: "Imagem Principal Atualizada",
      description: "A foto selecionada agora é a imagem principal do produto.",
    });
  };

  const removeImage = (imageId: string) => {
    const updated = images.filter(img => img.id !== imageId);
    if (updated.length > 0 && !updated.some(img => img.isMain)) {
      updated[0].isMain = true;
    }
    onImagesChange(updated);
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "URL copiada para a área de transferência!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="space-y-4">
      
      {/* Visualização Principal em Grade Compacta (4-5 colunas no Desktop, sem poluentes de URLs extensas) */}
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Galeria em Grade ({images.length}/{maxImages})
          </span>
          {externalCount > 0 ? (
            <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/30 text-[10px]">
              {externalCount} foto(s) externa(s)
            </Badge>
          ) : (
            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 text-[10px]">
              <ShieldCheck className="h-3 w-3 mr-1" /> No Servidor Próprio
            </Badge>
          )}
        </div>

        {/* Botão para Abrir Modal / Drawer Completo de Gerenciamento de Lista */}
        <Dialog open={isManagerOpen} onOpenChange={setIsManagerOpen}>
          <DialogTrigger asChild>
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs font-medium bg-background">
              <SlidersHorizontal className="h-3.5 w-3.5 mr-1.5" />
              Gerenciador em Lista & URLs
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <ImageIcon className="h-5 w-5 text-primary" />
                Gerenciador Avançado de Galeria e URLs
              </DialogTitle>
              <DialogDescription className="text-xs">
                Inspecione URLs individuais, faça o upload de arquivos e envie fotos externas diretamente para o servidor da VPS.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              <ImageUploadArea
                images={images}
                onImagesChange={onImagesChange}
                maxImages={maxImages}
                productId={productId}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Grade Compacta de Miniaturas */}
      {images.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {images.map((image, index) => {
            const currentUrl = image.url || image.preview;
            const isExternal = currentUrl.includes('mlstatic.com') || currentUrl.includes('mercadolibre.com');

            return (
              <Card key={image.id} className="relative overflow-hidden group border hover:border-primary/50 transition-all">
                <div className="aspect-square bg-muted/20 relative">
                  <img
                    src={currentUrl}
                    alt={`Foto ${index + 1}`}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      e.currentTarget.src = 'https://lojafy-supabase.d2x.site/storage/v1/object/public/system/placeholder.png';
                    }}
                  />

                  {/* Badges Overlay */}
                  <div className="absolute top-1.5 left-1.5 flex flex-col gap-1">
                    {image.isMain && (
                      <Badge variant="default" className="text-[9px] px-1.5 py-0 h-4 bg-primary font-bold shadow-xs">
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Principal
                      </Badge>
                    )}
                    {isExternal ? (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-amber-500/90 text-white border-none font-medium">
                        Externa
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 bg-emerald-600/90 text-white border-none font-medium">
                        Servidor
                      </Badge>
                    )}
                  </div>

                  {/* Actions Overlay no Hover */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center space-x-1.5 p-2 backdrop-blur-[1px]">
                    {!image.isMain && (
                      <Button
                        type="button"
                        size="icon"
                        variant="secondary"
                        className="h-7 w-7 text-xs rounded-full bg-white/90 text-foreground hover:bg-white"
                        onClick={() => setMainImage(image.id)}
                        title="Definir como Principal"
                      >
                        <Star className="h-3.5 w-3.5 text-amber-500" />
                      </Button>
                    )}

                    <Button
                      type="button"
                      size="icon"
                      variant="secondary"
                      className="h-7 w-7 text-xs rounded-full bg-white/90 text-foreground hover:bg-white"
                      onClick={() => copyUrl(currentUrl, image.id)}
                      title="Copiar URL"
                    >
                      {copiedId === image.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                    </Button>

                    <Button
                      type="button"
                      size="icon"
                      variant="destructive"
                      className="h-7 w-7 text-xs rounded-full"
                      onClick={() => removeImage(image.id)}
                      title="Remover"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      ) : (
        <div className="p-6 text-center border-2 border-dashed rounded-xl space-y-2 bg-muted/10">
          <ImageIcon className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">Nenhuma imagem cadastrada no produto.</p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsManagerOpen(true)}
            className="h-8 text-xs"
          >
            Adicionar Imagens
          </Button>
        </div>
      )}

    </div>
  );
};
