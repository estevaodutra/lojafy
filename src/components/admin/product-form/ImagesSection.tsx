import React, { useState, useEffect } from 'react';
import { ImageUploadArea, ImageFile } from '../ImageUploadArea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  Maximize2,
  Plus,
  Pencil,
  Trash2,
  AlertCircle
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from '@/hooks/use-toast';

export interface GalleryData {
  id: string;
  name: string;
  isMain: boolean;
  images: ImageFile[];
}

interface ImagesSectionProps {
  images: ImageFile[];
  onImagesChange: (images: ImageFile[]) => void;
  galleries?: GalleryData[];
  onGalleriesChange?: (galleries: GalleryData[]) => void;
  maxImages?: number;
  productId?: string;
}

export const ImagesSection: React.FC<ImagesSectionProps> = ({
  images,
  onImagesChange,
  galleries: controlledGalleries,
  onGalleriesChange,
  maxImages = 10,
  productId,
}) => {
  const { toast } = useToast();
  const [isManagerOpen, setIsManagerOpen] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Estados locais para controle de galerias (caso não sejam controladas pelo pai)
  const [internalGalleries, setInternalGalleries] = useState<GalleryData[]>([
    {
      id: 'default-main',
      name: 'Galeria Principal',
      isMain: true,
      images: images,
    }
  ]);

  const galleries = controlledGalleries && controlledGalleries.length > 0 
    ? controlledGalleries 
    : internalGalleries;

  // Galeria selecionada atualmente
  const [activeGalleryId, setActiveGalleryId] = useState<string>(() => {
    const main = galleries.find(g => g.isMain);
    return main?.id || galleries[0]?.id || 'default-main';
  });

  // Diálogos de criação e renomeação
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newGalleryName, setNewGalleryName] = useState('');
  
  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [renameGalleryId, setRenameGalleryId] = useState<string | null>(null);
  const [renamedName, setRenamedName] = useState('');

  const [deleteGalleryId, setDeleteGalleryId] = useState<string | null>(null);

  // Garantir que a galeria ativa exista
  const activeGallery = galleries.find(g => g.id === activeGalleryId) || galleries[0] || {
    id: 'default-main',
    name: 'Galeria Principal',
    isMain: true,
    images: images,
  };

  const updateGalleriesState = (newGalleries: GalleryData[]) => {
    if (onGalleriesChange) {
      onGalleriesChange(newGalleries);
    } else {
      setInternalGalleries(newGalleries);
    }
  };

  // Atualizar imagens da galeria ativa
  const handleActiveGalleryImagesChange = (newImages: ImageFile[]) => {
    const updated = galleries.map(g => {
      if (g.id === activeGallery.id) {
        return { ...g, images: newImages };
      }
      return g;
    });

    updateGalleriesState(updated);

    // Se for a galeria principal, sincroniza com onImagesChange do formulário
    if (activeGallery.isMain) {
      onImagesChange(newImages);
    }
  };

  // Definir galeria ativa como Principal
  const handleSetAsMainGallery = (galleryId: string) => {
    const target = galleries.find(g => g.id === galleryId);
    if (!target) return;

    const updated = galleries.map(g => ({
      ...g,
      isMain: g.id === galleryId,
    }));

    updateGalleriesState(updated);
    onImagesChange(target.images);

    toast({
      title: "Galeria Principal Atualizada ⭐",
      description: `A galeria "${target.name}" agora é a principal e será exibida na página pública do produto.`,
    });
  };

  // Criar nova galeria (sem submeter o formulário principal do produto)
  const handleCreateGallery = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const trimmed = newGalleryName.trim();
    if (!trimmed) {
      toast({
        title: "Nome obrigatório",
        description: "Digite um nome para a galeria (ex: Anúncio Facebook).",
        variant: "destructive",
      });
      return;
    }

    const newGal: GalleryData = {
      id: `gal-${Date.now()}`,
      name: trimmed,
      isMain: false,
      images: [],
    };

    const updated = [...galleries, newGal];
    updateGalleriesState(updated);
    setActiveGalleryId(newGal.id);
    setNewGalleryName('');
    setIsCreateOpen(false);

    // Abre imediatamente o gerenciador de upload para a galeria recém-criada
    setTimeout(() => {
      setIsManagerOpen(true);
    }, 120);

    toast({
      title: "Nova Galeria Criada!",
      description: `Galeria "${trimmed}" adicionada. O gerenciador de fotos foi aberto para você adicionar imagens.`,
    });
  };

  // Iniciar renomeação
  const handleStartRename = (gallery: GalleryData) => {
    setRenameGalleryId(gallery.id);
    setRenamedName(gallery.name);
    setIsRenameOpen(true);
  };

  // Salvar renomeação (sem submeter o formulário principal do produto)
  const handleSaveRename = (e?: React.SyntheticEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!renameGalleryId || !renamedName.trim()) return;

    const updated = galleries.map(g => 
      g.id === renameGalleryId ? { ...g, name: renamedName.trim() } : g
    );

    updateGalleriesState(updated);
    setIsRenameOpen(false);
    setRenameGalleryId(null);
    setRenamedName('');

    toast({
      title: "Galeria Renomeada",
      description: "O nome da galeria foi atualizado.",
    });
  };

  // Confirmar exclusão de galeria
  const handleConfirmDelete = () => {
    if (!deleteGalleryId) return;

    if (galleries.length <= 1) {
      toast({
        title: "Não é possível excluir",
        description: "O produto precisa ter pelo menos uma galeria de imagens.",
        variant: "destructive",
      });
      setDeleteGalleryId(null);
      return;
    }

    const galleryToDelete = galleries.find(g => g.id === deleteGalleryId);
    let remaining = galleries.filter(g => g.id !== deleteGalleryId);

    // Se a galeria excluída era a principal, a primeira restante passa a ser a principal
    if (galleryToDelete?.isMain && remaining.length > 0) {
      remaining = remaining.map((g, idx) => ({
        ...g,
        isMain: idx === 0,
      }));
      onImagesChange(remaining[0].images);
    }

    updateGalleriesState(remaining);

    // Se a galeria ativa foi a excluída, seleciona a primeira restante
    if (activeGalleryId === deleteGalleryId) {
      setActiveGalleryId(remaining[0].id);
    }

    setDeleteGalleryId(null);

    toast({
      title: "Galeria Removida",
      description: `A galeria "${galleryToDelete?.name}" foi removida.`,
    });
  };

  // Imagens da galeria ativa
  const currentImages = activeGallery.images || [];

  // Definir imagem de capa dentro da galeria ativa
  const setMainImage = (imageId: string) => {
    const updated = currentImages.map(img => ({
      ...img,
      isMain: img.id === imageId
    }));
    handleActiveGalleryImagesChange(updated);
    toast({
      title: "Capa da Galeria Atualizada",
      description: "A foto selecionada agora é a foto de capa desta galeria.",
    });
  };

  // Remover imagem da galeria ativa
  const removeImage = (imageId: string) => {
    const updated = currentImages.filter(img => img.id !== imageId);
    if (updated.length > 0 && !updated.some(img => img.isMain)) {
      updated[0].isMain = true;
    }
    handleActiveGalleryImagesChange(updated);
  };

  const copyUrl = (url: string, id: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    toast({ title: "URL copiada para a área de transferência!" });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const externalCount = currentImages.filter(img => {
    const url = img.url || img.preview || '';
    return url.includes('mlstatic.com') || url.includes('mercadolibre.com');
  }).length;

  return (
    <div className="space-y-4">
      {/* ── SELETOR DE GALERIAS (TABS) ── */}
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center space-x-2">
            <Layers className="h-4 w-4 text-purple-600" />
            <span className="text-xs font-bold text-foreground">
              Galerias do Produto ({galleries.length})
            </span>
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsCreateOpen(true)}
            className="h-7 text-xs font-semibold border-dashed border-primary/50 text-primary hover:bg-primary/5"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Criar Nova Galeria
          </Button>
        </div>

        {/* Lista de abas / botões das galerias */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {galleries.map(gal => {
            const isSelected = gal.id === activeGallery.id;
            return (
              <button
                key={gal.id}
                type="button"
                onClick={() => setActiveGalleryId(gal.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-all whitespace-nowrap ${
                  isSelected
                    ? 'bg-primary text-primary-foreground border-primary shadow-xs'
                    : 'bg-background hover:bg-muted text-muted-foreground hover:text-foreground border-border'
                }`}
              >
                {gal.isMain && (
                  <Star className={`h-3.5 w-3.5 ${isSelected ? 'fill-amber-300 text-amber-300' : 'fill-amber-400 text-amber-500'}`} />
                )}
                <span>{gal.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                  isSelected ? 'bg-white/20 text-white' : 'bg-muted text-muted-foreground'
                }`}>
                  {gal.images?.length || 0}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── BARRA DE CONTROLE DA GALERIA ATIVA ── */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-muted/40 rounded-xl border">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-foreground">{activeGallery.name}</span>
            <span className="text-xs text-muted-foreground">({currentImages.length} fotos)</span>
          </div>

          {activeGallery.isMain ? (
            <Badge variant="default" className="text-[10px] bg-amber-500/15 text-amber-700 hover:bg-amber-500/20 border-amber-300 dark:text-amber-400 gap-1 font-semibold">
              <Star className="h-3 w-3 fill-current text-amber-500" />
              Galeria Principal (Exibida na Loja)
            </Badge>
          ) : (
            <div className="flex items-center gap-1.5">
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                Galeria Secundária
              </Badge>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => handleSetAsMainGallery(activeGallery.id)}
                className="h-6 px-2 text-[11px] text-amber-700 dark:text-amber-400 border-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/30 gap-1"
                title="Tornar esta galeria a principal do produto"
              >
                <Star className="h-3 w-3 fill-current text-amber-500" />
                Definir como Principal
              </Button>
            </div>
          )}
        </div>

        <div className="flex items-center gap-1.5">
          {/* Renomear */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => handleStartRename(activeGallery)}
            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
            title="Renomear esta galeria"
          >
            <Pencil className="h-3 w-3 mr-1" />
            Renomear
          </Button>

          {/* Excluir (apenas se houver mais de uma) */}
          {galleries.length > 1 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setDeleteGalleryId(activeGallery.id)}
              className="h-7 px-2 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
              title="Excluir galeria"
            >
              <Trash2 className="h-3 w-3 mr-1" />
              Excluir
            </Button>
          )}
        </div>
      </div>

      {/* ── BARRA DE STATUS DAS IMAGENS DA GALERIA ATIVA & BOTÃO DE GERENCIADOR ── */}
      <div className="flex items-center justify-between gap-3 border-b pb-3">
        <div className="flex items-center space-x-2">
          <ImageIcon className="h-4 w-4 text-primary" />
          <span className="text-xs font-semibold text-foreground">
            Fotos em Grade ({currentImages.length}/{maxImages})
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

        {/* Botão para Abrir Modal de Uploads e URLs da Galeria Ativa */}
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
                Uploads & URLs: {activeGallery.name}
              </DialogTitle>
              <DialogDescription className="text-xs">
                Faça upload de fotos ou adicione URLs externas para esta galeria específica.
              </DialogDescription>
            </DialogHeader>

            <div className="pt-2">
              <ImageUploadArea
                images={currentImages}
                onImagesChange={handleActiveGalleryImagesChange}
                maxImages={maxImages}
                productId={productId}
              />
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* ── GRADE COMPACTA DE MINIATURAS DA GALERIA ATIVA ── */}
      {currentImages.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {currentImages.map((image, index) => {
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
                        <Star className="h-2.5 w-2.5 mr-0.5 fill-current" /> Capa
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
                        title="Definir como foto de capa desta galeria"
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
          <p className="text-xs text-muted-foreground">
            Nenhuma imagem cadastrada na galeria "{activeGallery.name}".
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsManagerOpen(true)}
            className="h-8 text-xs font-semibold"
          >
            Adicionar Imagens a esta Galeria
          </Button>
        </div>
      )}

      {/* ── MODAL: CRIAR NOVA GALERIA ── */}
      <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Layers className="h-5 w-5 text-primary" />
              Criar Nova Galeria de Imagens
            </DialogTitle>
            <DialogDescription className="text-xs">
              Crie uma galeria secundária para organizar variações de criativos, fotos de anúncio ou ensaios específicos.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="gallery-name" className="text-xs font-semibold">
                Nome da Galeria
              </Label>
              <Input
                id="gallery-name"
                placeholder="Ex: Anúncios Facebook, Criativos Instagram, Fotos Lifestyle"
                value={newGalleryName}
                onChange={(e) => setNewGalleryName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleCreateGallery(e);
                  }
                }}
                autoFocus
                className="h-9 text-xs"
              />
              <p className="text-[11px] text-muted-foreground">
                Dica: Dê um nome objetivo para facilitar a identificação pelos lojistas e afiliados.
              </p>
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsCreateOpen(false);
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleCreateGallery(e);
                }}
                className="text-xs font-semibold"
              >
                Criar Galeria
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── MODAL: RENOMEAR GALERIA ── */}
      <Dialog open={isRenameOpen} onOpenChange={setIsRenameOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2">
              <Pencil className="h-5 w-5 text-primary" />
              Renomear Galeria
            </DialogTitle>
            <DialogDescription className="text-xs">
              Altere o título de identificação desta galeria.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 pt-2">
            <div className="space-y-2">
              <Label htmlFor="rename-gallery" className="text-xs font-semibold">
                Novo Nome da Galeria
              </Label>
              <Input
                id="rename-gallery"
                value={renamedName}
                onChange={(e) => setRenamedName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.stopPropagation();
                    handleSaveRename(e);
                  }
                }}
                autoFocus
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setIsRenameOpen(false);
                }}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  handleSaveRename(e);
                }}
                className="text-xs font-semibold"
              >
                Salvar Nome
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── CONFIRMAÇÃO DE EXCLUSÃO DE GALERIA ── */}
      <AlertDialog open={!!deleteGalleryId} onOpenChange={() => setDeleteGalleryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="text-base flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-600" />
              Excluir Galeria?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              Tem certeza que deseja remover esta galeria? As fotos vinculadas exclusivamente a ela não aparecerão mais nas opções de download.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="text-xs">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="text-xs bg-red-600 hover:bg-red-700 text-white"
            >
              Sim, Excluir Galeria
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
