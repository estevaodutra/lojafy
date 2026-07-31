import { format } from 'date-fns';
import { History, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useReferenceImports, useReferenceMutations } from '@/hooks/supplier/useReferenceData';

/** Lista de importações de referência com restauração da versão anterior. */
export const ProductVersionHistory = ({ productId }: { productId: string }) => {
  const { data: imports, isLoading } = useReferenceImports(productId);
  const { restore } = useReferenceMutations(productId);

  if (isLoading || (imports?.length ?? 0) === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <History className="h-4 w-4" />
          Histórico de importações
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {imports!.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between rounded-md border p-2 text-sm">
            <div>
              <p className="font-medium">Referência {entry.ml_item_id ?? '—'}</p>
              <p className="text-xs text-muted-foreground">
                {format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm')}
              </p>
            </div>
            <Button
              size="sm"
              variant="outline"
              onClick={() => restore.mutate(entry.id)}
              disabled={restore.isPending}
            >
              <RotateCcw className="mr-1 h-3 w-3" />
              Restaurar versão anterior
            </Button>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
