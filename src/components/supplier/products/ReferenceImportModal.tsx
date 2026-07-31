import { useState } from 'react';
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
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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
}

const DiffRow = ({ label, before, after }: { label: string; before: string; after: string }) => (
  <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 py-1 text-sm">
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label} (atual)</p>
      <p className="truncate">{before || '—'}</p>
    </div>
    <ArrowRight className="h-4 w-4 text-muted-foreground" />
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">Após importação</p>
      <p className="truncate font-medium">{after || '—'}</p>
    </div>
  </div>
);

/** Diff lado a lado + confirmação explícita, com toggles de preservação. */
export const ReferenceImportModal = ({
  candidate,
  product,
  onConfirm,
  onClose,
  isImporting,
}: ReferenceImportModalProps) => {
  const [applyImage, setApplyImage] = useState(false);
  const [applyPrice, setApplyPrice] = useState(false);

  if (!candidate) return null;

  const rawGtin = (candidate.raw_data as Record<string, unknown> | null)?.gtin as string | null;

  return (
    <Dialog open={!!candidate} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Importar dados de referência</DialogTitle>
          <DialogDescription>
            Revise o que muda. Foto, dimensões e preço do seu cadastro são preservados por padrão;
            você pode restaurar a versão anterior a qualquer momento.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1">
          <DiffRow label="Título" before={product.name} after={candidate.title ?? product.name} />
          <DiffRow label="Marca" before={product.brand ?? ''} after={candidate.brand ?? product.brand ?? ''} />
          <DiffRow label="GTIN" before={product.gtin_ean13 ?? ''} after={rawGtin ?? product.gtin_ean13 ?? ''} />
          <DiffRow
            label="Preço"
            before={product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            after={
              applyPrice && candidate.price != null
                ? candidate.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                : product.price.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
            }
          />
        </div>

        <Separator />

        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Checkbox id="apply-image" checked={applyImage} onCheckedChange={(c) => setApplyImage(!!c)} />
            <Label htmlFor="apply-image" className="text-sm">
              Substituir minha foto pela do anúncio de referência
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="apply-price" checked={applyPrice} onCheckedChange={(c) => setApplyPrice(!!c)} />
            <Label htmlFor="apply-price" className="text-sm">
              Substituir meu preço pelo do anúncio de referência
            </Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button
            onClick={() => onConfirm({ apply_image: applyImage, apply_price: applyPrice })}
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
