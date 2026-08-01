import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Image as ImageIcon, Trash2, Star, Plus, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useReferenceMutations } from '@/hooks/supplier/useReferenceData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  StageOneProductForm,
  type StageOneFormValues,
} from '@/components/supplier/products/StageOneProductForm';
import { GtinStatusBadge, StageBadge } from '@/components/supplier/products/GtinStatusBadge';
import { ReferenceSearchGallery } from '@/components/supplier/products/ReferenceSearchGallery';
import { ReferenceImportModal } from '@/components/supplier/products/ReferenceImportModal';
import { ProductVersionHistory } from '@/components/supplier/products/ProductVersionHistory';
import type { ReferenceCandidate, ImportOverrides } from '@/services/productReferenceService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

// Função para gerar EAN-13 válido (padrão GS1 Brasil com prefixo 789 e checksum)
const generateRandomEan13 = (): string => {
  let ean = '789';
  for (let i = 0; i < 9; i++) {
    ean += Math.floor(Math.random() * 10).toString();
  }
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    let val = parseInt(ean[i], 10);
    sum += val * (i % 2 === 0 ? 1 : 3);
  }
  let checkDigit = (10 - (sum % 10)) % 10;
  return ean + checkDigit.toString();
};

/** Hub de enriquecimento: dados do Estágio 1 + busca/import de referências + histórico. */
const SupplierProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const [importCandidate, setImportCandidate] = useState<ReferenceCandidate | null>(null);
  const [overviewCandidate, setOverviewCandidate] = useState<ReferenceCandidate | null>(null);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const { search, doImport } = useReferenceMutations(id);

  // Mutação para atualizar a galeria de imagens
  const updateGalleryMutation = useMutation({
    mutationFn: async ({ newImages, newMainImage }: { newImages: string[], newMainImage: string | null }) => {
      const { error } = await supabase
        .from('products')
        .update({
          images: newImages,
          main_image_url: newMainImage,
          image_url: newMainImage // retrocompatibilidade
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.product(orgId, id!) });
      toast({ title: 'Galeria de imagens atualizada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar galeria', description: error.message, variant: 'destructive' });
    }
  });

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    if (!newPhotoUrl.startsWith('http')) {
      toast({ title: 'URL inválida', description: 'A URL deve começar com http ou https', variant: 'destructive' });
      return;
    }
    const currentImages = product?.images ? [...product.images] : [];
    if (currentImages.includes(newPhotoUrl.trim())) {
      toast({ title: 'Imagem duplicada', description: 'Esta imagem já está na galeria', variant: 'destructive' });
      return;
    }
    
    const newImages = [...currentImages, newPhotoUrl.trim()];
    const newMainImage = product?.main_image_url || newImages[0];
    
    updateGalleryMutation.mutate({ newImages, newMainImage });
    setNewPhotoUrl('');
  };

  const handleRemovePhoto = (urlToRemove: string) => {
    const currentImages = product?.images ? [...product.images] : [];
    const newImages = currentImages.filter(url => url !== urlToRemove);
    let newMainImage = product?.main_image_url;
    
    if (newMainImage === urlToRemove) {
      newMainImage = newImages.length > 0 ? newImages[0] : null;
    }
    
    updateGalleryMutation.mutate({ newImages, newMainImage });
  };

  const handleSetMainPhoto = (urlToMain: string) => {
    const currentImages = product?.images ? [...product.images] : [];
    updateGalleryMutation.mutate({ newImages: currentImages, newMainImage: urlToMain });
  };

  const { data: product, isLoading } = useQuery({
    queryKey: orgId && id ? supplierKeys.product(orgId, id) : ['supplier', 'product', 'pending'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!orgId && !!id,
  });

  const updateMutation = useMutation({
    mutationFn: async (values: StageOneFormValues) => {
      const { error } = await supabase
        .from('products')
        .update({
          name: values.name,
          description: values.description,
          price: values.price,
          weight: values.weight,
          height: values.height,
          width: values.width,
          length: values.length,
          main_image_url: values.photo_url,
        })
        .eq('id', id!);
      if (error) throw error;
    },
    onSuccess: () => {
      if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
      toast({ title: 'Produto atualizado' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  if (isLoading || !product) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }

  const handleConfirmImport = (overrides: ImportOverrides) => {
    const hasGtin = importCandidate?.has_gtin || !!(importCandidate?.raw_data as any)?.gtin;

    doImport.mutate(
      { candidateId: importCandidate!.id, overrides },
      { 
        onSuccess: async () => {
          setImportCandidate(null);
          
          if (!hasGtin) {
            const autoGtin = generateRandomEan13();
            const { error: updateGtinError } = await supabase
              .from('products')
              .update({ 
                gtin_ean13: autoGtin,
                gtin_status: 'valid'
              })
              .eq('id', product.id);
              
            if (updateGtinError) {
              console.error('Erro ao salvar GTIN automático:', updateGtinError);
            } else {
              toast({ 
                title: 'GTIN Gerado Automaticamente', 
                description: `O produto importado não possuía GTIN. Geramos o código ${autoGtin} automaticamente.` 
              });
              if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
            }
          }
        } 
      },
    );
  };

  return (
    <div className="max-w-4xl space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/supplier/produtos')}>
          <ArrowLeft className="mr-1 h-4 w-4" />
          Voltar
        </Button>
        <div className="flex-1 min-w-0">
          <h1 className="truncate text-2xl font-bold">{product.name}</h1>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {product.sku && <span className="font-mono">{product.sku}</span>}
            <StageBadge stage={product.stage} />
            <GtinStatusBadge status={product.gtin_status} />
          </div>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Dados básicos (Estágio 1)</CardTitle>
        </CardHeader>
        <CardContent>
          <StageOneProductForm
            defaultValues={{
              photo_url: product.main_image_url ?? product.image_url ?? '',
              name: product.name,
              description: product.description ?? '',
              price: product.price,
              weight: product.weight ?? undefined,
              height: product.height ?? undefined,
              width: product.width ?? undefined,
              length: product.length ?? undefined,
            }}
            onSubmit={(values) => updateMutation.mutate(values)}
            isSubmitting={updateMutation.isPending}
            submitLabel="Salvar alterações"
          />
        </CardContent>
      </Card>

      {/* Card de Galeria de Imagens */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-primary" />
            Galeria de Imagens ({product.images?.length || 0})
          </CardTitle>
          <CardDescription>
            Gerencie a galeria de fotos do produto. A foto destacada com a estrela cheia é a imagem principal.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Lista de Imagens */}
          {product.images && product.images.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
              {product.images.map((url: string, index: number) => {
                const isMain = url === product.main_image_url;
                return (
                  <div 
                    key={index} 
                    className={`relative aspect-square rounded-lg overflow-hidden border group transition-all duration-200
                      ${isMain ? 'border-primary ring-2 ring-primary/20 shadow-md' : 'border-muted hover:border-primary/50'}`}
                  >
                    <img 
                      src={url} 
                      alt={`Imagem ${index + 1}`} 
                      className="object-cover w-full h-full"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = 'https://placehold.co/300x300/e2e8f0/64748b?text=Sem+Foto';
                      }}
                    />
                    
                    {/* Overlay com Ações rápidas */}
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-8 w-8 text-white hover:text-yellow-400 hover:bg-white/10"
                        onClick={() => handleSetMainPhoto(url)}
                        title={isMain ? "Foto Principal" : "Definir como Principal"}
                      >
                        <Star className={`h-4 w-4 ${isMain ? 'fill-yellow-400 text-yellow-400' : ''}`} />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        type="button"
                        className="h-8 w-8 text-white hover:text-red-500 hover:bg-white/10"
                        onClick={() => handleRemovePhoto(url)}
                        title="Remover Imagem"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    {/* Selo de Principal */}
                    {isMain && (
                      <div className="absolute top-1.5 left-1.5 bg-primary text-primary-foreground text-[10px] font-semibold px-1.5 py-0.5 rounded shadow flex items-center gap-0.5 select-none">
                        <Star className="h-2.5 w-2.5 fill-current" /> Principal
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 border border-dashed rounded-lg text-muted-foreground text-sm flex flex-col items-center justify-center gap-1">
              <ImageIcon className="h-8 w-8 opacity-40 mb-1" />
              Nenhuma imagem adicional na galeria.
            </div>
          )}

          {/* Adicionar Nova Imagem */}
          <div className="pt-4 border-t space-y-2">
            <Label htmlFor="new-image-url" className="text-sm font-semibold">Adicionar nova imagem por link</Label>
            <div className="flex gap-2">
              <Input
                id="new-image-url"
                placeholder="Cole aqui o link da imagem (https://...)"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                disabled={updateGalleryMutation.isPending}
              />
              <Button 
                type="button"
                onClick={handleAddPhoto} 
                disabled={updateGalleryMutation.isPending || !newPhotoUrl.trim()}
                className="gap-1 shrink-0"
              >
                {updateGalleryMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Separator />

      <ReferenceSearchGallery
        productId={product.id}
        onSearch={() => search.mutate({ name: product.name, price: product.price })}
        isSearching={search.isPending}
        onSelect={setImportCandidate}
        onViewOverview={setOverviewCandidate}
      />

      <ProductVersionHistory productId={product.id} />

      <ReferenceImportModal
        candidate={importCandidate}
        product={{
          name: product.name,
          description: product.description,
          brand: product.brand,
          price: product.price,
          main_image_url: product.main_image_url,
          image_url: product.image_url,
          gtin_ean13: product.gtin_ean13,
        }}
        onConfirm={handleConfirmImport}
        onClose={() => setImportCandidate(null)}
        isImporting={doImport.isPending}
      />

      <Dialog open={!!overviewCandidate} onOpenChange={(open) => !open && setOverviewCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visão Geral do Produto de Referência</DialogTitle>
            <DialogDescription>
              Ficha técnica e especificações oficiais do catálogo do Mercado Livre.
            </DialogDescription>
          </DialogHeader>

          {overviewCandidate && (
            <div className="space-y-6 pt-4">
              <div className="flex items-start gap-4">
                {overviewCandidate.image_url && (
                  <img
                    src={overviewCandidate.image_url}
                    alt=""
                    className="h-28 w-28 rounded-md border object-contain bg-white"
                  />
                )}
                <div className="space-y-1">
                  <h4 className="font-semibold text-lg">{overviewCandidate.title}</h4>
                  <p className="text-xl font-bold text-primary">
                    {overviewCandidate.price != null
                      ? overviewCandidate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                      : 'Preço sob consulta'}
                  </p>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {overviewCandidate.brand && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                        Marca: {overviewCandidate.brand}
                      </span>
                    )}
                    {overviewCandidate.model && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                        Modelo: {overviewCandidate.model}
                      </span>
                    )}
                    {overviewCandidate.ml_item_id && (
                      <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">
                        ID: {overviewCandidate.ml_item_id}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-semibold text-sm mb-3">Atributos e Ficha Técnica</h5>
                <div className="border rounded-md overflow-hidden bg-muted/20">
                  <div className="grid grid-cols-2 bg-muted/40 font-medium text-xs border-b py-2 px-3">
                    <div>Nome do Atributo</div>
                    <div>Valor Especificado</div>
                  </div>
                  <div className="divide-y text-sm">
                    {((overviewCandidate.raw_data as any)?.attributes?.length ?? 0) === 0 ? (
                      <div className="py-4 text-center text-muted-foreground text-xs">
                        Nenhum atributo adicional disponível.
                      </div>
                    ) : (
                      (overviewCandidate.raw_data as any).attributes.map((attr: any) => (
                        <div key={attr.id} className="grid grid-cols-2 py-2 px-3 gap-4 hover:bg-muted/10">
                          <div className="font-medium text-muted-foreground text-xs">{attr.name || attr.id}</div>
                          <div className="text-xs font-semibold">{attr.value_name || '—'}</div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierProductDetail;
