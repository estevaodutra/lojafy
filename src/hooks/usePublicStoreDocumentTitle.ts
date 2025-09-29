import { useEffect } from 'react';
import { PublicStoreData } from './usePublicStore';

export const usePublicStoreDocumentTitle = (store: PublicStoreData, pageTitle?: string) => {
  useEffect(() => {
    const storeName = store.store_name || 'Loja Online';
    const title = pageTitle ? `${pageTitle} - ${storeName}` : `${storeName} - Produtos Exclusivos`;
    document.title = title;
  }, [store.store_name, pageTitle]);
};