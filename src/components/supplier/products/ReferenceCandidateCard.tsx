import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { CheckCircle2, XCircle } from 'lucide-react';
import type { ReferenceCandidate } from '@/services/productReferenceService';

interface ReferenceCandidateCardProps {
  candidate: ReferenceCandidate;
  onSelect: (candidate: ReferenceCandidate) => void;
}

export const ReferenceCandidateCard = ({ candidate, onSelect }: ReferenceCandidateCardProps) => (
  <Card className="flex flex-col">
    <CardContent className="flex-1 pt-4 space-y-2">
      <div className="flex items-start gap-3">
        {candidate.image_url && (
          <img
            src={candidate.image_url}
            alt=""
            className="h-20 w-20 rounded-md border object-contain bg-white"
          />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium line-clamp-2">{candidate.title}</p>
          <p className="text-lg font-bold">
            {candidate.price != null
              ? candidate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
              : '—'}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-1 text-xs">
        <Badge variant="outline">Score {candidate.compatibility_score ?? 0}</Badge>
        <Badge variant="outline">{candidate.attribute_count ?? 0} atributos</Badge>
        {candidate.has_gtin ? (
          <Badge className="gap-1">
            <CheckCircle2 className="h-3 w-3" /> GTIN
          </Badge>
        ) : (
          <Badge variant="secondary" className="gap-1">
            <XCircle className="h-3 w-3" /> Sem GTIN
          </Badge>
        )}
      </div>

      <div className="space-y-0.5 text-xs text-muted-foreground">
        {candidate.brand && <p>Marca: {candidate.brand}</p>}
        {candidate.model && <p>Modelo: {candidate.model}</p>}
        {candidate.ml_category_id && <p>Categoria ML: {candidate.ml_category_id}</p>}
        <p className="font-mono">{candidate.ml_item_id}</p>
      </div>
    </CardContent>
    <CardFooter>
      <Button className="w-full" size="sm" onClick={() => onSelect(candidate)}>
        Usar produto de referência
      </Button>
    </CardFooter>
  </Card>
);
