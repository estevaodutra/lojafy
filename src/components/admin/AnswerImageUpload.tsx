import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, X, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Attachment {
  name: string;
  size: number;
  url: string;
  type: string;
}

interface AnswerImageUploadProps {
  attachments: Attachment[];
  onUpload: (attachments: Attachment[]) => void;
  maxFiles?: number;
  maxSize?: number;
}

export const AnswerImageUpload = ({ 
  attachments, 
  onUpload, 
  maxFiles = 5,
  maxSize = 5 * 1024 * 1024 // 5MB
}: AnswerImageUploadProps) => {
  const [uploading, setUploading] = useState(false);

  const uploadToStorage = async (file: File): Promise<Attachment | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}-${Date.now()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError, data } = await supabase.storage
        .from('answer-attachments')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('answer-attachments')
        .getPublicUrl(filePath);

      return {
        name: file.name,
        size: file.size,
        url: publicUrl,
        type: file.type
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error(`Erro ao fazer upload de ${file.name}`);
      return null;
    }
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (attachments.length + acceptedFiles.length > maxFiles) {
      toast.error(`Máximo de ${maxFiles} imagens permitidas`);
      return;
    }

    setUploading(true);

    const uploadPromises = acceptedFiles.map(file => uploadToStorage(file));
    const uploadedAttachments = await Promise.all(uploadPromises);
    
    const validAttachments = uploadedAttachments.filter((att): att is Attachment => att !== null);
    
    if (validAttachments.length > 0) {
      onUpload([...attachments, ...validAttachments]);
      toast.success(`${validAttachments.length} imagem(ns) anexada(s)`);
    }

    setUploading(false);
  }, [attachments, onUpload, maxFiles]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.webp', '.gif']
    },
    maxSize,
    disabled: uploading || attachments.length >= maxFiles,
    multiple: true
  });

  const removeAttachment = async (index: number) => {
    const attachment = attachments[index];
    
    // Try to delete from storage (optional, not critical if fails)
    try {
      const fileName = attachment.url.split('/').pop();
      if (fileName) {
        await supabase.storage
          .from('answer-attachments')
          .remove([fileName]);
      }
    } catch (error) {
      console.error('Error removing file from storage:', error);
    }

    const newAttachments = attachments.filter((_, i) => i !== index);
    onUpload(newAttachments);
    toast.success('Imagem removida');
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-3">
      {/* Dropzone */}
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-6 text-center cursor-pointer
          transition-colors duration-200
          ${isDragActive 
            ? 'border-primary bg-primary/5' 
            : 'border-border hover:border-primary/50 hover:bg-muted/50'
          }
          ${(uploading || attachments.length >= maxFiles) && 'opacity-50 cursor-not-allowed'}
        `}
      >
        <input {...getInputProps()} />
        <div className="flex flex-col items-center gap-2">
          {uploading ? (
            <>
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">Fazendo upload...</p>
            </>
          ) : (
            <>
              <Upload className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {isDragActive
                    ? 'Solte as imagens aqui...'
                    : 'Arraste imagens ou clique para selecionar'}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  PNG, JPG, WEBP, GIF • Máximo {formatFileSize(maxSize)} por imagem
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {attachments.length}/{maxFiles} imagens
              </p>
            </>
          )}
        </div>
      </div>

      {/* Preview Grid */}
      {attachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {attachments.map((attachment, index) => (
            <div
              key={index}
              className="relative group rounded-lg border bg-muted/30 overflow-hidden"
            >
              <div className="aspect-square relative">
                <img
                  src={attachment.url}
                  alt={attachment.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/50 transition-colors duration-200" />
              </div>
              
              <Button
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={() => removeAttachment(index)}
              >
                <X className="h-4 w-4" />
              </Button>

              <div className="p-2 bg-background/95 backdrop-blur-sm">
                <p className="text-xs font-medium truncate" title={attachment.name}>
                  {attachment.name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatFileSize(attachment.size)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {attachments.length >= maxFiles && (
        <p className="text-xs text-muted-foreground text-center">
          Limite máximo de {maxFiles} imagens atingido
        </p>
      )}
    </div>
  );
};
