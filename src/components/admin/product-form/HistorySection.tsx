import React from 'react';
import { History, RotateCcw, Clock, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

interface HistorySectionProps {
  originalSavedAt?: string;
  onRestoreOriginal?: () => void;
}

export const HistorySection: React.FC<HistorySectionProps> = ({
  originalSavedAt,
  onRestoreOriginal,
}) => {
  const formattedDate = originalSavedAt
    ? new Date(originalSavedAt).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
    : 'Registro inicial';

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between border-b pb-2">
        <div className="flex items-center space-x-2">
          <History className="h-4 w-4 text-primary" />
          <span className="text-xs font-bold text-foreground">Histórico de Versões do Produto</span>
        </div>
        <Badge variant="outline" className="text-[10px] bg-muted">
          1 versão guardada
        </Badge>
      </div>

      <div className="border rounded-lg overflow-hidden bg-background">
        <Table>
          <TableHeader className="bg-muted/40">
            <TableRow className="h-8">
              <TableHead className="text-[11px] font-bold h-8 py-1">Versão / Evento</TableHead>
              <TableHead className="text-[11px] font-bold h-8 py-1">Data de Salvamento</TableHead>
              <TableHead className="text-[11px] font-bold h-8 py-1 text-right">Ação</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow className="h-10 text-xs">
              <TableCell className="font-medium flex items-center space-x-1.5">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                <span>Dados Originais Importados</span>
              </TableCell>

              <TableCell className="font-mono text-muted-foreground">
                {formattedDate}
              </TableCell>

              <TableCell className="text-right">
                {onRestoreOriginal && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={onRestoreOriginal}
                    className="h-7 text-xs text-primary hover:bg-primary/5"
                  >
                    <RotateCcw className="h-3.5 w-3.5 mr-1" />
                    Restaurar esta versão
                  </Button>
                )}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
};
