import React, { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Sparkles, Upload, Clipboard, Trash2, Loader2, CheckCircle2, AlertCircle, FileImage } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ExtractedData {
  name?: string;
  brand?: string;
  sku?: string;
  gtin_ean13?: string;
  description?: string;
  cost_price?: number;
  price?: number;
  specifications?: Array<{ key: string; value: string }>;
  variations?: Array<{
    type: string;
    name: string;
    value: string;
    costPrice?: number;
    stockQuantity?: number;
  }>;
}

interface AiProductExtractorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onApplyExtractedData: (data: ExtractedData, imageFiles: File[]) => void;
}

export const AiProductExtractorModal: React.FC<AiProductExtractorModalProps> = ({
  isOpen,
  onClose,
  onApplyExtractedData,
}) => {
  const [images, setImages] = useState<string[]>([]);
  const [rawFiles, setRawFiles] = useState<File[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [extractedResult, setExtractedResult] = useState<ExtractedData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Escutar evento de colar (Ctrl + V) quando o modal estiver aberto
  useEffect(() => {
    if (!isOpen) return;

    const handlePaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      const newImages: string[] = [];
      const newFiles: File[] = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.indexOf('image') !== -1) {
          const file = item.getAsFile();
          if (file) {
            newFiles.push(file);
            const reader = new FileReader();
            reader.onload = (event) => {
              if (event.target?.result) {
                setImages((prev) => [...prev, event.target!.result as string]);
              }
            };
            reader.readAsDataURL(file);
          }
        }
      }

      if (newFiles.length > 0) {
        setRawFiles((prev) => [...prev, ...newFiles]);
        toast.success(`${newFiles.length} imagem(ns) colada(s) com sucesso!`);
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, [isOpen]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const fileList = Array.from(files);
    setRawFiles((prev) => [...prev, ...fileList]);

    fileList.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target?.result) {
          setImages((prev) => [...prev, event.target!.result as string]);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
    setRawFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const compressImageForAi = (dataUrl: string, maxDim = 1024, quality = 0.75): Promise<string> => {
    return new Promise((resolve) => {
      const img = new Image();
      img.src = dataUrl;
      img.onload = () => {
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } else {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
    });
  };

  const handleExtractData = async () => {
    if (images.length === 0) {
      toast.error('Adicione pelo menos 1 print ou foto do produto.');
      return;
    }

    setIsLoading(true);
    setExtractedResult(null);

    try {
      // 1. Otimizar e compactar imagens antes do envio para evitar estouro de limite de payload HTTP 413
      const compressedImages = await Promise.all(
        images.map((img) => compressImageForAi(img, 1024, 0.75))
      );

      const { data, error } = await supabase.functions.invoke('ai-extract-product', {
        body: { images: compressedImages },
      });

      if (error) {
        let detail = error.message;
        try {
          if ((error as any).context) {
            const errBody = await (error as any).context.json();
            if (errBody?.error) detail = errBody.error;
          }
        } catch (e) {}
        throw new Error(detail || 'Erro ao comunicar com a função de IA');
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Não foi possível extrair os dados da imagem.');
      }

      setExtractedResult(data.data);
      toast.success('Dados do produto identificados com sucesso pela IA!');
    } catch (err: any) {
      console.error('Erro na extração IA:', err);
      toast.error(err.message || 'Falha ao processar imagens com a IA.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApply = () => {
    if (!extractedResult) return;
    onApplyExtractedData(extractedResult, rawFiles);
    toast.success('Informações aplicadas ao formulário!');
    handleClose();
  };

  const handleClose = () => {
    setImages([]);
    setRawFiles([]);
    setExtractedResult(null);
    setIsLoading(false);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5 text-amber-500 animate-pulse" />
            Cadastrar Produto via Foto / Print (IA)
          </DialogTitle>
          <DialogDescription className="text-xs">
            Tire um print da tela do produto (ex: fornecedor ou ficha técnica) e <strong>pressione Ctrl + V</strong> aqui, ou faça o upload da foto. A IA preencherá o formulário automaticamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Zona de Upload / Paste */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-primary/30 hover:border-primary bg-muted/20 hover:bg-muted/40 p-6 rounded-xl text-center cursor-pointer transition-all space-y-2 group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileSelect}
              multiple
              accept="image/*"
              className="hidden"
            />
            <div className="flex justify-center items-center gap-3">
              <div className="p-3 rounded-full bg-primary/10 text-primary group-hover:scale-110 transition-transform">
                <Upload className="h-6 w-6" />
              </div>
              <div className="p-3 rounded-full bg-amber-500/10 text-amber-600 group-hover:scale-110 transition-transform">
                <Clipboard className="h-6 w-6" />
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">
                Cole com <kbd className="px-1.5 py-0.5 text-[10px] font-mono bg-muted border rounded shadow-2xs">Ctrl + V</kbd> ou clique para selecionar fotos
              </p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Aceita prints de tela, fotos da embalagem, catálogo ou ficha técnica (PNG, JPG, WebP)
              </p>
            </div>
          </div>

          {/* Miniaturas das imagens adicionadas */}
          {images.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-muted-foreground flex items-center gap-1">
                  <FileImage className="h-3.5 w-3.5 text-primary" />
                  Imagens/Prints Capturados ({images.length})
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => { setImages([]); setRawFiles([]); setExtractedResult(null); }}
                  className="h-6 text-[10px] text-destructive hover:text-destructive"
                >
                  Limpar Todas
                </Button>
              </div>

              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2 max-h-36 overflow-y-auto p-1 border rounded-lg bg-background">
                {images.map((img, idx) => (
                  <div key={idx} className="relative group aspect-square rounded-md overflow-hidden border bg-muted">
                    <img src={img} alt={`Print ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); removeImage(idx); }}
                      className="absolute top-1 right-1 p-1 rounded-full bg-black/70 text-white opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Resultado Extraído da IA */}
          {extractedResult && (
            <div className="p-4 rounded-xl border bg-emerald-500/5 border-emerald-500/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Informações Identificadas pela IA:
                </span>
                <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                  Pronto para aplicar
                </Badge>
              </div>

              <div className="space-y-1.5 text-xs text-foreground/90 max-h-48 overflow-y-auto pr-1">
                {extractedResult.name && (
                  <div><strong>Nome:</strong> {extractedResult.name}</div>
                )}
                {extractedResult.brand && (
                  <div><strong>Marca:</strong> {extractedResult.brand}</div>
                )}
                {extractedResult.cost_price ? (
                  <div><strong>Preço Custo:</strong> R$ {extractedResult.cost_price.toFixed(2)}</div>
                ) : null}
                {extractedResult.price ? (
                  <div><strong>Preço Venda:</strong> R$ {extractedResult.price.toFixed(2)}</div>
                ) : null}
                {extractedResult.sku && (
                  <div><strong>SKU / Ref:</strong> {extractedResult.sku}</div>
                )}
                {extractedResult.gtin_ean13 && (
                  <div><strong>GTIN / EAN:</strong> {extractedResult.gtin_ean13}</div>
                )}
                {extractedResult.specifications && extractedResult.specifications.length > 0 && (
                  <div>
                    <strong>Atributos ({extractedResult.specifications.length}):</strong>{' '}
                    {extractedResult.specifications.map(s => `${s.key}: ${s.value}`).join(' | ')}
                  </div>
                )}
                {extractedResult.variations && extractedResult.variations.length > 0 && (
                  <div>
                    <strong>Variações ({extractedResult.variations.length}):</strong>{' '}
                    {extractedResult.variations.map(v => `${v.name} (${v.value})`).join(', ')}
                  </div>
                )}
                {extractedResult.description && (
                  <div className="pt-1 text-[11px] text-muted-foreground line-clamp-3">
                    <strong>Descrição:</strong> {extractedResult.description}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0 border-t pt-3">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} disabled={isLoading}>
            Cancelar
          </Button>

          {!extractedResult ? (
            <Button
              type="button"
              size="sm"
              onClick={handleExtractData}
              disabled={isLoading || images.length === 0}
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analisando Foto/Print com IA...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Extrair Dados com IA
                </>
              )}
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              onClick={handleApply}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Preencher Formulário
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
