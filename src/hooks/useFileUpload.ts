import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface FileUploadOptions {
  bucket: string;
  folder?: string;
  maxSizeMB?: number;
  allowedTypes?: string[];
  enableRetry?: boolean;
  maxRetries?: number;
  onProgress?: (progress: number) => void;
}

export interface UploadedFile {
  id: string;
  name: string;
  path: string;
  size: number;
  type: string;
  url?: string;
  uploadedAt: Date;
}

export interface FileUploadState {
  isUploading: boolean;
  progress: number;
  error: string | null;
  uploadedFiles: UploadedFile[];
}

export const useFileUpload = (options: FileUploadOptions) => {
  const [state, setState] = useState<FileUploadState>({
    isUploading: false,
    progress: 0,
    error: null,
    uploadedFiles: []
  });

  const validateFile = useCallback((file: File): string | null => {
    // Validate file size
    if (options.maxSizeMB && file.size > options.maxSizeMB * 1024 * 1024) {
      return `Arquivo muito grande. Tamanho máximo: ${options.maxSizeMB}MB`;
    }

    // Validate file type
    if (options.allowedTypes && !options.allowedTypes.includes(file.type)) {
      const allowedTypesStr = options.allowedTypes
        .map(type => type.split('/')[1]?.toUpperCase())
        .filter(Boolean)
        .join(', ');
      return `Tipo de arquivo não permitido. Tipos aceitos: ${allowedTypesStr}`;
    }

    return null;
  }, [options.maxSizeMB, options.allowedTypes]);

  const uploadFileWithRetry = useCallback(async (
    file: File, 
    filePath: string, 
    retryCount = 0
  ): Promise<string> => {
    try {
      const { error: uploadError } = await supabase.storage
        .from(options.bucket)
        .upload(filePath, file, {
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // Get public URL if bucket is public
      const { data: { publicUrl } } = supabase.storage
        .from(options.bucket)
        .getPublicUrl(filePath);

      return publicUrl;
    } catch (error: any) {
      if (options.enableRetry && retryCount < (options.maxRetries || 3)) {
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1)));
        return uploadFileWithRetry(file, filePath, retryCount + 1);
      }
      throw error;
    }
  }, [options.bucket, options.enableRetry, options.maxRetries]);

  const uploadFile = useCallback(async (file: File): Promise<UploadedFile> => {
    const validationError = validateFile(file);
    if (validationError) {
      throw new Error(validationError);
    }

    setState(prev => ({ 
      ...prev, 
      isUploading: true, 
      progress: 0, 
      error: null 
    }));

    try {
      const fileExt = file.name.split('.').pop();
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2)}`;
      const fileName = `${uniqueId}.${fileExt}`;
      const filePath = options.folder ? `${options.folder}/${fileName}` : fileName;

      options.onProgress?.(25);
      
      const url = await uploadFileWithRetry(file, filePath);
      
      options.onProgress?.(100);

      const uploadedFile: UploadedFile = {
        id: uniqueId,
        name: file.name,
        path: filePath,
        size: file.size,
        type: file.type,
        url,
        uploadedAt: new Date()
      };

      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 100,
        uploadedFiles: [...prev.uploadedFiles, uploadedFile]
      }));

      toast.success('Arquivo enviado com sucesso!');
      return uploadedFile;

    } catch (error: any) {
      const errorMessage = error.message || 'Erro ao enviar arquivo';
      
      setState(prev => ({
        ...prev,
        isUploading: false,
        progress: 0,
        error: errorMessage
      }));

      toast.error(errorMessage);
      throw error;
    }
  }, [validateFile, uploadFileWithRetry, options]);

  const uploadFiles = useCallback(async (files: File[]): Promise<UploadedFile[]> => {
    const results: UploadedFile[] = [];
    
    for (let i = 0; i < files.length; i++) {
      try {
        const result = await uploadFile(files[i]);
        results.push(result);
      } catch (error) {
        console.error(`Error uploading file ${files[i].name}:`, error);
      }
    }

    return results;
  }, [uploadFile]);

  const removeFile = useCallback(async (fileId: string): Promise<void> => {
    const file = state.uploadedFiles.find(f => f.id === fileId);
    if (!file) return;

    try {
      const { error } = await supabase.storage
        .from(options.bucket)
        .remove([file.path]);

      if (error) throw error;

      setState(prev => ({
        ...prev,
        uploadedFiles: prev.uploadedFiles.filter(f => f.id !== fileId)
      }));

      toast.success('Arquivo removido com sucesso!');
    } catch (error: any) {
      toast.error('Erro ao remover arquivo');
      console.error('Error removing file:', error);
    }
  }, [state.uploadedFiles, options.bucket]);

  const clearFiles = useCallback(() => {
    setState(prev => ({
      ...prev,
      uploadedFiles: [],
      error: null
    }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      isUploading: false,
      progress: 0,
      error: null,
      uploadedFiles: []
    });
  }, []);

  return {
    ...state,
    uploadFile,
    uploadFiles,
    removeFile,
    clearFiles,
    resetState
  };
};