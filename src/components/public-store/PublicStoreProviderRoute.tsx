import React from "react";
import { useParams } from "react-router-dom";
import { usePublicStore } from "@/hooks/usePublicStore";
import { PublicStoreContext } from "@/hooks/usePublicStoreContext";
import { usePublicStoreDocumentTitle } from "@/hooks/usePublicStoreDocumentTitle";
import { usePublicStoreFavicon } from "@/hooks/usePublicStoreFavicon";

interface ProviderProps {
  children: React.ReactNode;
}

// Wraps public store pages to provide store context based on :slug
const PublicStoreProviderRoute: React.FC<ProviderProps> = ({ children }) => {
  const { slug } = useParams<{ slug: string }>();
  const { store, isLoading, error } = usePublicStore(slug);

  // Update document title and favicon when store data is available
  usePublicStoreDocumentTitle(store!, undefined);
  usePublicStoreFavicon(store!);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-muted-foreground">Carregando loja…</div>
      </div>
    );
  }

  if (error || !store) {
    // Reset to default favicon and title when store is not found
    if (typeof document !== 'undefined') {
      document.title = 'Loja não encontrada';
      const existingFavicon = document.querySelector('link[rel="icon"]');
      if (existingFavicon) {
        existingFavicon.remove();
      }
      const link = document.createElement('link');
      link.rel = 'icon';
      link.href = '/favicon.ico';
      link.type = 'image/x-icon';
      document.head.appendChild(link);
    }
    
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-2">Loja não encontrada</h1>
          <p className="text-muted-foreground">Verifique o endereço e tente novamente.</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen"
      style={{
        // These CSS variables are consumed by header/footer and other public store components
        // Values are already normalized in other components using HSL tokens
        // We keep inline vars here to avoid duplicating wrappers
        // eslint-disable-next-line @typescript-eslint/consistent-type-assertions
        "--primary": `hsl(${store.primary_color || "#000000"})`,
        "--secondary": `hsl(${store.secondary_color || "#f3f4f6"})`,
        "--accent": `hsl(${store.accent_color || "#3b82f6"})`,
      } as React.CSSProperties}
    >
      <PublicStoreContext.Provider value={{ store }}>
        {children}
      </PublicStoreContext.Provider>
    </div>
  );
};

export default PublicStoreProviderRoute;

