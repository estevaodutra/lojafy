import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileSpreadsheet, 
  Upload, 
  Check, 
  AlertTriangle, 
  Download, 
  RefreshCw, 
  FileText,
  X,
  Loader2
} from 'lucide-react';

interface SupplierProductImportProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ParsedProduct {
  name: string;
  sku: string | null;
  price: number;
  cost_price: number;
  stock_quantity: number;
  category_name: string | null;
  category_id: string | null;
  brand: string | null;
  description: string | null;
  gtin_ean13: string | null;
  image_url: string | null;
  width: number | null;
  height: number | null;
  length: number | null;
  weight: number | null;
  isValid: boolean;
  errors: string[];
}

export function SupplierProductImport({ isOpen, onClose, onSuccess }: SupplierProductImportProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [parsedProducts, setParsedProducts] = useState<ParsedProduct[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [categories, setCategories] = useState<{ id: string; name: string }[]>([]);

  // Carregar categorias ativas para fazer o de-para
  React.useEffect(() => {
    async function loadCategories() {
      const { data, error } = await supabase
        .from('categories')
        .select('id, name')
        .eq('active', true);
      if (!error && data) {
        setCategories(data);
      }
    }
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  // Função para limpar estados
  const handleReset = () => {
    setFile(null);
    setParsedProducts([]);
    setProgress(0);
    setIsProcessing(false);
  };

  // Baixar modelo de planilha CSV
  const downloadTemplate = () => {
    const headers = [
      'nome',
      'sku',
      'preco_venda',
      'preco_custo',
      'estoque',
      'categoria',
      'marca',
      'descricao',
      'gtin_ean13',
      'imagem_url',
      'largura_cm',
      'altura_cm',
      'comprimento_cm',
      'peso_kg'
    ];
    
    const exampleRow = [
      'Camiseta de Algodão Premium',
      'CAM-PREM-001',
      '89.90',
      '35.00',
      '50',
      'Moda',
      'Marca Exemplo',
      'Camiseta 100% algodão fio 30 penteado.',
      '7891234567890',
      'https://exemplo.com/imagens/camiseta.jpg',
      '20',
      '15',
      '30',
      '0.25'
    ];

    const csvContent = [
      headers.join(';'),
      exampleRow.join(';')
    ].join('\n');

    // Forçar download com BOM para evitar problemas de acentuação no Excel
    const blob = new Blob([new Uint8Array([0xEF, 0xBB, 0xBF]), csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'lojafy_modelo_produtos_fornecedor.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Parser nativo de CSV
  const parseCSV = (text: string): string[][] => {
    const lines: string[][] = [];
    let row: string[] = [];
    let inQuotes = false;
    let currentValue = '';

    // Detectar o delimitador (vírgula ou ponto-e-vírgula)
    // Contamos ocorrências na primeira linha para decidir
    const firstLine = text.split('\n')[0] || '';
    const semicolons = (firstLine.match(/;/g) || []).length;
    const commas = (firstLine.match(/,/g) || []).length;
    const delimiter = semicolons >= commas ? ';' : ',';

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (inQuotes) {
        if (char === '"') {
          if (nextChar === '"') {
            // Aspas escapadas ""
            currentValue += '"';
            i++;
          } else {
            // Fechou aspas
            inQuotes = false;
          }
        } else {
          currentValue += char;
        }
      } else {
        if (char === '"') {
          inQuotes = true;
        } else if (char === delimiter) {
          row.push(currentValue.trim());
          currentValue = '';
        } else if (char === '\r' || char === '\n') {
          row.push(currentValue.trim());
          currentValue = '';
          if (row.length > 0 && row.some(val => val !== '')) {
            lines.push(row);
          }
          row = [];
          if (char === '\r' && nextChar === '\n') {
            i++; // pular o \n do \r\n
          }
        } else {
          currentValue += char;
        }
      }
    }
    
    // Adicionar a última linha se sobrar conteúdo
    if (currentValue !== '' || row.length > 0) {
      row.push(currentValue.trim());
      if (row.length > 0 && row.some(val => val !== '')) {
        lines.push(row);
      }
    }

    return lines;
  };

  // Processamento do arquivo CSV recebido
  const processCSV = (fileContent: string) => {
    const rawRows = parseCSV(fileContent);
    if (rawRows.length < 2) {
      toast({
        title: 'Planilha inválida',
        description: 'A planilha deve conter pelo menos o cabeçalho e uma linha de dados.',
        variant: 'destructive',
      });
      return;
    }

    const headers = rawRows[0].map(h => h.toLowerCase().trim());
    
    // Mapeamento de índices do cabeçalho
    const getIndex = (aliases: string[]) => {
      return headers.findIndex(h => aliases.includes(h));
    };

    const idxName = getIndex(['nome', 'name', 'titulo', 'title', 'produto']);
    const idxSku = getIndex(['sku', 'codigo', 'código', 'referencia', 'referência']);
    const idxPrice = getIndex(['preco_venda', 'preço_venda', 'preco', 'preço', 'price', 'preco_sugerido']);
    const idxCostPrice = getIndex(['preco_custo', 'preço_custo', 'custo', 'cost_price']);
    const idxStock = getIndex(['estoque', 'quantidade', 'stock', 'stock_quantity', 'qtd']);
    const idxCategory = getIndex(['categoria', 'category', 'category_name']);
    const idxBrand = getIndex(['marca', 'brand']);
    const idxDescription = getIndex(['descricao', 'descrição', 'description']);
    const idxGtin = getIndex(['gtin', 'ean', 'gtin_ean13', 'barcode', 'codigo_barras']);
    const idxImageUrl = getIndex(['imagem_url', 'imagem', 'url_imagem', 'image_url', 'foto']);
    const idxWidth = getIndex(['largura_cm', 'largura', 'width']);
    const idxHeight = getIndex(['altura_cm', 'altura', 'height']);
    const idxLength = getIndex(['comprimento_cm', 'comprimento', 'length']);
    const idxWeight = getIndex(['peso_kg', 'peso', 'weight']);

    // Validar se colunas obrigatórias existem
    if (idxName === -1) {
      toast({
        title: 'Coluna ausente',
        description: 'A coluna "nome" não foi encontrada na planilha.',
        variant: 'destructive',
      });
      return;
    }

    const parsedData: ParsedProduct[] = [];

    // Ignorar cabeçalho (i = 1)
    for (let i = 1; i < rawRows.length; i++) {
      const row = rawRows[i];
      // Pular linhas vazias
      if (row.length === 0 || (row.length === 1 && row[0] === '')) continue;

      const name = idxName !== -1 ? row[idxName] || '' : '';
      const sku = idxSku !== -1 ? row[idxSku] || null : null;
      const priceRaw = idxPrice !== -1 ? row[idxPrice] || '' : '';
      const costPriceRaw = idxCostPrice !== -1 ? row[idxCostPrice] || '' : '';
      const stockRaw = idxStock !== -1 ? row[idxStock] || '' : '';
      const categoryName = idxCategory !== -1 ? row[idxCategory] || null : null;
      const brand = idxBrand !== -1 ? row[idxBrand] || null : null;
      const description = idxDescription !== -1 ? row[idxDescription] || null : null;
      const gtin = idxGtin !== -1 ? row[idxGtin] || null : null;
      const imageUrl = idxImageUrl !== -1 ? row[idxImageUrl] || null : null;
      const widthRaw = idxWidth !== -1 ? row[idxWidth] || '' : '';
      const heightRaw = idxHeight !== -1 ? row[idxHeight] || '' : '';
      const lengthRaw = idxLength !== -1 ? row[idxLength] || '' : '';
      const weightRaw = idxWeight !== -1 ? row[idxWeight] || '' : '';

      const errors: string[] = [];

      // Validações básicas
      if (!name) {
        errors.push('Nome do produto é obrigatório.');
      }

      // Validação de Preço de Venda
      let price = 0;
      if (!priceRaw) {
        errors.push('Preço de venda é obrigatório.');
      } else {
        price = parseFloat(priceRaw.replace(',', '.'));
        if (isNaN(price) || price <= 0) {
          errors.push('Preço de venda deve ser um número positivo.');
        }
      }

      // Validação de Preço de Custo
      let cost_price = 0;
      if (!costPriceRaw) {
        errors.push('Preço de custo é obrigatório.');
      } else {
        cost_price = parseFloat(costPriceRaw.replace(',', '.'));
        if (isNaN(cost_price) || cost_price <= 0) {
          errors.push('Preço de custo deve ser um número positivo.');
        }
      }

      // Validar que custo é menor que venda
      if (price > 0 && cost_price > 0 && cost_price >= price) {
        errors.push('Preço de custo deve ser menor que o preço de venda.');
      }

      // Validação de Estoque
      let stock_quantity = 0;
      if (stockRaw) {
        stock_quantity = parseInt(stockRaw, 10);
        if (isNaN(stock_quantity) || stock_quantity < 0) {
          errors.push('Estoque deve ser um número inteiro não-negativo.');
        }
      }

      // Validação de Dimensões
      const width = widthRaw ? parseFloat(widthRaw.replace(',', '.')) : null;
      const height = heightRaw ? parseFloat(heightRaw.replace(',', '.')) : null;
      const length = lengthRaw ? parseFloat(lengthRaw.replace(',', '.')) : null;
      const weight = weightRaw ? parseFloat(weightRaw.replace(',', '.')) : null;

      if (width !== null && (isNaN(width) || width <= 0)) errors.push('Largura deve ser um número positivo.');
      if (height !== null && (isNaN(height) || height <= 0)) errors.push('Altura deve ser um número positivo.');
      if (length !== null && (isNaN(length) || length <= 0)) errors.push('Comprimento deve ser um número positivo.');
      if (weight !== null && (isNaN(weight) || weight <= 0)) errors.push('Peso deve ser um número positivo.');

      // Validação de EAN-13
      if (gtin && !/^\d{13}$/.test(gtin.trim())) {
        errors.push('GTIN/EAN-13 deve conter exatamente 13 dígitos.');
      }

      // Tentar associar categoria
      let matchedCategoryId: string | null = null;
      if (categoryName) {
        const match = categories.find(
          c => c.name.toLowerCase().trim() === categoryName.toLowerCase().trim()
        );
        if (match) {
          matchedCategoryId = match.id;
        } else {
          // Apenas um aviso, não impede a importação se o banco aceitar nulo
          errors.push(`Categoria "${categoryName}" não encontrada no sistema.`);
        }
      }

      parsedData.push({
        name,
        sku: sku ? sku.trim() : null,
        price,
        cost_price,
        stock_quantity,
        category_name: categoryName,
        category_id: matchedCategoryId,
        brand,
        description,
        gtin_ean13: gtin ? gtin.trim() : null,
        image_url: imageUrl ? imageUrl.trim() : null,
        width,
        height,
        length,
        weight,
        isValid: errors.length === 0,
        errors
      });
    }

    setParsedProducts(parsedData);
  };

  // Dropzone callbacks
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const selectedFile = acceptedFiles[0];
    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (text) {
        processCSV(text);
      }
    };
    reader.readAsText(selectedFile, 'UTF-8');
  }, [categories]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'text/csv': ['.csv']
    },
    multiple: false,
    disabled: isProcessing
  });

  // Salvar os itens válidos no banco de dados
  const handleImport = async () => {
    const validProducts = parsedProducts.filter(p => p.isValid);
    if (validProducts.length === 0) {
      toast({
        title: 'Nenhum item válido',
        description: 'Corrija os erros na planilha antes de importar.',
        variant: 'destructive',
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: 'Erro de autenticação',
        description: 'Usuário não está logado.',
        variant: 'destructive',
      });
      return;
    }

    setIsProcessing(true);
    setProgress(10);

    try {
      // Montar lote de inserção
      const productsToInsert = validProducts.map(p => ({
        name: p.name,
        sku: p.sku,
        price: p.price,
        cost_price: p.cost_price,
        stock_quantity: p.stock_quantity,
        category_id: p.category_id,
        brand: p.brand,
        description: p.description,
        gtin_ean13: p.gtin_ean13,
        main_image_url: p.image_url,
        image_url: p.image_url, // Retrocompatibilidade
        width: p.width,
        height: p.height,
        length: p.length,
        weight: p.weight,
        supplier_id: user.id,
        approval_status: 'pending_approval',
        active: false // Desativado até aprovação do admin
      }));

      setProgress(50);

      // Inserção em lote no Supabase
      const { error } = await supabase
        .from('products')
        .insert(productsToInsert);

      if (error) throw error;

      setProgress(100);
      toast({
        title: 'Importação Concluída!',
        description: `${validProducts.length} produtos foram importados e enviados para aprovação com sucesso.`,
      });

      // Recarregar caches e disparar callback
      queryClient.invalidateQueries({ queryKey: ['supplier-products'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-product-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-approval-stats'] });
      queryClient.invalidateQueries({ queryKey: ['supplier-pending-products'] });
      
      onSuccess();
      onClose();
      handleReset();
    } catch (error: any) {
      console.error('Error importing products:', error);
      toast({
        title: 'Erro na importação',
        description: error.message || 'Ocorreu um erro ao salvar os produtos no banco.',
        variant: 'destructive',
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const validCount = parsedProducts.filter(p => p.isValid).length;
  const invalidCount = parsedProducts.length - validCount;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !isProcessing && !open && onClose()}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] flex flex-col p-6">
        <DialogHeader className="flex flex-row justify-between items-start pr-6">
          <div>
            <DialogTitle className="text-2xl font-bold flex items-center gap-2">
              <FileSpreadsheet className="h-6 w-6 text-primary" />
              Importar Produtos via Planilha
            </DialogTitle>
            <DialogDescription className="mt-1">
              Envie produtos em lote usando uma planilha CSV. Todos os produtos importados serão criados como "Aguardando Aprovação".
            </DialogDescription>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden my-4 flex flex-col gap-4">
          {/* Se nenhum arquivo foi carregado ainda */}
          {!file && (
            <div className="space-y-4 py-4">
              <div 
                {...getRootProps()} 
                className={`border-2 border-dashed rounded-xl p-12 flex flex-col items-center justify-center cursor-pointer transition-all duration-200
                  ${isDragActive ? 'border-primary bg-primary/5 scale-[0.99]' : 'border-muted-foreground/20 hover:border-primary/50 hover:bg-accent/20'}`}
              >
                <input {...getInputProps()} />
                <div className="h-14 w-14 rounded-full bg-primary/10 flex items-center justify-center mb-4 text-primary animate-pulse">
                  <Upload className="h-7 w-7" />
                </div>
                <p className="text-base font-semibold text-center">
                  {isDragActive ? 'Solte o arquivo aqui...' : 'Arraste seu arquivo CSV ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground text-center mt-2">
                  Apenas arquivos no formato .csv (delimitados por vírgula ou ponto-e-vírgula)
                </p>
              </div>

              <div className="bg-accent/30 rounded-lg p-4 flex items-center justify-between border">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-md text-primary">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold">Precisa de ajuda com o formato?</h4>
                    <p className="text-xs text-muted-foreground">Baixe nosso arquivo modelo com as colunas corretas pré-definidas.</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={downloadTemplate} className="gap-2 shrink-0">
                  <Download className="h-4 w-4" />
                  Baixar Modelo
                </Button>
              </div>
            </div>
          )}

          {/* Se a planilha foi lida */}
          {file && parsedProducts.length > 0 && (
            <div className="flex-1 flex flex-col min-h-0 gap-4">
              {/* Resumo da Validação */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-3 border rounded-lg bg-accent/30">
                  <span className="text-xs text-muted-foreground font-medium block">Total de Produtos Lidos</span>
                  <span className="text-2xl font-bold">{parsedProducts.length}</span>
                </div>
                <div className="p-3 border rounded-lg bg-green-50 border-green-200">
                  <span className="text-xs text-green-600 font-medium block">Prontos para Importar</span>
                  <span className="text-2xl font-bold text-green-700">{validCount}</span>
                </div>
                <div className={`p-3 border rounded-lg ${invalidCount > 0 ? 'bg-red-50 border-red-200' : 'bg-accent/30'}`}>
                  <span className="text-xs text-muted-foreground font-medium block">Com Erros</span>
                  <span className={`text-2xl font-bold ${invalidCount > 0 ? 'text-red-600' : ''}`}>{invalidCount}</span>
                </div>
              </div>

              {invalidCount > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <AlertTitle>Alguns produtos contêm erros!</AlertTitle>
                  <AlertDescription>
                    Produtos com erros serão ignorados durante a importação. Corrija o arquivo e envie novamente se necessário, ou prossiga para importar apenas os itens válidos.
                  </AlertDescription>
                </Alert>
              )}

              {/* Tabela de Pré-visualização */}
              <div className="flex-1 border rounded-lg min-h-0">
                <ScrollArea className="h-full">
                  <div className="min-w-[800px]">
                    <table className="w-full text-sm">
                      <thead className="bg-muted sticky top-0 border-b z-10">
                        <tr>
                          <th className="p-3 text-left font-semibold w-16">Status</th>
                          <th className="p-3 text-left font-semibold">Nome</th>
                          <th className="p-3 text-left font-semibold w-32">SKU</th>
                          <th className="p-3 text-right font-semibold w-24">Venda (R$)</th>
                          <th className="p-3 text-right font-semibold w-24">Custo (R$)</th>
                          <th className="p-3 text-center font-semibold w-20">Estoque</th>
                          <th className="p-3 text-left font-semibold">Erros/Alertas</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedProducts.map((p, idx) => (
                          <tr key={idx} className={p.isValid ? '' : 'bg-red-50/30'}>
                            <td className="p-3 text-left">
                              {p.isValid ? (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                                  <Check className="h-3 w-3" /> Válido
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-xs font-medium text-red-700 bg-red-50 px-2 py-0.5 rounded-full border border-red-200">
                                  <X className="h-3 w-3" /> Erro
                                </span>
                              )}
                            </td>
                            <td className="p-3 font-medium truncate max-w-[200px]" title={p.name}>
                              {p.name || <span className="text-red-500 italic">Ausente</span>}
                            </td>
                            <td className="p-3 text-muted-foreground truncate max-w-[120px]" title={p.sku || ''}>
                              {p.sku || <span className="text-muted-foreground italic">Auto</span>}
                            </td>
                            <td className="p-3 text-right font-medium">
                              {p.price > 0 ? p.price.toFixed(2) : '-'}
                            </td>
                            <td className="p-3 text-right text-muted-foreground">
                              {p.cost_price > 0 ? p.cost_price.toFixed(2) : '-'}
                            </td>
                            <td className="p-3 text-center">
                              {p.stock_quantity}
                            </td>
                            <td className="p-3 text-xs text-red-600 max-w-[250px]">
                              {p.errors.length > 0 ? (
                                <ul className="list-disc list-inside space-y-0.5">
                                  {p.errors.map((err, errIdx) => (
                                    <li key={errIdx} className="truncate" title={err}>{err}</li>
                                  ))}
                                </ul>
                              ) : (
                                <span className="text-muted-foreground font-medium">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </ScrollArea>
              </div>
            </div>
          )}

          {/* Barra de Progresso durante a importação */}
          {isProcessing && (
            <div className="space-y-2 py-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Salvando produtos no catálogo...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          )}
        </div>

        <DialogFooter className="border-t pt-4">
          <div className="flex justify-between w-full items-center">
            {file ? (
              <Button variant="ghost" size="sm" onClick={handleReset} disabled={isProcessing} className="gap-1 text-muted-foreground hover:text-foreground">
                <RefreshCw className="h-4 w-4" /> Enviar outro arquivo
              </Button>
            ) : (
              <div />
            )}
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={isProcessing}>
                Cancelar
              </Button>
              {file && (
                <Button 
                  onClick={handleImport} 
                  disabled={isProcessing || validCount === 0}
                  className="gap-2"
                >
                  {isProcessing && <Loader2 className="h-4 w-4 animate-spin" />}
                  Confirmar Importação ({validCount})
                </Button>
              )}
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
