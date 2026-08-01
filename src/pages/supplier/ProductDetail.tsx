import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import { useReferenceMutations } from '@/hooks/supplier/useReferenceData';
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
  const { search, doImport } = useReferenceMutations(id);

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
              .eq('id', product!.id);
              
            if (updateGtinError) {
              console.error('Erro ao salvar GTIN automático:', updateGtinError);
            } else {
              toast({ 
                title: 'GTIN Gerado Automaticamente', 
                description: `O produto importado não possuía GTIN. Geramos o código ${autoGtin} automaticamente.` 
              });
            }
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
