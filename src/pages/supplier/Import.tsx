import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, FileSpreadsheet, Loader2, Search, Upload, XCircle, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { parseCsv, csvRowsToObjects, buildCsv, downloadCsv } from '@/lib/csv';
import { supplierKeys } from '@/lib/supplierQueryKeys';
import { useSupplierOrganization } from '@/hooks/supplier/useSupplierOrganization';
import {
  searchMlCandidates,
  persistCandidates,
  extractSearchKeywords,
} from '@/services/productReferenceService';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ParsedRow {
  photo_url: string;
  photo_urls: string[];
  title: string;
  description: string;
  weight: number;
  height: number;
  width: number;
  length: number;
  price: number;
  errors: string[];
  warnings: string[];
}

type RowResult = 'pending' | 'inserted' | 'error' | 'searching' | 'candidates_found';

const TEMPLATE_HEADERS = [
  'foto_url', 'titulo', 'descricao', 'peso_kg', 'altura_cm', 'largura_cm', 'comprimento_cm', 'preco',
];

const parseRow = (obj: Record<string, string>): ParsedRow => {
  const num = (v: string) => parseFloat((v || '').replace(',', '.'));
  const photoUrls = (obj.foto_url || obj.photo_url || '')
    .split(',')
    .map((url) => url.trim())
    .filter((url) => url !== '');
  const row: ParsedRow = {
    photo_url: photoUrls[0] || '',
    photo_urls: photoUrls,
    title: obj.titulo || obj.title || '',
    description: obj.descricao || obj.description || '',
    weight: num(obj.peso_kg || obj.weight),
    height: num(obj.altura_cm || obj.height),
    width: num(obj.largura_cm || obj.width),
    length: num(obj.comprimento_cm || obj.length),
    price: num(obj.preco || obj.price),
    errors: [],
    warnings: [],
  };
  if (!row.photo_url.startsWith('http')) row.errors.push('foto_url inválida');
  if (row.title.length < 10) row.errors.push('título muito curto');
  if (row.description.length < 20) row.warnings.push('descrição muito curta');
  if (!(row.price > 0)) row.errors.push('preço inválido');
  for (const [key, label] of [
    ['weight', 'peso'], ['height', 'altura'], ['width', 'largura'], ['length', 'comprimento'],
  ] as const) {
    if (!(row[key] > 0)) row.errors.push(`${label} inválido`);
  }
  return row;
};

