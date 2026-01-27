import { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Upload, X, FileText, Image, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface TicketAttachment {
  name: string;
  size: number;
  url: string;
  type: string;
}

interface TicketAttachmentUploadProps {
  attachments: TicketAttachment[];
  onAttachmentsChange: (attachments: TicketAttachment[]) => void;
  maxFiles?: number;
  maxSizeMB?: number;
  required?: boolean;
  disabled?: boolean;
}

const ACCEPTED_TYPES = {
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/png': ['.png'],
  'image/webp': ['.webp'],
  'application/pdf': ['.pdf'],
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

export const TicketAttachmentUpload = ({
  attachments,
  onAttachmentsChange,
  maxFiles = 5,
  maxSizeMB = 5,
  required = false,
  disabled = false,
}: TicketAttachmentUploadProps) => {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (!user) {
      toast({
        title: 'Erro',
        description: 'Você precisa estar logado para enviar arquivos.',
        variant: 'destructive',
      });
      return;
    }

    const remainingSlots = maxFiles - attachments.length;
    if (remainingSlots <= 0) {
      toast({
        title: 'Limite atingido',
        description: `Você pode enviar no máximo ${maxFiles} arquivos.`,
        variant: 'destructive',
      });
      return;
    }

    const filesToUpload = acceptedFiles.slice(0, remainingSlots);
    
    // Validate file sizes
    const invalidFiles = filesToUpload.filter(f => f.size > MAX_FILE_SIZE);
    if (invalidFiles.length > 0) {
      toast({
        title: 'Arquivo muito grande',
        description: `Alguns arquivos excedem o limite de ${maxSizeMB}MB.`,
        variant: 'destructive',
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    const newAttachments: TicketAttachment[] = [];
    const totalFiles = filesToUpload.length;

    for (let i = 0; i < filesToUpload.length; i++) {
      const file = filesToUpload[i];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      try {
        const { data, error } = await supabase.storage
          .from('order-ticket-attachments')
          .upload(fileName, file);

        if (error) throw error;

        const { data: { publicUrl } } = supabase.storage
          .from('order-ticket-attachments')
          .getPublicUrl(fileName);

        newAttachments.push({
          name: file.name,
          size: file.size,
          url: publicUrl,
          type: file.type,
        });

        setUploadProgress(((i + 1) / totalFiles) * 100);
      } catch (error) {
        console.error('Error uploading file:', error);
        toast({
          title: 'Erro ao enviar arquivo',
          description: `Não foi possível enviar: ${file.name}`,
          variant: 'destructive',
        });
      }
    }

    if (newAttachments.length > 0) {
      onAttachmentsChange([...attachments, ...newAttachments]);
      toast({
        title: 'Arquivos enviados',
        description: `${newAttachments.length} arquivo(s) enviado(s) com sucesso.`,
      });
    }

    setUploading(false);
    setUploadProgress(0);
  }, [user, attachments, maxFiles, maxSizeMB, onAttachmentsChange]);

  const removeAttachment = (index: number) => {
    const updated = attachments.filter((_, i) => i !== index);
    onAttachmentsChange(updated);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_TYPES,
    maxFiles: maxFiles - attachments.length,
    disabled: disabled || uploading || attachments.length >= maxFiles,
  });

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const isImage = (type: string) => type.startsWith('image/');

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={cn(
          'border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors',
          isDragActive && 'border-primary bg-primary/5',
          disabled || uploading || attachments.length >= maxFiles
            ? 'opacity-50 cursor-not-allowed border-muted'
            : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
        )}
      >
        <input {...getInputProps()} />
        
        {uploading ? (
          <div className="space-y-2">
            <Loader2 className="h-8 w-8 mx-auto animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Enviando arquivos...</p>
            <Progress value={uploadProgress} className="h-2 max-w-xs mx-auto" />
          </div>
        ) : (
          <>
            <Upload className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
            <p className="text-sm font-medium">
              {isDragActive ? 'Solte os arquivos aqui' : 'Arraste arquivos ou clique para selecionar'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              JPG, PNG, WEBP ou PDF (máx. {maxSizeMB}MB cada, até {maxFiles} arquivos)
            </p>
          </>
        )}
      </div>

      {/* Attachment previews */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group border rounded-lg p-2 flex items-center gap-2 bg-muted/30"
            >
              {isImage(attachment.type) ? (
                <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0">
                  <img
                    src={attachment.url}
                    alt={attachment.name}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-10 h-10 rounded bg-muted flex items-center justify-center flex-shrink-0">
                  <FileText className="h-5 w-5 text-muted-foreground" />
                </div>
              )}
              
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(attachment.size)}</p>
              </div>

              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-6 w-6 absolute -top-2 -right-2 bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-full"
                onClick={() => removeAttachment(index)}
                disabled={disabled}
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ))}
        </div>
      )}

      {/* Required hint */}
      {required && attachments.length === 0 && (
        <p className="text-xs text-amber-600 flex items-center gap-1">
          <Image className="h-3 w-3" />
          Para solicitações de troca, é obrigatório anexar foto(s) do produto.
        </p>
      )}
    </div>
  );
};
