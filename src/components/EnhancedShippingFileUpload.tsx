import React, { useEffect } from 'react';
import { FileUploadArea } from '@/components/FileUploadArea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { UploadedFile } from '@/hooks/useFileUpload';

interface EnhancedShippingFileUploadProps {
  onFileUploaded?: (file: { name: string; path: string; size: number } | null) => void;
  maxSizeMB?: number;
  required?: boolean;
  orderId?: string;
}

export function EnhancedShippingFileUpload({ 
  onFileUploaded, 
  maxSizeMB = 5, 
  required = false,
  orderId 
}: EnhancedShippingFileUploadProps) {
  
  const handleFilesUploaded = async (files: UploadedFile[]) => {
    if (files.length === 0) {
      onFileUploaded?.(null);
      return;
    }

    const file = files[0];
    
    // If we have an orderId, save to database
    if (orderId) {
      try {
        const { error: dbError } = await supabase
          .from('order_shipping_files')
          .insert({
            order_id: orderId,
            file_name: file.name,
            file_path: file.path,
            file_size: file.size
          });

        if (dbError) {
          console.error('Database error:', dbError);
          toast.error('Erro ao salvar arquivo na base de dados');
          return;
        }

        // Update order has_shipping_file flag
        const { error: updateError } = await supabase
          .from('orders')
          .update({ has_shipping_file: true })
          .eq('id', orderId);

        if (updateError) {
          console.error('Update order error:', updateError);
        }

        toast.success('Arquivo anexado ao pedido com sucesso!');
      } catch (error) {
        console.error('Error saving to database:', error);
        toast.error('Erro ao processar arquivo');
        return;
      }
    }

    // Notify parent component
    onFileUploaded?.({
      name: file.name,
      path: file.path,
      size: file.size
    });
  };

  const handleFileRemoved = () => {
    onFileUploaded?.(null);
  };

  return (
    <FileUploadArea
      bucket="shipping-files"
      folder={orderId || 'temp'}
      maxSizeMB={maxSizeMB}
      allowedTypes={['application/pdf']}
      required={required}
      label="Anexar Etiqueta/Documento de Transporte"
      description="Anexe sua etiqueta personalizada, guia de remessa ou documento de transporte em formato PDF."
      multiple={false}
      enableRetry={true}
      maxRetries={3}
      onFilesUploaded={handleFilesUploaded}
      onFileRemoved={handleFileRemoved}
      showProgress={true}
      showFileList={true}
    />
  );
}