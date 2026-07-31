import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { FileSpreadsheet, Loader2, Upload } from 'lucide-react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { parseTrackingCsv, type TrackingImportRow } from '@/services/supplierFulfillmentService';
import { useFulfillmentMutations } from '@/hooks/supplier/useSupplierFulfillments';

interface TrackingImportDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TrackingImportDialog = ({ isOpen, onClose }: TrackingImportDialogProps) => {
  const [rows, setRows] = useState<TrackingImportRow[]>([]);
  const [markAsShipped, setMarkAsShipped] = useState(true);
  const { trackingImport } = useFulfillmentMutations();

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const text = await file.text();
    setRows(parseTrackingCsv(text));
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    downloadCsv(
      'lojafy_modelo_rastreios.csv',
      buildCsv(['pedido', 'rastreio', 'transportadora'], [['PED-0001', 'BR123456789BR', 'Correios']]),
    );
  };

  const handleImport = () => {
    trackingImport.mutate(
      { rows, markAsShipped },
      {
        onSuccess: () => {
          setRows([]);
          onClose();
        },
      },
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Importar rastreios (CSV)</DialogTitle>
          <DialogDescription>
            Colunas: pedido; rastreio; transportadora.{' '}
            <button className="underline" onClick={downloadTemplate} type="button">
              Baixar modelo
            </button>
          </DialogDescription>
        </DialogHeader>

        {rows.length === 0 ? (
          <div
            {...getRootProps()}
            className={`cursor-pointer rounded-md border-2 border-dashed p-8 text-center ${
              isDragActive ? 'border-primary bg-primary/5' : 'border-muted'
            }`}
          >
            <input {...getInputProps()} />
            <FileSpreadsheet className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Arraste o CSV aqui ou clique para selecionar
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <ScrollArea className="h-48 rounded-md border p-2">
              {rows.map((row, i) => (
                <div key={i} className="flex justify-between py-1 text-sm">
                  <span className="font-medium">#{row.orderNumber}</span>
                  <span className="font-mono">{row.trackingCode}</span>
                  <span className="text-muted-foreground">{row.carrier ?? '—'}</span>
                </div>
              ))}
            </ScrollArea>
            <div className="flex items-center gap-2">
              <Checkbox
                id="mark-shipped"
                checked={markAsShipped}
                onCheckedChange={(c) => setMarkAsShipped(!!c)}
              />
              <Label htmlFor="mark-shipped" className="text-sm">
                Confirmar postagem (marcar como enviado quando a etiqueta estiver pronta)
              </Label>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => (rows.length ? setRows([]) : onClose())}>
            {rows.length ? 'Voltar' : 'Cancelar'}
          </Button>
          <Button onClick={handleImport} disabled={rows.length === 0 || trackingImport.isPending}>
            {trackingImport.isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Upload className="mr-2 h-4 w-4" />
            )}
            Importar {rows.length > 0 && `(${rows.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
