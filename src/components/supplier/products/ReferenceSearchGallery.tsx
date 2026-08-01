import { Loader2, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { ReferenceCandidateCard } from './ReferenceCandidateCard';
import { useReferenceCandidates } from '@/hooks/supplier/useReferenceData';
import type { ReferenceCandidate } from '@/services/productReferenceService';

interface ReferenceSearchGalleryProps {
  productId: string;
  onSearch: () => void;
  isSearching: boolean;
  onSelect: (candidate: ReferenceCandidate) => void;
  onViewOverview?: (candidate: ReferenceCandidate) => void;
}

/** Galeria de candidatos persistidos + botão de (re)busca no Mercado Livre. */
export const ReferenceSearchGallery = ({
  productId,
  onSearch,
  isSearching,
  onSelect,
  onViewOverview,
}: ReferenceSearchGalleryProps) => {
  const { data: candidates, isLoading } = useReferenceCandidates(productId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">Produtos de referência (Mercado Livre)</h3>
          <p className="text-sm text-muted-foreground">
            Selecione um anúncio equivalente para importar categoria, atributos, marca e GTIN.
          </p>
        </div>
        <Button onClick={onSearch} disabled={isSearching} variant="outline">
          {isSearching ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Search className="mr-2 h-4 w-4" />
          )}
          {candidates && candidates.length > 0 ? 'Buscar novamente' : 'Buscar referências'}
        </Button>
      </div>

      {isLoading || isSearching ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[...Array(3)].map((_, i) => (
            <Skeleton key={i} className="h-56 w-full" />
          ))}
        </div>
      ) : (candidates?.length ?? 0) === 0 ? (
        <p className="rounded-md border border-dashed p-8 text-center text-sm text-muted-foreground">
          Nenhum candidato ainda. Clique em “Buscar referências” para procurar anúncios
          equivalentes ao seu produto.
        </p>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {candidates!.map((candidate) => (
            <ReferenceCandidateCard
              key={candidate.id}
              candidate={candidate}
              onSelect={onSelect}
              onViewOverview={onViewOverview}
            />
          ))}
        </div>
      )}
    </div>
  );
};
