import { useRef, useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Download, Loader2, Upload } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import {
  parseStockCsv,
  importStockCsv,
  exportStockCsv,
  type StockOverviewRow,
} from '@/services/inventoryService';
import { buildCsv, downloadCsv } from '@/lib/csv';
import { Button } from '@/components/ui/button';

interface StockImportExportProps {
  rows: StockOverviewRow[];
}

/** Import (correção absoluta por SKU) e export CSV da visão de estoque. */
export const StockImportExport = ({ rows }: StockImportExportProps) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: orgData } = useSupplierOrganization();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const text = await file.text();
      const parsed = parseStockCsv(text);
      if (parsed.length === 0) throw new Error('Nenhuma linha válida (colunas: sku; quantidade)');
      return importStockCsv(parsed, orgData!.organization.id);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgData!.organization.id) });
      toast({
        title: `${result.applied} SKUs atualizados`,
        description: result.errors.length > 0 ? `${result.errors.length} com erro` : undefined,
        variant: result.errors.length > 0 ? 'destructive' : 'default',
      });
    },
    onError: (error: Error) =>
      toast({ title: 'Erro na importação', description: error.message, variant: 'destructive' }),
    onSettled: () => setImporting(false),
  });

  const downloadTemplate = () => {
    downloadCsv('lojafy_modelo_estoque.csv', buildCsv(['sku', 'quantidade'], [['LJF-XXXX-GEN-00001', '10']]));
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".csv,.txt"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setImporting(true);
            importMutation.mutate(file);
          }
          e.target.value = '';
        }}
      />
      <Button variant="outline" size="sm" onClick={() => fileRef.current?.click()} disabled={importing}>
        {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
        Importar CSV
      </Button>
      <Button variant="ghost" size="sm" onClick={downloadTemplate}>
        Modelo
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportStockCsv(rows)} disabled={rows.length === 0}>
        <Download className="mr-2 h-4 w-4" />
        Exportar CSV
      </Button>
    </div>
  );
};
