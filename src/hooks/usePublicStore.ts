import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface PublicStoreData {
  id: string;
  store_name: string;
  store_slug: string;
  logo_url?: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  banner_image_url?: string;
  banner_title: string;
  banner_subtitle: string;
  contact_phone?: string;
  contact_email?: string;
  contact_address?: string;
  whatsapp?: string;
  active: boolean;
}

export interface PublicResellerProduct {
  id: string;
  custom_price?: number;
  active: boolean;
  product: {
    id: string;
    name: string;
    price: number;
    main_image_url?: string;
    image_url?: string;
    images?: string[];
    brand?: string;
    rating?: number;
    review_count?: number;
    badge?: string;
  };
}

export const usePublicStore = (slug?: string) => {
  const [store, setStore] = useState<PublicStoreData | null>(null);
  const [products, setProducts] = useState<PublicResellerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPublicStore = async () => {
      if (!slug) {
        setError('Slug da loja não fornecido');
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // Buscar dados da loja
        const { data: storeData, error: storeError } = await supabase
          .from('reseller_stores')
          .select('*')
          .eq('store_slug', slug)
          .eq('active', true)
          .single();

        if (storeError) {
          if (storeError.code === 'PGRST116') {
            setError('Loja não encontrada');
          } else {
            throw storeError;
          }
          setIsLoading(false);
          return;
        }

        setStore(storeData);

        // Buscar produtos da loja
        const { data: productsData, error: productsError } = await supabase
          .from('reseller_products')
          .select(`
            id,
            custom_price,
            active,
            product:products(
              id,
              name,
              price,
              main_image_url,
              image_url,
              images,
              brand,
              rating,
              review_count,
              badge
            )
          `)
          .eq('reseller_id', storeData.reseller_id)
          .eq('active', true);

        if (productsError) {
          throw productsError;
        }

        // Filtrar produtos ativos
        const activeProducts = (productsData || []).filter(
          (item) => item.product && item.active
        );

        setProducts(activeProducts);

      } catch (err: any) {
        console.error('Erro ao carregar loja pública:', err);
        setError(err.message || 'Erro ao carregar loja');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPublicStore();
  }, [slug]);

  return {
    store,
    products,
    isLoading,
    error,
  };
};