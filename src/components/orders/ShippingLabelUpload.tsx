import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { UploadCloud, CheckCircle, AlertTriangle, FileText, Loader2, Edit3, Save, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/components/ui/use-toast';
import { Badge } from '@/components/ui/badge';

export interface ShippingLabelData {
  marketplace: string | null;
  marketplaceOrderId: string | null;
  trackingCode: string | null;
  confidence: number;
  extractionMethod: string;
  manuallyEdited: boolean;
  filePath: string;
  fileSize?: number;
}

interface ShippingLabelUploadProps {
  onLabelProcessed: (data: ShippingLabelData | null) => void;
  maxSizeMB?: number;
}

export function ShippingLabelUpload({ onLabelProcessed, maxSizeMB = 10 }: ShippingLabelUploadProps) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<ShippingLabelData>>({});
  const { toast } = useToast();

  const handleUploadAndProcess = async (selectedFile: File) => {
    try {
      setUploading(true);
      setFile(selectedFile);
      setResult(null);
      setEditing(false);
      onLabelProcessed(null);

      const fileExt = selectedFile.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      const filePath = `temp/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('shipping-labels')
        .upload(filePath, selectedFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      setUploading(false);
      setProcessing(true);

      const { data, error } = await supabase.functions.invoke('process-shipping-label', {
        body: { filePath }
      });

      if (error) throw error;
      
      const parsedData = {
        marketplace: data.data?.marketplace || 'outro',
        marketplaceOrderId: data.data?.marketplaceOrderId || '',
        trackingCode: data.data?.trackingCode || '',
        confidence: data.confidence || 0,
        extractionMethod: data.extractionMethod || 'manual',
        manuallyEdited: false,
        filePath,
        fileSize: selectedFile.size
      };

      setResult({ ...data, rawPath: filePath });
      setFormData(parsedData);
      
      // Auto-confirm if confidence is high
      if (data.confidenceLevel === 'high') {
        onLabelProcessed(parsedData);
        toast({
          title: "Etiqueta lida com sucesso!",
          description: `Rastreio identificado: ${parsedData.trackingCode}`,
        });
      } else {
        setEditing(true); // Force edit mode if confidence is low/medium
        toast({
          title: "Atenção necessária",
          description: "Verifique os dados extraídos antes de continuar.",
          variant: "default"
        });
      }

    } catch (err: any) {
      console.error('Error processing label:', err);
      toast({
        title: 'Erro ao processar etiqueta',
        description: err.message || 'Falha ao ler os dados do arquivo.',
        variant: 'destructive',
      });
      // Permite entrada manual em caso de falha
      setResult({ status: 'failed' });
      setEditing(true);
      setFormData({
        marketplace: 'outro',
        trackingCode: '',
        marketplaceOrderId: '',
        confidence: 0,
        extractionMethod: 'manual',
        manuallyEdited: true,
        filePath: '' // Should handle file if uploaded
      });
    } finally {
      setUploading(false);
      setProcessing(false);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      handleUploadAndProcess(acceptedFiles[0]);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png']
    },
    maxSize: maxSizeMB * 1024 * 1024,
    multiple: false
  });

  const handleSaveEdit = () => {
    const finalData = {
      ...formData,
      manuallyEdited: true
    } as ShippingLabelData;
    
    setEditing(false);
    onLabelProcessed(finalData);
    toast({
      title: "Dados confirmados",
      description: "Etiqueta anexada com sucesso.",
    });
  };

  const handleClear = () => {
    setFile(null);
    setResult(null);
    setFormData({});
    setEditing(false);
    onLabelProcessed(null);
  };

  return (
    <Card className="w-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <span className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Etiqueta de Envio
          </span>
          {file && !uploading && !processing && (
            <Button variant="ghost" size="sm" onClick={handleClear} className="h-8">
              Trocar arquivo
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {(!file || uploading || processing) && (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
              ${isDragActive ? 'border-primary bg-primary/5' : 'border-muted hover:border-primary/50'}`}
          >
            <input {...getInputProps()} />
            
            {uploading ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Fazendo upload...</p>
              </div>
            ) : processing ? (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
                <p>Analisando etiqueta com IA...</p>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center text-muted-foreground gap-3">
                <UploadCloud className="w-10 h-10 mb-2 text-muted-foreground/60" />
                <p className="text-sm font-medium">Arraste a etiqueta aqui ou clique para selecionar</p>
                <p className="text-xs">PDF, PNG, JPG até {maxSizeMB}MB</p>
              </div>
            )}
          </div>
        )}

        {result && (
          <div className="mt-4 space-y-4">
            {!editing ? (
              <div className="bg-muted/30 p-4 rounded-lg space-y-3 border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {result.confidenceLevel === 'high' ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-yellow-500" />
                    )}
                    <span className="font-medium">
                      Dados Identificados 
                      {result.confidenceLevel === 'high' && <Badge variant="outline" className="ml-2 text-green-600 bg-green-50">Alta confiança</Badge>}
                    </span>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
                    <Edit3 className="w-4 h-4 mr-2" />
                    Corrigir
                  </Button>
                </div>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground block mb-1">Cód. Rastreio:</span>
                    <strong className="text-base">{formData.trackingCode || 'Não identificado'}</strong>
                  </div>
                  <div>
                    <span className="text-muted-foreground block mb-1">Marketplace:</span>
                    <strong className="capitalize">{formData.marketplace?.replace('_', ' ') || 'Outro'}</strong>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-card border rounded-lg p-4 space-y-4 shadow-sm">
                <div className="flex items-center gap-2 text-sm font-medium text-amber-600 bg-amber-50 p-2 rounded border border-amber-200">
                  <AlertTriangle className="w-4 h-4" />
                  Por favor, confirme ou corrija os dados abaixo:
                </div>
                
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Código de Rastreio</Label>
                    <Input 
                      value={formData.trackingCode || ''} 
                      onChange={(e) => setFormData({...formData, trackingCode: e.target.value})}
                      placeholder="Ex: BR123456789BR"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Plataforma / Marketplace</Label>
                    <Input 
                      value={formData.marketplace || ''} 
                      onChange={(e) => setFormData({...formData, marketplace: e.target.value})}
                      placeholder="Ex: Shopee, Mercado Livre"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label>ID do Pedido na Plataforma (Opcional)</Label>
                    <Input 
                      value={formData.marketplaceOrderId || ''} 
                      onChange={(e) => setFormData({...formData, marketplaceOrderId: e.target.value})}
                      placeholder="Ex: 230911AABBCC"
                    />
                  </div>
                </div>
                
                <div className="flex justify-end gap-2 pt-2">
                  <Button onClick={handleSaveEdit} className="w-full sm:w-auto">
                    <Save className="w-4 h-4 mr-2" />
                    Confirmar Dados
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
