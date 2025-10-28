import { useEffect } from 'react';
import { useStoreConfig } from '@/hooks/useStoreConfig';

export const useDocumentTitle = (pageTitle?: string) => {
  const { config } = useStoreConfig();
  
  useEffect(() => {
    const storeName = config?.store_name || 'Lojafy';
    const title = pageTitle ? `${pageTitle} - ${storeName}` : `${storeName} - Sua Loja Online de Confiança`;
    document.title = title;
  }, [config?.store_name, pageTitle]);
};