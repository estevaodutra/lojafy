import { createContext, useContext } from 'react';
import { PublicStoreData } from './usePublicStore';

export interface PublicStoreContextType {
  store: PublicStoreData;
}

export const PublicStoreContext = createContext<PublicStoreContextType | undefined>(undefined);

export const usePublicStoreContext = () => {
  const context = useContext(PublicStoreContext);
  if (context === undefined) {
    throw new Error('usePublicStoreContext must be used within a PublicStoreProvider');
  }
  return context;
};