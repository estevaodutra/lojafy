import React, { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { 
  X, 
  Upload, 
  Star, 
  Copy, 
  Check, 
  RefreshCw, 
  ShieldCheck, 
  Sparkles, 
  Loader2, 
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ImageFile {
  id: string;
  file?: File;
  preview: string;
  url?: string;
  isMain: boolean;
  isUploading: boolean;
}

interface ImageUploadAreaProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  maxImages?: number;
  productId?: string;
  existingImages?: string[];
}

export const ImageUploadArea: React.FC<ImageUploadAreaProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  productId,
}) => {
  const { toast } = useToast();
  const [isUploading, setIsUploading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const PUBLIC_DOMAIN = import.meta.env.VITE_SUPABASE_URL || 'https://lojafy-supabase.d2x.site';

  const fixInternalDockerHost = (url: string): string => {
    if (!url) return url;
    return url.replace(/^http:\/\/(kong|localhost|127\.0\.0\.1):8000/, PUBLIC_DOMAIN);
  };

  // Helper para verificar se a imagem já está hospedada no nosso servidor Supabase
  const isHostedOnOurServer = (url?: string) => {
    if (!url) return false;
    const isOurBucket = url.includes('product-images') || url.includes('catalog-images');
    const isNotMl = !url.includes('mlstatic.com') && !url.includes('mercadolibre.com');
    const isNotInternalHost = !url.includes('kong:8000') && !url.includes('localhost:8000');
    return isOurBucket && isNotMl && isNotInternalHost;
  };

  const uploadImage = useCallback(async (file: File) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
      const filePath = productId ? `products/${productId}/${fileName}` : `catalog/${fileName}`;

      const { error } = await supabase.storage
        .from('product-images')
        .upload(filePath, file, { upsert: true });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      return fixInternalDockerHost(publicUrl);
    } catch (error) {
      console.error('Error uploading image:', error);
      throw error;
    }
  }, [productId]);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (images.length + acceptedFiles.length > maxImages) {
      toast({
        title: "Limite de imagens excedido",
        description: `Você pode enviar no máximo ${maxImages} imagens por produto.`,
        variant: "destructive"
      });
      return;
    }

    setIsUploading(true);

    const newImages: ImageFile[] = acceptedFiles.map((file, index) => ({
      id: `${Date.now()}-${index}`,
      file,
      preview: URL.createObjectURL(file),
      isMain: images.length === 0 && index === 0,
      isUploading: true
    }));

    onImagesChange([...images, ...newImages]);

    const uploadPromises = newImages.map(async (image) => {
      try {
        const url = await uploadImage(image.file!);
        return { ...image, url, isUploading: false };
      } catch (error) {
        toast({
          title: "Erro no upload",
          description: `Falha ao enviar ${image.file?.name}`,
          variant: "destructive"
        });
        return null;
      }
    });

    try {
      const uploadedImages = await Promise.all(uploadPromises);
      const validImages = uploadedImages.filter((img): img is ImageFile => img !== null);
      
      const allImages = images.concat(validImages);
      onImagesChange(allImages);
      
      toast({
        title: "Imagens enviadas",
        description: `${validImages.length} imagem(ns) enviada(s) e hospedada(s) com sucesso.`
      });
    } finally {
      setIsUploading(false);
    }
  }, [images, maxImages, onImagesChange, toast, uploadImage]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp']
    },
    maxSize: 5 * 1024 * 1024,
    disabled: isUploading || isBatchProcessing
  });

  const removeImage = useCallback((imageId: string) => {
    const updatedImages = images.filter(img => img.id !== imageId);
    if (updatedImages.length > 0 && !updatedImages.some(img => img.isMain)) {
      updatedImages[0].isMain = true;
    }
    onImagesChange(updatedImages);
  }, [images, onImagesChange]);

  const setMainImage = useCallback((imageId: string) => {
    const updated = images.map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    onImagesChange(updated);
    toast({
      title: "Imagem Principal Atualizada",
      description: "A foto selecionada agora é a imagem principal do produto.",
    });
  }, [images, onImagesChange, toast]);

  // Processamento individual de uma imagem (baixa, limpa EXIF/hash e faz upload no bucket da VPS)
  const processAndRehostSingle = async (imageItem: ImageFile): Promise<ImageFile> => {
    const targetUrl = imageItem.url || imageItem.preview;
    if (!targetUrl) return imageItem;

    try {
      setProcessingId(imageItem.id);

      // 1. Tenta acionar a Edge Function ml-sanitize-image
      const { data: res, error } = await supabase.functions.invoke('ml-sanitize-image', {
        body: { urls: [targetUrl] }
      });

      if (!error && res?.sanitizedUrls?.[0]) {
        const cleanUrl = fixInternalDockerHost(res.sanitizedUrls[0]);
        return {
          ...imageItem,
          url: cleanUrl,
          preview: cleanUrl,
          isUploading: false
        };
      }

      // 2. Fallback direto via cliente caso a edge function não responda
      const response = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        }
      });

      if (!response.ok) throw new Error(`Status ${response.status}`);

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const bytes = new Uint8Array(await response.arrayBuffer());

      let ext = 'jpg';
      if (contentType.includes('png')) ext = 'png';
      else if (contentType.includes('webp')) ext = 'webp';

      const timestamp = Date.now();
      const randomHex = Math.random().toString(36).substring(2, 8);
      const filePath = `catalog/sanitized_${timestamp}_${randomHex}.${ext}`;

      const { error: uploadErr } = await supabase.storage
        .from('product-images')
        .upload(filePath, bytes, { contentType, upsert: true });

      if (uploadErr) throw uploadErr;

      const { data: { publicUrl } } = supabase.storage
        .from('product-images')
        .getPublicUrl(filePath);

      const fixedUrl = fixInternalDockerHost(publicUrl);

      return {
        ...imageItem,
        url: fixedUrl,
        preview: fixedUrl,
        isUploading: false
      };
    } catch (err) {
      console.error(`Erro ao processar imagem ${imageItem.id}:`, err);
      toast({
        title: "Erro no processamento",
        description: "Não foi possível sanitizar a imagem. Verifique a URL.",
        variant: "destructive"
      });
      return imageItem;
    } finally {
      setProcessingId(null);
    }
  };

  const handleProcessSingle = async (imageItem: ImageFile) => {
    const processed = await processAndRehostSingle(imageItem);
    const updatedList = images.map(img => img.id === imageItem.id ? processed : img);
    onImagesChange(updatedList);
    toast({
      title: "Imagem Processada e Hospedada!",
      description: "A foto foi baixada, limpa e hospedada com sucesso no seu servidor.",
    });
  };

  // Processamento em lote de todas as mídias externas da galeria
  const handleProcessAllExternal = async () => {
    const externalImages = images.filter(img => !isHostedOnOurServer(img.url || img.preview));
    if (externalImages.length === 0) {
      toast({
        title: "Todas as fotos já estão hospedadas",
        description: "Todas as imagens deste produto já estão no seu servidor próprio.",
      });
      return;
    }

    setIsBatchProcessing(true);
    toast({
      title: "Processando Galeria...",
      description: `Iniciando o download e limpeza de ${externalImages.length} foto(s)...`,
    });

    try {
      const updatedList = [...images];
      for (let i = 0; i < updatedList.length; i++) {
        const item = updatedList[i];
        if (!isHostedOnOurServer(item.url || item.preview)) {
          setProcessingId(item.id);
          const processed = await processAndRehostSingle(item);
          updatedList[i] = processed;
          onImagesChange([...updatedList]); // Atualiza o estado em tempo real
        }
      }

      toast({
        title: "Processamento Concluído!",
        description: `${externalImages.length} imagem(ns) foram convertidas e hospedadas no seu servidor.`,
      });
    } catch (err) {
      console.error(err);
      toast({
        title: "Erro no processamento em lote",
        description: "Ocorreu uma falha ao processar algumas mídias.",
        variant: "destructive"
      });
    } finally {
      setIsBatchProcessing(false);
      setProcessingId(null);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    toast({
      title: "URL Copiada!",
      description: "Link da imagem copiado para a área de transferência.",
    });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const externalCount = images.filter(img => !isHostedOnOurServer(img.url || img.preview)).length;

  return (
    <div className="space-y-6">
      {/* Upload Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5 scale-[1.01]' 
            : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-muted/30'
          }
          ${isUploading || isBatchProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center justify-center space-y-2">
          <div className="p-3 bg-primary/10 rounded-full text-primary">
            <Upload className="h-6 w-6" />
          </div>
          <h3 className="text-base font-semibold">
            {isDragActive ? 'Solte as imagens aqui' : 'Envie suas imagens'}
          </h3>
          <p className="text-xs text-muted-foreground max-w-sm">
            Arrastre e solte ou clique para selecionar imagens
          </p>
          <p className="text-[11px] font-medium text-muted-foreground/80">
            PNG, JPG, WebP até 5MB • Máximo {maxImages} imagens
          </p>
        </div>
        {isUploading && (
          <div className="mt-4 flex items-center justify-center space-x-2 text-sm text-primary font-medium">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span>Enviando arquivos...</span>
          </div>
        )}
      </div>

      {/* Lista de Imagens em Formato de Lista (List View) */}
      {images.length > 0 && (
        <div className="space-y-4">
          {/* Header da Galeria com Ação de Processamento em Lote */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-muted/40 rounded-lg border border-border/50">
            <div className="space-y-0.5">
              <div className="flex items-center space-x-2">
                <h4 className="text-sm font-semibold text-foreground">
                  Galeria de Fotos ({images.length}/{maxImages})
                </h4>
                {externalCount > 0 ? (
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-xs">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {externalCount} foto(s) externa(s)
                  </Badge>
                ) : (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs">
                    <CheckCircle2 className="h-3 w-3 mr-1" />
                    Todas no servidor
                  </Badge>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Exibição em formato de lista com URLs individuais e conversão para servidor próprio.
              </p>
            </div>

            {/* Botão Global de Processamento */}
            {externalCount > 0 && (
              <Button
                type="button"
                size="sm"
                onClick={handleProcessAllExternal}
                disabled={isBatchProcessing || !!processingId}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-medium shadow-sm transition-all text-xs shrink-0"
              >
                {isBatchProcessing ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    Processando Galeria...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                    Hospedar Todas no Nosso Servidor ({externalCount})
                  </>
                )}
              </Button>
            )}
          </div>

          {/* ITENS EM FORMATO DE LISTA (Rows) */}
          <div className="space-y-3">
            {images.map((image, index) => {
              const currentUrl = image.url || image.preview;
              const isHosted = isHostedOnOurServer(currentUrl);
              const isItemProcessing = processingId === image.id;

              return (
                <Card 
                  key={image.id} 
                  className={`overflow-hidden transition-all border ${
                    image.isMain ? 'border-primary/50 shadow-sm bg-primary/[0.02]' : 'border-border/60 hover:border-border'
                  }`}
                >
                  <CardContent className="p-3">
                    <div className="flex flex-col md:flex-row md:items-center gap-3">
                      
                      {/* Miniatura com Badge Principal */}
                      <div className="relative shrink-0 w-20 h-20 rounded-lg overflow-hidden border bg-muted/20 group">
                        <img
                          src={currentUrl}
                          alt={`Foto ${index + 1}`}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = 'https://lojafy-supabase.d2x.site/storage/v1/object/public/system/placeholder.png';
                          }}
                        />

                        {image.isMain && (
                          <div className="absolute inset-x-0 bottom-0 bg-primary/90 text-primary-foreground text-[10px] font-bold text-center py-0.5 flex items-center justify-center gap-0.5">
                            <Star className="h-2.5 w-2.5 fill-current" />
                            Principal
                          </div>
                        )}

                        {(image.isUploading || isItemProcessing) && (
                          <div className="absolute inset-0 bg-black/60 backdrop-blur-[1px] flex items-center justify-center text-white">
                            <Loader2 className="h-5 w-5 animate-spin" />
                          </div>
                        )}
                      </div>

                      {/* Informações e URL da Imagem Específica */}
                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-xs font-semibold text-foreground">
                              Foto {index + 1}
                            </span>
                            {image.isMain && (
                              <Badge variant="default" className="text-[10px] px-1.5 py-0 h-4">
                                Foto Principal
                              </Badge>
                            )}
                            {isHosted ? (
                              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[10px] px-1.5 py-0 h-4">
                                <ShieldCheck className="h-3 w-3 mr-1" />
                                Hospedado no Servidor (Limpo)
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20 text-[10px] px-1.5 py-0 h-4">
                                <ExternalLink className="h-3 w-3 mr-1" />
                                Link Externo / ML
                              </Badge>
                            )}
                          </div>
                        </div>

                        {/* Campo de URL Específica da Imagem */}
                        <div className="flex items-center space-x-1.5">
                          <div className="relative flex-1">
                            <Input
                              readOnly
                              value={currentUrl}
                              className="h-8 text-xs font-mono bg-muted/30 text-muted-foreground pr-8 select-all"
                            />
                            <a 
                              href={currentUrl} 
                              target="_blank" 
                              rel="noreferrer"
                              className="absolute right-2 top-2 text-muted-foreground hover:text-foreground transition-colors"
                              title="Abrir imagem em nova aba"
                            >
                              <ArrowUpRight className="h-4 w-4" />
                            </a>
                          </div>
                          <Button
                            type="button"
                            size="icon"
                            variant="outline"
                            className="h-8 w-8 shrink-0"
                            onClick={() => copyToClipboard(currentUrl, image.id)}
                            title="Copiar URL da Imagem"
                          >
                            {copiedId === image.id ? (
                              <Check className="h-3.5 w-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Ações por Linha */}
                      <div className="flex items-center space-x-1.5 shrink-0 justify-end pt-1 md:pt-0">
                        {/* Botão de Processar/Sanitizar Individual */}
                        {!isHosted && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => handleProcessSingle(image)}
                            disabled={isItemProcessing || isBatchProcessing}
                            className="h-8 text-xs bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-600 border-emerald-500/30 dark:text-emerald-400"
                            title="Baixar, limpar metadados e subir para nosso servidor"
                          >
                            {isItemProcessing ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5 mr-1" />
                            )}
                            Subir para Nosso Servidor
                          </Button>
                        )}

                        {/* Definir Principal */}
                        {!image.isMain && (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setMainImage(image.id)}
                            disabled={isItemProcessing || isBatchProcessing}
                            className="h-8 text-xs text-muted-foreground hover:text-foreground"
                            title="Definir como imagem principal"
                          >
                            <Star className="h-3.5 w-3.5 mr-1" />
                            Definir Principal
                          </Button>
                        )}

                        {/* Remover */}
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          onClick={() => removeImage(image.id)}
                          disabled={isItemProcessing || isBatchProcessing}
                          className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                          title="Remover foto"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>

                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};