import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useReferenceMutations, useReferenceCandidates } from '@/hooks/supplier/useReferenceData';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { GtinStatusBadge, StageBadge } from '@/components/supplier/products/GtinStatusBadge';
import { ReferenceSearchGallery } from '@/components/supplier/products/ReferenceSearchGallery';
import { ReferenceImportModal } from '@/components/supplier/products/ReferenceImportModal';
import { ProductVersionHistory } from '@/components/supplier/products/ProductVersionHistory';
import ProductForm from '@/components/admin/ProductForm';
import type { ReferenceCandidate, ImportOverrides } from '@/services/productReferenceService';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

/** Hub de enriquecimento do fornecedor usando o formulário completo do superadmin como padrão. */
const SupplierProductDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const [importCandidate, setImportCandidate] = useState<ReferenceCandidate | null>(null);
  const [overviewCandidate, setOverviewCandidate] = useState<ReferenceCandidate | null>(null);
  const [overviewDetail, setOverviewDetail] = useState<any | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [candidateDescriptions, setCandidateDescriptions] = useState<Record<string, string>>({});
  const { search, doImport } = useReferenceMutations(id);
  const { data: candidates } = useReferenceCandidates(id);
  const [showGalleryToChange, setShowGalleryToChange] = useState(false);

  const handleUndoLink = async () => {
    try {
      const { error } = await supabase
        .from('products')
        .update({
          selected_reference_candidate_id: null,
          reference_item_id: null,
          stage: 'stage_1_basic',
          gtin_ean13: null,
          gtin_source: null,
          gtin_status: 'pending_confirmation'
        })
        .eq('id', product!.id);
      
      if (error) throw error;
      
      await supabase
        .from('product_reference_candidates')
        .update({ status: 'available' })
        .eq('product_id', product!.id);

      if (orgId) {
        queryClient.invalidateQueries({ queryKey: supplierKeys.product(orgId, id!) });
        queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
      }
      
      toast({ title: 'Vínculo desfeito com sucesso' });
    } catch (err: any) {
      toast({ title: 'Erro ao desfazer vínculo', description: err.message, variant: 'destructive' });
    }
  };

  const ensureDescriptionLoaded = async (candidate: ReferenceCandidate) => {
    const mlId = candidate.ml_item_id;
    if (!mlId || candidateDescriptions[mlId]) return;
    
    try {
      const { data: detailData, error: detailError } = await supabase.functions.invoke('ml-public-search', {
        body: { path: `/products/${mlId}` }
      });
      if (detailError) throw detailError;
      
      const descText = detailData?.short_description?.content || 'Sem descrição cadastrada.';
      setCandidateDescriptions(prev => ({ ...prev, [mlId]: descText }));
    } catch (err) {
      console.error('Erro ao buscar descrição do catálogo:', err);
      setCandidateDescriptions(prev => ({ ...prev, [mlId]: 'Erro ao carregar descrição.' }));
    }
  };

  const handleViewOverview = async (candidate: ReferenceCandidate) => {
    setOverviewCandidate(candidate);
    setOverviewDetail(null);
    setLoadingDetail(true);
    
    const mlId = candidate.ml_item_id;
    if (!mlId) {
      setLoadingDetail(false);
      return;
    }

    try {
      // 1. Fazer requisição em tempo real pro ML para obter todos os detalhes de catálogo
      const { data: detailData, error: detailError } = await supabase.functions.invoke('ml-public-search', {
        body: { path: `/products/${mlId}` }
      });
      if (detailError) throw detailError;
      setOverviewDetail(detailData);

      // 2. Extrair e salvar a descrição a partir do mesmo payload
      const descText = detailData?.short_description?.content || 'Sem descrição cadastrada.';
      setCandidateDescriptions(prev => ({ ...prev, [mlId]: descText }));
    } catch (err) {
      console.error('Erro ao carregar detalhes em tempo real do Mercado Livre:', err);
      toast({
        title: 'Erro de conexão',
        description: 'Não foi possível carregar os detalhes do Mercado Livre em tempo real.',
        variant: 'destructive'
      });
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleSelectImport = (candidate: ReferenceCandidate) => {
    setImportCandidate(candidate);
    ensureDescriptionLoaded(candidate);
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

  const activeCandidate = candidates?.find(
    c => c.id === product?.selected_reference_candidate_id || c.ml_item_id === product?.reference_item_id
  );

  const handleConfirmImport = (overrides: ImportOverrides) => {
    const hasGtin = importCandidate?.has_gtin || !!(importCandidate?.raw_data as any)?.gtin;
    const mlId = importCandidate!.ml_item_id;

    doImport.mutate(
      { candidateId: importCandidate!.id, overrides },
      { 
        onSuccess: async () => {
          setImportCandidate(null);
          setShowGalleryToChange(false);
          
          // Salva a descrição oficial e os atributos/especificações chave/valor se carregados
          const descText = candidateDescriptions[mlId];
          const updatePayload: any = {};
          
          if (descText && descText !== 'Erro ao carregar descrição.' && descText !== 'Descrição indisponível no Mercado Livre.') {
            updatePayload.description = descText;
          }

          const rawAttrs = (importCandidate?.raw_data as any)?.attributes || (overviewDetail?.attributes);
          if (Array.isArray(rawAttrs) && rawAttrs.length > 0) {
            const specObj: Record<string, string> = {};
            rawAttrs.forEach((attr: any) => {
              const name = attr.name || attr.id;
              const val = attr.value_name || attr.value;
              if (name && val) {
                specObj[name] = val;
              }
            });
            updatePayload.specifications = specObj;
          }

          if (Object.keys(updatePayload).length > 0) {
            const { error: updateError } = await supabase
              .from('products')
              .update(updatePayload)
              .eq('id', product!.id);
            if (updateError) console.error('Erro ao salvar especificações e descrição importadas:', updateError);
          }

          // Invalida a query do produto para atualizar a tela
          if (orgId) {
            queryClient.invalidateQueries({ queryKey: supplierKeys.product(orgId, id!) });
            queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
          }
        } 
      },
    );
  };

  if (isLoading || !product) {
    return <Skeleton className="h-96 w-full max-w-4xl" />;
  }

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
          <CardTitle className="text-base">Dados Completos do Produto</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductForm
            product={product}
            onSuccess={() => {
              if (orgId) {
                queryClient.invalidateQueries({ queryKey: supplierKeys.product(orgId, id!) });
                queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
              }
              toast({ title: 'Produto atualizado com sucesso' });
            }}
            onCancel={() => navigate('/supplier/produtos')}
          />
        </CardContent>
      </Card>

      <Separator />

      {product.selected_reference_candidate_id || product.reference_item_id ? (
        !showGalleryToChange && activeCandidate ? (
          <Card className="border border-green-200/50 bg-green-50/10 shadow-sm dark:bg-green-950/10">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div>
                <CardTitle className="text-base font-semibold text-green-700 dark:text-green-400">
                  Referência Vinculada Ativa
                </CardTitle>
                <p className="text-xs text-muted-foreground">
                  Este produto está enriquecido e vinculado a um anúncio do Mercado Livre.
                </p>
              </div>
              <Badge variant="outline" className="border-green-600/30 text-green-600 font-mono">
                {activeCandidate.ml_item_id}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-4">
                {activeCandidate.image_url && (
                  <img
                    src={activeCandidate.image_url}
                    alt=""
                    className="h-16 w-16 rounded-md border object-contain bg-white"
                  />
                )}
                <div className="min-w-0 flex-1 space-y-1">
                  <h4 className="text-sm font-medium line-clamp-1">{activeCandidate.title}</h4>
                  <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    {activeCandidate.brand && <span>Marca: {activeCandidate.brand}</span>}
                    {activeCandidate.model && <span>Modelo: {activeCandidate.model}</span>}
                    {activeCandidate.price && (
                      <span className="font-semibold text-foreground">
                        Preço ML: {activeCandidate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 pt-2 border-t border-border/40">
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => handleViewOverview(activeCandidate)}
                >
                  Ver referência
                </Button>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => setShowGalleryToChange(true)}
                >
                  Trocar referência
                </Button>
                <Button 
                  size="sm" 
                  variant="destructive"
                  onClick={() => {
                    if (window.confirm("Tem certeza que deseja desfazer o vínculo com esta referência? Os dados já importados continuarão salvos, mas o produto voltará para o estágio básico.")) {
                      handleUndoLink();
                    }
                  }}
                >
                  Desfazer vínculo
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-muted-foreground">Substituindo referência vinculada</span>
              <Button size="sm" variant="ghost" onClick={() => setShowGalleryToChange(false)}>
                Cancelar alteração
              </Button>
            </div>
            <ReferenceSearchGallery
              productId={product.id}
              onSearch={() => search.mutate({ name: product.name, price: product.price })}
              isSearching={search.isPending}
              onSelect={handleSelectImport}
              onViewOverview={handleViewOverview}
            />
          </div>
        )
      ) : (
        <ReferenceSearchGallery
          productId={product.id}
          onSearch={() => search.mutate({ name: product.name, price: product.price })}
          isSearching={search.isPending}
          onSelect={handleSelectImport}
          onViewOverview={handleViewOverview}
        />
      )}

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
        candidateDescription={candidateDescriptions[importCandidate?.ml_item_id ?? '']}
        onConfirm={handleConfirmImport}
        onClose={() => setImportCandidate(null)}
        isImporting={doImport.isPending}
      />

      <Dialog open={!!overviewCandidate} onOpenChange={(open) => !open && setOverviewCandidate(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Visão Geral do Produto de Referência</DialogTitle>
            <DialogDescription>
              Ficha técnica, especificações e descrição oficial obtidas em tempo real do catálogo do Mercado Livre.
            </DialogDescription>
          </DialogHeader>

          {overviewCandidate && (
            <div className="space-y-6 pt-4">
              {/* Cabeçalho do Produto */}
              <div className="flex items-start gap-4">
                {(() => {
                  const imageUrl = overviewDetail?.pictures?.[0]?.secure_url || 
                                   overviewDetail?.pictures?.[0]?.url || 
                                   overviewCandidate.image_url;
                  return imageUrl && (
                    <img
                      src={imageUrl}
                      alt=""
                      className="h-28 w-28 rounded-md border object-contain bg-white"
                    />
                  );
                })()}
                
                <div className="space-y-1 flex-1">
                  <h4 className="font-semibold text-lg">
                    {overviewDetail?.name || overviewCandidate.title}
                  </h4>
                  <p className="text-xl font-bold text-primary">
                    {(() => {
                      const price = overviewDetail?.price ?? overviewCandidate.price;
                      return price != null
                        ? price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                        : 'Preço sob consulta';
                    })()}
                  </p>
                  
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(() => {
                      const brand = overviewDetail?.attributes?.find((a: any) => a.id === 'BRAND')?.value_name || overviewCandidate.brand;
                      return brand && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                          Marca: {brand}
                        </span>
                      );
                    })()}
                    {(() => {
                      const model = overviewDetail?.attributes?.find((a: any) => a.id === 'MODEL')?.value_name || overviewCandidate.model;
                      return model && (
                        <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-medium">
                          Modelo: {model}
                        </span>
                      );
                    })()}
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full font-mono">
                      ID: {overviewCandidate.ml_item_id}
                    </span>
                  </div>
                </div>
              </div>

              {/* Descrição */}
              <div>
                <h5 className="font-semibold text-sm mb-2">
                  Descrição do Produto
                </h5>
                <div className="rounded-md border p-4 bg-muted/10 text-xs text-muted-foreground whitespace-pre-wrap leading-relaxed max-h-[250px] overflow-y-auto font-sans">
                  {candidateDescriptions[overviewCandidate.ml_item_id] === undefined ? (
                    <div className="flex items-center gap-2 py-1">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span>Buscando descrição em tempo real...</span>
                    </div>
                  ) : (
                    candidateDescriptions[overviewCandidate.ml_item_id]
                  )}
                </div>
              </div>

              <Separator />

              {/* Ficha Técnica */}
              <div>
                <h5 className="font-semibold text-sm mb-3">Ficha Técnica e Atributos</h5>
                
                {loadingDetail ? (
                  <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground border rounded-md border-dashed">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                    <span>Carregando atributos em tempo real da API do Mercado Livre...</span>
                  </div>
                ) : (
                  <div className="border rounded-md overflow-hidden bg-muted/20">
                    <div className="grid grid-cols-2 bg-muted/40 font-medium text-xs border-b py-2 px-3">
                      <div>Nome do Atributo</div>
                      <div>Valor Especificado</div>
                    </div>
                    <div className="divide-y text-sm">
                      {(() => {
                        const attributes = overviewDetail?.attributes || (overviewCandidate.raw_data as any)?.attributes || [];
                        return attributes.length === 0 ? (
                          <div className="py-4 text-center text-muted-foreground text-xs">
                            Nenhum atributo adicional disponível.
                          </div>
                        ) : (
                          attributes.map((attr: any) => (
                            <div key={attr.id} className="grid grid-cols-2 py-2 px-3 gap-4 hover:bg-muted/10">
                              <div className="font-medium text-muted-foreground text-xs">{attr.name || attr.id}</div>
                              <div className="text-xs font-semibold">{attr.value_name || '—'}</div>
                            </div>
                          ))
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SupplierProductDetail;
