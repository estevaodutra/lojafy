import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription 
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { 
  Download, 
  Layers, 
  Star, 
  Copy, 
  Check, 
  Maximize2, 
  Loader2, 
  Sparkles,
  ExternalLink,
  X
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

export interface ProductGalleryItem {
  id: string;
  name: string;
  is_main: boolean;
  images: string[];
}

interface ProductGalleriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  productName: string;
  galleries: ProductGalleryItem[];
}

export const ProductGalleriesModal: React.FC<ProductGalleriesModalProps> = ({
  isOpen,
  onClose,
  productName,
  galleries,
}) => {
  const { toast } = useToast();
  const [selectedGalleryId, setSelectedGalleryId] = useState<string>(() => {
    const main = galleries.find(g => g.is_main);
    return main?.id || galleries[0]?.id || '';
  });
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<{ current: number; total: number; galleryName: string } | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const [zoomImageUrl, setZoomImageUrl] = useState<string | null>(null);

  useEffect(() => {
    if (galleries.length > 0 && (!selectedGalleryId || !galleries.some(g => g.id === selectedGalleryId))) {
      const main = galleries.find(g => g.is_main);
      setSelectedGalleryId(main?.id || galleries[0]?.id || '');
    }
  }, [galleries, selectedGalleryId]);

  // Active gallery
  const activeGallery = galleries.find(g => g.id === selectedGalleryId) || galleries[0];

  const handleCopyUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedUrl(url);
    toast({ title: "Link da imagem copiado!" });
    setTimeout(() => setCopiedUrl(null), 2000);
  };

  const downloadSingleImage = async (url: string, filename: string): Promise<boolean> => {
    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';

      await new Promise<void>((resolve, reject) => {
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.fillStyle = '#FFFFFF';
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);
              canvas.toBlob((blob) => {
                if (blob) {
                  const blobUrl = window.URL.createObjectURL(blob);
                  const link = document.createElement('a');
                  link.href = blobUrl;
                  link.download = filename;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                  window.URL.revokeObjectURL(blobUrl);
                  resolve();
                } else {
                  reject(new Error('Erro ao converter blob'));
                }
              }, 'image/jpeg', 0.92);
            } else {
              reject(new Error('Canvas indisponível'));
            }
          } catch (e) {
            reject(e);
          }
        };

        img.onerror = () => {
          // Fallback fetch
          fetch(url, { mode: 'cors' })
            .then(res => res.blob())
            .then(blob => {
              const blobUrl = window.URL.createObjectURL(blob);
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = filename;
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              window.URL.revokeObjectURL(blobUrl);
              resolve();
            })
            .catch(reject);
        };

        img.src = url;
      });
      return true;
    } catch (e) {
      console.error('Falha ao baixar imagem:', url, e);
      // Fallback: abrir em nova aba
      const link = document.createElement('a');
      link.href = url;
      link.target = '_blank';
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      return false;
    }
  };

  const handleDownloadGallery = async (gallery: ProductGalleryItem) => {
    if (isDownloading || !gallery.images || gallery.images.length === 0) return;

    setIsDownloading(true);
    const sanitizedProdName = productName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
    const sanitizedGalName = gallery.name.replace(/[^a-z0-9]/gi, '_').slice(0, 20);

    toast({
      title: `Baixando galeria "${gallery.name}"`,
      description: `Iniciando download de ${gallery.images.length} imagem(ns)...`,
    });

    try {
      for (let i = 0; i < gallery.images.length; i++) {
        setDownloadProgress({
          current: i + 1,
          total: gallery.images.length,
          galleryName: gallery.name,
        });

        const filename = `${sanitizedProdName}_${sanitizedGalName}_${i + 1}.jpg`;
        await downloadSingleImage(gallery.images[i], filename);
        await new Promise(r => setTimeout(r, 220));
      }

      toast({
        title: "Download Concluído!",
        description: `Todas as fotos de "${gallery.name}" foram salvas.`,
      });
    } catch (err) {
      console.error('Erro no download:', err);
      toast({
        title: "Erro no download",
        description: "Não foi possível concluir o download de algumas imagens.",
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const handleDownloadAllGalleries = async () => {
    if (isDownloading) return;

    const allImages = galleries.flatMap((g, gIdx) => 
      g.images.map((img, imgIdx) => ({
        url: img,
        galleryName: g.name,
        index: imgIdx + 1,
      }))
    );

    if (allImages.length === 0) return;

    setIsDownloading(true);
    const sanitizedProdName = productName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);

    toast({
      title: "Baixando todas as galerias",
      description: `Iniciando download de ${allImages.length} fotos no total...`,
    });

    try {
      for (let i = 0; i < allImages.length; i++) {
        const item = allImages[i];
        setDownloadProgress({
          current: i + 1,
          total: allImages.length,
          galleryName: item.galleryName,
        });

        const sanitizedGalName = item.galleryName.replace(/[^a-z0-9]/gi, '_').slice(0, 20);
        const filename = `${sanitizedProdName}_${sanitizedGalName}_${item.index}.jpg`;
        await downloadSingleImage(item.url, filename);
        await new Promise(r => setTimeout(r, 220));
      }

      toast({
        title: "Download Concluído!",
        description: `Todas as imagens (${allImages.length}) foram baixadas com sucesso.`,
      });
    } catch (err) {
      console.error('Erro no download completo:', err);
    } finally {
      setIsDownloading(false);
      setDownloadProgress(null);
    }
  };

  const totalAllImages = galleries.reduce((acc, g) => acc + (g.images?.length || 0), 0);

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => { if (!open && !isDownloading) onClose(); }}>
        <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-4 sm:p-6 overflow-hidden">
          <DialogHeader className="pb-3 border-b space-y-1">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Layers className="h-5 w-5" />
                </div>
                <div>
                  <DialogTitle className="text-lg font-bold">
                    Galerias do Produto
                  </DialogTitle>
                  <DialogDescription className="text-xs text-muted-foreground truncate max-w-md sm:max-w-xl">
                    {productName}
                  </DialogDescription>
                </div>
              </div>

              {galleries.length > 1 && totalAllImages > 0 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleDownloadAllGalleries}
                  disabled={isDownloading}
                  className="hidden sm:inline-flex text-xs h-8 gap-1.5 border-primary/30 text-primary hover:bg-primary/5"
                >
                  {isDownloading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Download className="h-3.5 w-3.5" />
                  )}
                  Baixar Todas as Galerias ({totalAllImages})
                </Button>
              )}
            </div>

            {/* Progresso de Download se ativo */}
            {downloadProgress && (
              <div className="pt-2">
                <div className="flex items-center justify-between text-xs text-primary font-medium mb-1">
                  <span>Baixando {downloadProgress.galleryName}...</span>
                  <span>{downloadProgress.current} de {downloadProgress.total}</span>
                </div>
                <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                  <div 
                    className="bg-primary h-full transition-all duration-200"
                    style={{ width: `${(downloadProgress.current / downloadProgress.total) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Abas das Galerias Disponíveis */}
          <div className="pt-3 pb-2 flex items-center gap-2 overflow-x-auto scrollbar-none border-b">
            {galleries.map((gallery) => {
              const isSelected = gallery.id === selectedGalleryId;
              const count = gallery.images?.length || 0;

              return (
                <button
                  key={gallery.id}
                  type="button"
                  onClick={() => setSelectedGalleryId(gallery.id)}
                  className={`flex items-center gap-2 px-3.5 py-2 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                    isSelected
                      ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                      : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                  }`}
                >
                  {gallery.is_main && (
                    <Star className={`h-3.5 w-3.5 ${isSelected ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-500'}`} />
                  )}
                  <span>{gallery.name}</span>
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                    isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Conteúdo da Galeria Selecionada */}
          {activeGallery && (
            <div className="flex-1 overflow-y-auto pt-3 space-y-4 pr-1">
              {/* Barra de Ações da Galeria Ativa */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3 bg-muted/40 rounded-xl border">
                <div className="flex items-center gap-2.5">
                  <h4 className="text-sm font-bold text-foreground">
                    {activeGallery.name}
                  </h4>
                  {activeGallery.is_main ? (
                    <Badge variant="default" className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-300 dark:text-amber-400 gap-1 font-semibold">
                      <Star className="h-3 w-3 fill-current text-amber-500" />
                      Galeria Principal da Vitrine
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Galeria Secundária / Anúncios
                    </Badge>
                  )}
                  <span className="text-xs text-muted-foreground">
                    • {activeGallery.images?.length || 0} foto(s)
                  </span>
                </div>

                {activeGallery.images && activeGallery.images.length > 0 && (
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => handleDownloadGallery(activeGallery)}
                    disabled={isDownloading}
                    className="h-8 text-xs font-semibold gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Baixando Fotos...
                      </>
                    ) : (
                      <>
                        <Download className="h-3.5 w-3.5" />
                        Baixar Galeria Completa ({activeGallery.images.length})
                      </>
                    )}
                  </Button>
                )}
              </div>

              {/* Grid de Imagens */}
              {activeGallery.images && activeGallery.images.length > 0 ? (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {activeGallery.images.map((imgUrl, idx) => (
                    <Card key={`${activeGallery.id}-${idx}`} className="relative overflow-hidden group border hover:border-primary/50 transition-all">
                      <div className="aspect-square bg-muted/30 relative">
                        <img
                          src={imgUrl}
                          alt={`${activeGallery.name} - Imagem ${idx + 1}`}
                          className="w-full h-full object-cover transition-transform group-hover:scale-105 duration-200"
                          onError={(e) => {
                            e.currentTarget.src = 'https://lojafy-supabase.d2x.site/storage/v1/object/public/system/placeholder.png';
                          }}
                        />

                        {/* Badge de Posição */}
                        <div className="absolute top-1.5 left-1.5">
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-black/60 text-white font-medium backdrop-blur-xs">
                            #{idx + 1}
                          </span>
                        </div>

                        {/* Hover Overlay com Ações */}
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2 backdrop-blur-[1px]">
                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full bg-white/95 text-foreground hover:bg-white shadow-xs"
                            onClick={() => setZoomImageUrl(imgUrl)}
                            title="Visualizar em tamanho grande"
                          >
                            <Maximize2 className="h-4 w-4" />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full bg-white/95 text-foreground hover:bg-white shadow-xs"
                            onClick={() => {
                              const sanitizedProd = productName.replace(/[^a-z0-9]/gi, '_').slice(0, 30);
                              downloadSingleImage(imgUrl, `${sanitizedProd}_${idx + 1}.jpg`);
                            }}
                            title="Baixar esta foto"
                          >
                            <Download className="h-4 w-4 text-primary" />
                          </Button>

                          <Button
                            type="button"
                            size="icon"
                            variant="secondary"
                            className="h-8 w-8 rounded-full bg-white/95 text-foreground hover:bg-white shadow-xs"
                            onClick={() => handleCopyUrl(imgUrl)}
                            title="Copiar URL"
                          >
                            {copiedUrl === imgUrl ? (
                              <Check className="h-4 w-4 text-emerald-600" />
                            ) : (
                              <Copy className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="p-8 text-center border-2 border-dashed rounded-xl space-y-2 bg-muted/10">
                  <Layers className="mx-auto h-8 w-8 text-muted-foreground/60" />
                  <p className="text-xs text-muted-foreground">
                    Esta galeria não possui imagens cadastradas.
                  </p>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Zoom da Imagem */}
      {zoomImageUrl && (
        <Dialog open={!!zoomImageUrl} onOpenChange={() => setZoomImageUrl(null)}>
          <DialogContent className="max-w-3xl p-2 bg-black/95 border-none text-white">
            <div className="relative flex items-center justify-center p-2 max-h-[85vh]">
              <img
                src={zoomImageUrl}
                alt="Preview"
                className="max-h-[80vh] w-auto object-contain rounded-md"
              />
              <Button
                type="button"
                size="icon"
                variant="ghost"
                onClick={() => setZoomImageUrl(null)}
                className="absolute top-2 right-2 text-white hover:bg-white/20 rounded-full"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};
export default ProductGalleriesModal;
