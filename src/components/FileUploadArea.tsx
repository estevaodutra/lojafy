import React, { useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Upload, 
  FileText, 
  Image, 
  File, 
  X, 
  AlertCircle, 
  CheckCircle,
  RotateCcw
} from 'lucide-react';
import { useFileUpload, FileUploadOptions, UploadedFile } from '@/hooks/useFileUpload';
import { cn } from '@/lib/utils';

interface FileUploadAreaProps extends FileUploadOptions {
  className?: string;
  multiple?: boolean;
  required?: boolean;
  label?: string;
  description?: string;
  showProgress?: boolean;
  showFileList?: boolean;
  onFilesUploaded?: (files: UploadedFile[]) => void;
  onFileRemoved?: (fileId: string) => void;
}

const getFileIcon = (fileType: string) => {
  if (fileType.startsWith('image/')) return Image;
  if (fileType === 'application/pdf') return FileText;
  return File;
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export const FileUploadArea: React.FC<FileUploadAreaProps> = ({
  className,
  multiple = false,
  required = false,
  label,
  description,
  showProgress = true,
  showFileList = true,
  onFilesUploaded,
  onFileRemoved,
  ...uploadOptions
}) => {
  const {
    isUploading,
    progress,
    error,
    uploadedFiles,
    uploadFile,
    uploadFiles,
    removeFile,
    resetState
  } = useFileUpload(uploadOptions);

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;

    try {
      if (multiple) {
        const results = await uploadFiles(acceptedFiles);
        onFilesUploaded?.(results);
      } else {
        const result = await uploadFile(acceptedFiles[0]);
        onFilesUploaded?.(result ? [result] : []);
      }
    } catch (error) {
      console.error('Upload error:', error);
    }
  }, [multiple, uploadFile, uploadFiles, onFilesUploaded]);

  const handleRemoveFile = useCallback(async (fileId: string) => {
    await removeFile(fileId);
    onFileRemoved?.(fileId);
  }, [removeFile, onFileRemoved]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: uploadOptions.allowedTypes ? 
      Object.fromEntries(uploadOptions.allowedTypes.map(type => [type, []])) : 
      undefined,
    maxSize: uploadOptions.maxSizeMB ? uploadOptions.maxSizeMB * 1024 * 1024 : undefined,
    multiple,
    disabled: isUploading
  });

  const allowedTypesStr = uploadOptions.allowedTypes
    ?.map(type => type.split('/')[1]?.toUpperCase())
    .filter(Boolean)
    .join(', ');

  return (
    <div className={cn("space-y-4", className)}>
      {label && (
        <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
          {label} {required && <span className="text-destructive">*</span>}
        </label>
      )}

      <Card 
        {...getRootProps()} 
        className={cn(
          "cursor-pointer transition-all duration-200 border-dashed",
          {
            'border-primary bg-primary/5': isDragActive,
            'border-muted-foreground/25 hover:border-primary/50': !isDragActive && !isUploading,
            'opacity-50 cursor-not-allowed': isUploading,
            'border-destructive bg-destructive/5': error
          }
        )}
      >
        <CardContent className="flex flex-col items-center justify-center py-8 px-6">
          <input {...getInputProps()} />
          
          <Upload className="h-12 w-12 text-muted-foreground mb-4" />
          
          <div className="text-center space-y-2">
            <p className="text-sm font-medium">
              {isDragActive 
                ? `Solte ${multiple ? 'os arquivos' : 'o arquivo'} aqui` 
                : `Clique ou arraste ${multiple ? 'arquivos' : 'um arquivo'}`}
            </p>
            
            <div className="text-xs text-muted-foreground space-y-1">
              {allowedTypesStr && (
                <p>Tipos aceitos: {allowedTypesStr}</p>
              )}
              {uploadOptions.maxSizeMB && (
                <p>Tamanho máximo: {uploadOptions.maxSizeMB}MB</p>
              )}
              {description && <p>{description}</p>}
            </div>
          </div>

          {showProgress && isUploading && (
            <div className="w-full mt-4 space-y-2">
              <Progress value={progress} className="w-full" />
              <p className="text-xs text-center text-muted-foreground">
                Enviando... {progress}%
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button
              variant="outline"
              size="sm"
              onClick={resetState}
              className="ml-2"
            >
              <RotateCcw className="h-3 w-3 mr-1" />
              Tentar novamente
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {required && uploadedFiles.length === 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-xs">
            O envio de arquivo é obrigatório.
          </AlertDescription>
        </Alert>
      )}

      {showFileList && uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Arquivos enviados:</p>
          {uploadedFiles.map((file) => {
            const FileIcon = getFileIcon(file.type);
            return (
              <Card key={file.id}>
                <CardContent className="flex items-center justify-between p-3">
                  <div className="flex items-center gap-3">
                    <FileIcon className="h-8 w-8 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">{file.name}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{formatFileSize(file.size)}</span>
                        <CheckCircle className="h-3 w-3 text-green-500" />
                        <span>Enviado</span>
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRemoveFile(file.id)}
                    disabled={isUploading}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};