/** Importação em massa do Estágio 1 + fila client-side de busca de referências. */
const SupplierImport = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { getEffectiveUserId } = useAuth();
  const { data: orgData } = useSupplierOrganization();

  const [rows, setRows] = useState<ParsedRow[]>([]);
  const [results, setResults] = useState<RowResult[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [autoSearch, setAutoSearch] = useState(true);

  const onDrop = useCallback(async (accepted: File[]) => {
    const file = accepted[0];
    if (!file) return;
    const text = await file.text();
    const parsed = csvRowsToObjects(parseCsv(text)).map(parseRow);
    setRows(parsed);
    setResults(parsed.map(() => 'pending'));
    setProgress(0);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'text/csv': ['.csv'], 'text/plain': ['.txt'] },
    maxFiles: 1,
  });

  const downloadTemplate = () => {
    downloadCsv(
      'lojafy_modelo_produtos_estagio1.csv',
      buildCsv(TEMPLATE_HEADERS, [[
        'https://exemplo.com/foto.jpg',
        'Camiseta de Algodão Premium Fio 30',
        'Camiseta 100% algodão fio 30 penteado, toque macio e caimento perfeito.',
        '0.25', '15', '20', '30', '89.90',
      ]]),
    );
  };

  const runImport = async () => {
    const validRows = rows.filter((r) => r.errors.length === 0);
    if (validRows.length === 0) return;
    setProcessing(true);

    const userId = getEffectiveUserId();
    const updated = [...results];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row.errors.length > 0) {
        updated[i] = 'error';
        continue;
      }
      try {
        const { data: product, error } = await supabase
          .from('products')
          .insert({
            name: row.title,
            description: row.description,
            price: row.price,
            weight: row.weight,
            height: row.height,
            width: row.width,
            length: row.length,
            main_image_url: row.photo_url,
            image_url: row.photo_url,
            images: row.photo_urls,
            supplier_id: userId!,
            stage: 'stage_1_basic',
            active: false,
            approval_status: 'draft',
          })
          .select('id')
          .single();
        if (error) throw error;
        updated[i] = 'inserted';

        if (autoSearch) {
          updated[i] = 'searching';
          setResults([...updated]);
          try {
            const candidates = await searchMlCandidates({ name: row.title, price: row.price });
            if (candidates.length > 0) {
              await persistCandidates(product.id, extractSearchKeywords(row.title), candidates);
              updated[i] = 'candidates_found';
            } else {
              updated[i] = 'inserted';
            }
          } catch {
            updated[i] = 'inserted';
          }
        }
      } catch {
        updated[i] = 'error';
      }
      setResults([...updated]);
      setProgress(Math.round(((i + 1) / rows.length) * 100));
    }

    setProcessing(false);
    if (orgData) queryClient.invalidateQueries({ queryKey: supplierKeys.scope(orgData.organization.id) });
    const inserted = updated.filter((r) => r === 'inserted' || r === 'candidates_found').length;
    toast({ title: `${inserted} produtos importados no Estágio 1` });
  };

  const validCount = rows.filter((r) => r.errors.length === 0).length;

  return (
    <div className="max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Importação de Produtos</h1>
        <p className="text-muted-foreground">
          Planilha de 8 colunas → cadastro em massa no Estágio 1, com busca automática de referências
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">1. Planilha</CardTitle>
          <CardDescription>
            Colunas: {TEMPLATE_HEADERS.join('; ')}. Em <code>foto_url</code>, você pode informar
            várias imagens separadas por vírgula (a primeira vira a foto principal).{' '}
            <button type="button" className="underline" onClick={downloadTemplate}>
              Baixar modelo
            </button>
          </CardDescription>
        </CardHeader>
        <CardContent>
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
        </CardContent>
      </Card>

      {rows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              2. Revisão — {validCount} válidos de {rows.length}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ScrollArea className="h-64 rounded-md border p-2">
              {rows.map((row, i) => (
                <div key={i} className="flex items-center gap-2 border-b py-2 text-sm last:border-0">
                  {row.errors.length > 0 ? (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  ) : results[i] === 'inserted' || results[i] === 'candidates_found' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : results[i] === 'searching' ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin" />
                  ) : row.warnings && row.warnings.length > 0 ? (
                    <AlertTriangle className="h-4 w-4 shrink-0 text-amber-500" />
                  ) : (
                    <FileSpreadsheet className="h-4 w-4 shrink-0 text-muted-foreground" />
                  )}
                  <span className="min-w-0 flex-1 truncate">{row.title || '(sem título)'}</span>
                  {row.errors.length > 0 && (
                    <span className="text-xs text-destructive">{row.errors.join(', ')}</span>
                  )}
                  {row.errors.length === 0 && row.warnings && row.warnings.length > 0 && results[i] === 'pending' && (
                    <span className="text-xs text-amber-600">{row.warnings.join(', ')}</span>
                  )}
                  {results[i] === 'candidates_found' && (
                    <Badge variant="outline" className="gap-1">
                      <Search className="h-3 w-3" />
                      referências
                    </Badge>
                  )}
                </div>
              ))}
            </ScrollArea>

            <div className="flex items-center gap-2">
              <Checkbox
                id="auto-search"
                checked={autoSearch}
                onCheckedChange={(c) => setAutoSearch(!!c)}
              />
              <Label htmlFor="auto-search" className="text-sm">
                Buscar referências no Mercado Livre automaticamente após importar
              </Label>
            </div>

            {processing && <Progress value={progress} />}

            <Button onClick={runImport} disabled={validCount === 0 || processing}>
              {processing ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Importar {validCount} produtos
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SupplierImport;
