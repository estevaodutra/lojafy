import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShippingFileUpload } from "@/components/ShippingFileUpload";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Upload } from "lucide-react";

interface ShippingLabelUploadModalProps {
  orderId: string;
  orderNumber: string;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ShippingLabelUploadModal({
  orderId,
  orderNumber,
  isOpen,
  onClose,
  onSuccess,
}: ShippingLabelUploadModalProps) {
  const [uploadedFile, setUploadedFile] = useState<any>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (file: any) => {
    setUploadedFile(file);
  };

  const handleSubmit = async () => {
    if (!uploadedFile?.file) {
      toast({
        title: "Nenhum arquivo selecionado",
        description: "Por favor, selecione um arquivo para fazer upload.",
        variant: "destructive",
      });
      return;
    }

    setIsUploading(true);

    try {
      console.log('📤 Uploading shipping label for order:', orderId);

      // Generate unique filename
      const fileExtension = uploadedFile.file.name.split('.').pop();
      const fileName = `order_${orderId}_${Date.now()}.${fileExtension}`;
      const filePath = `${orderId}/${fileName}`;

      // Upload file to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('shipping-files')
        .upload(filePath, uploadedFile.file);

      if (uploadError) {
        console.error('Error uploading shipping file:', uploadError);
        toast({
          title: "Erro no upload",
          description: "Não foi possível fazer upload da etiqueta.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ File uploaded successfully');

      // Save file metadata to database
      const { error: dbError } = await supabase
        .from('order_shipping_files')
        .insert({
          order_id: orderId,
          file_name: uploadedFile.name,
          file_path: filePath,
          file_size: uploadedFile.size,
        });

      if (dbError) {
        console.error('Error saving file metadata:', dbError);
        toast({
          title: "Erro ao salvar",
          description: "Arquivo enviado mas erro ao registrar no banco de dados.",
          variant: "destructive",
        });
        return;
      }

      console.log('✅ File metadata saved successfully');

      toast({
        title: "Etiqueta enviada com sucesso!",
        description: `Etiqueta anexada ao pedido ${orderNumber}`,
      });

      onSuccess();
      onClose();
    } catch (error) {
      console.error('Unexpected error:', error);
      toast({
        title: "Erro inesperado",
        description: "Ocorreu um erro ao enviar a etiqueta.",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload de Etiqueta
          </DialogTitle>
          <DialogDescription>
            Anexar etiqueta de envio ao pedido <strong>{orderNumber}</strong>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <ShippingFileUpload
            onFileUploaded={handleFileUpload}
            maxSizeMB={10}
            required={true}
          />
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancelar
          </Button>
          <Button 
            onClick={handleSubmit} 
            disabled={!uploadedFile || isUploading}
            className="flex-1"
          >
            {isUploading ? "Enviando..." : "Enviar Etiqueta"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
