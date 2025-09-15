import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Upload, FileText, X, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface ShippingFileUploadProps {
  onFileUploaded?: (file: { name: string; path: string; size: number }) => void;
  maxSizeMB?: number;
  required?: boolean;
  orderId?: string;
}

export function ShippingFileUpload({ 
  onFileUploaded, 
  maxSizeMB = 5, 
  required = false,
  orderId 
}: ShippingFileUploadProps) {
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);

  const uploadFileToSupabase = async (file: File) => {
    if (!orderId) {
      throw new Error("ID do pedido é necessário para upload");
    }

    const fileExt = file.name.split('.').pop();
    const fileName = `${orderId}_${Date.now()}.${fileExt}`;
    const filePath = `${orderId}/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('shipping-files')
      .upload(filePath, file);

    if (uploadError) {
      throw uploadError;
    }

    return { fileName: file.name, filePath, fileSize: file.size };
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (!file) return;

    // Validate file type
    if (file.type !== 'application/pdf') {
      toast.error("Apenas arquivos PDF são permitidos");
      return;
    }

    // Validate file size
    if (file.size > maxSizeMB * 1024 * 1024) {
      toast.error(`Arquivo muito grande. Tamanho máximo: ${maxSizeMB}MB`);
      return;
    }

    setIsUploading(true);
    
    try {
      if (orderId) {
        // Upload to Supabase if orderId is provided
        const uploadResult = await uploadFileToSupabase(file);
        
        // Save to database
        const { error: dbError } = await supabase
          .from('order_shipping_files')
          .insert({
            order_id: orderId,
            file_name: uploadResult.fileName,
            file_path: uploadResult.filePath,
            file_size: uploadResult.fileSize
          });

        if (dbError) throw dbError;

        const fileData = {
          name: uploadResult.fileName,
          path: uploadResult.filePath,
          size: uploadResult.fileSize
        };
        setUploadedFile(fileData);
        onFileUploaded?.(fileData);
        toast.success("Arquivo enviado com sucesso!");
      } else {
        // Just store locally for preview (checkout flow)
        const fileData = {
          name: file.name,
          path: URL.createObjectURL(file),
          size: file.size,
          file: file // Keep reference to actual file
        };
        
        setUploadedFile(fileData);
        onFileUploaded?.(fileData);
        toast.success("Arquivo selecionado com sucesso!");
      }
    } catch (error: any) {
      toast.error(error.message || "Erro ao enviar arquivo");
    } finally {
      setIsUploading(false);
    }
  }, [orderId, maxSizeMB, onFileUploaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf']
    },
    maxFiles: 1,
    disabled: isUploading
  });

  const removeFile = () => {
    setUploadedFile(null);
    onFileUploaded?.(null);
  };

  return (
    <div className="space-y-3">
      <Label className="text-sm font-medium">
        Anexar Etiqueta/Documento de Transporte {required && "*"}
      </Label>
      
      {!uploadedFile ? (
        <Card 
          {...getRootProps()} 
          className={`cursor-pointer transition-colors border-dashed ${
            isDragActive 
              ? 'border-primary bg-primary/5' 
              : 'border-muted-foreground/25 hover:border-primary/50'
          } ${isUploading ? 'opacity-50 cursor-not-allowed' : ''}`}
        >
          <CardContent className="flex flex-col items-center justify-center py-8 px-6">
            <input {...getInputProps()} />
            <Upload className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium mb-1">
              {isDragActive ? "Solte o arquivo aqui" : "Clique ou arraste um arquivo PDF"}
            </p>
            <p className="text-xs text-muted-foreground text-center">
              Apenas arquivos PDF até {maxSizeMB}MB
            </p>
            {isUploading && (
              <p className="text-xs text-primary mt-2">Enviando arquivo...</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="flex items-center justify-between p-4">
            <div className="flex items-center gap-3">
              <FileText className="h-8 w-8 text-red-500" />
              <div>
                <p className="text-sm font-medium">{uploadedFile.name}</p>
                <p className="text-xs text-muted-foreground">
                  {(uploadedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            </div>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={removeFile}
              disabled={isUploading}
            >
              <X className="h-4 w-4" />
            </Button>
          </CardContent>
        </Card>
      )}

      {required && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            O envio do arquivo é obrigatório para este método de frete.
          </AlertDescription>
        </Alert>
      )}

      <p className="text-xs text-muted-foreground">
        Anexe sua etiqueta personalizada, guia de remessa ou documento de transporte em formato PDF.
      </p>
    </div>
  );
}