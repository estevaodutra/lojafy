import { ArrowRight, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import type { ReferenceCandidate, ImportOverrides } from '@/services/productReferenceService';

interface ProductSummary {
  name: string;
  description: string | null;
  brand: string | null;
  price: number;
  main_image_url: string | null;
  image_url: string | null;
  gtin_ean13: string | null;
}

interface ReferenceImportModalProps {
  candidate: ReferenceCandidate | null;
  product: ProductSummary;
  onConfirm: (overrides: ImportOverrides) => void;
  onClose: () => void;
  isImporting?: boolean;
  candidateDescription?: string;
}

const DiffRow = ({ label, before, after }: { label: string; before: string; after: string }) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 text-sm">
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label} (atual)</p>
      <p className="truncate">{before || '—'}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">Após importação</p>
      <p className="truncate font-medium text-primary">{after || '—'}</p>
    </div>
  </div>
);

/** Diff focado exclusivamente em Título, Descrição e Atributos. */
export const ReferenceImportModal = ({
  candidate,
  product,
  onConfirm,
  onClose,
  isImporting,
  candidateDescription,
}: ReferenceImportModalProps) => {
  if (!candidate) return null;

  const candidateDesc = candidateDescription || (candidate.raw_data as any)?.description as string | null;

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Confirmar Importação de Referência</DialogTitle>
          <DialogDescription>
            Serão atualizados o título, a descrição e a ficha técnica com os atributos oficiais do Mercado Livre. 
            Suas fotos e preços cadastrados serão mantidos intocados.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 my-2">
          {/* Título */}
          <DiffRow label="Título" before={product.name} after={candidate.title ?? product.name} />
          
          <Separator />

          {/* Descrição */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Descrição (atual)</p>
              <p className="truncate text-muted-foreground">{product.description || 'Nenhuma descrição cadastrada'}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground animate-pulse" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Após importação</p>
              <p className="truncate font-medium text-primary">
                {candidateDesc ? 'Nova descrição detalhada importada' : 'Mantém atual'}
              </p>
            </div>
          </div>

          <Separator />

          {/* Atributos */}
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1.5 text-sm">
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Especificações Técnicas</p>
              <p className="truncate">Especificações atuais</p>
            </div>
            <ArrowRight className="h-4 w-4 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Após importação</p>
              <p className="truncate font-medium text-primary">
                {candidate.attribute_count ?? 0} atributos oficiais do catálogo
              </p>
            </div>
          </div>
        </div>

        <DialogFooter className="mt-4">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ apply_image: false, apply_price: false })}
            disabled={isImporting}
          >
            {isImporting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirmar importação
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
