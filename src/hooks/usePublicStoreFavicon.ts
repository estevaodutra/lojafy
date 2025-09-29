import { useEffect } from 'react';
import { PublicStoreData } from './usePublicStore';

export const usePublicStoreFavicon = (store: PublicStoreData) => {
  useEffect(() => {
    const updateFavicon = (iconUrl: string) => {
      // Remove existing favicon
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.remove();
      }

      // Add new favicon
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = iconUrl;
      link.type = 'image/png';
      document.head.appendChild(link);
    };

    if (store.logo_url) {
      // Test if logo URL is accessible
      const img = new Image();
      img.onload = () => {
        updateFavicon(store.logo_url!);
      };
      img.onerror = () => {
        // Fallback to default favicon
        updateFavicon('/favicon.ico');
      };
      img.src = store.logo_url;
    } else {
      // Use default favicon
      updateFavicon('/favicon.ico');
    }

    // Cleanup function to restore default favicon when component unmounts
    return () => {
      updateFavicon('/favicon.ico');
    };
  }, [store.logo_url]);
};