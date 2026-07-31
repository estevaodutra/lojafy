import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from './useSupplierOrganization';
import {
  fetchCandidates,
  fetchImports,
  importReference,
  persistCandidates,
  restoreImport,
  searchMlCandidates,
  extractSearchKeywords,
  type ImportOverrides,
} from '@/services/productReferenceService';

export const useReferenceCandidates = (productId: string | undefined) => {
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  return useQuery({
    queryKey: orgId && productId
      ? supplierKeys.referenceCandidates(orgId, productId)
      : ['supplier', 'reference-candidates', 'pending'],
    queryFn: () => fetchCandidates(productId!),
    enabled: !!orgId && !!productId,
  });
};

export const useReferenceImports = (productId: string | undefined) => {
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  return useQuery({
    queryKey: orgId && productId
      ? supplierKeys.referenceImports(orgId, productId)
      : ['supplier', 'reference-imports', 'pending'],
    queryFn: () => fetchImports(productId!),
    enabled: !!orgId && !!productId,
  });
};

export const useReferenceMutations = (productId: string | undefined) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const orgId = orgData?.organization.id;

  const invalidate = () => {
    if (orgId) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgId) });
  };

  const search = useMutation({
    mutationFn: async (product: { name: string; price: number }) => {
      const candidates = await searchMlCandidates(product);
      if (candidates.length === 0) return [];
      return persistCandidates(productId!, extractSearchKeywords(product.name), candidates);
    },
    onSuccess: (candidates) => {
      invalidate();
      if (candidates.length === 0) {
        toast({ title: 'Nenhum anúncio de referência encontrado', variant: 'destructive' });
      } else {
        toast({ title: `${candidates.length} candidatos encontrados` });
      }
    },
    onError: (error: Error) => {
      toast({ title: 'Erro na busca de referências', description: error.message, variant: 'destructive' });
    },
  });

  const doImport = useMutation({
    mutationFn: async ({ candidateId, overrides }: { candidateId: string; overrides?: ImportOverrides }) => {
      const result = await importReference(productId!, candidateId, overrides);
      if (!result.success) throw new Error(result.error ?? 'Falha na importação');
      return result;
    },
    onSuccess: (result) => {
      invalidate();
      toast({
        title: 'Dados de referência importados',
        description:
          result.stage === 'stage_2_enabled'
            ? 'Produto habilitado para a loja.'
            : 'Produto aguarda revisão para habilitação.',
      });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao importar', description: error.message, variant: 'destructive' });
    },
  });

  const restore = useMutation({
    mutationFn: async (importId: string) => {
      const result = await restoreImport(importId);
      if (!result.success) throw new Error(result.error ?? 'Falha na restauração');
    },
    onSuccess: () => {
      invalidate();
      toast({ title: 'Versão anterior restaurada' });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao restaurar', description: error.message, variant: 'destructive' });
    },
  });

  return { search, doImport, restore };
};
