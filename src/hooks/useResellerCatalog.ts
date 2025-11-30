import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CatalogProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  original_price?: number;
  cost_price?: number;
  image_url?: string;
  main_image_url?: string;
  images: string[];
  brand?: string;
  sku?: string;
  category_id?: string;
  rating?: number;
  stock_quantity: number;
  high_rotation?: boolean;
  featured?: boolean;
  active: boolean;
  created_at: string;
  updated_at: string;
  category?: {
    id: string;
    name: string;
  };
  isInMyStore?: boolean;
  myStorePrice?: number;
}

export interface CatalogFilters {
  search?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  highRotationOnly?: boolean;
  inStock?: boolean;
  sortBy?: string;
}

export const useResellerCatalog = () => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [myStoreProducts, setMyStoreProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<CatalogFilters>({});
  
  const { user } = useAuth();

  const fetchCatalogProducts = async (currentFilters?: CatalogFilters) => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `)
        .eq('active', true);

      // Apply filters
      const filtersToApply = currentFilters || filters;
      
      if (filtersToApply.search) {
        query = query.or(`name.ilike.%${filtersToApply.search}%,sku.ilike.%${filtersToApply.search}%`);
      }
      
      if (filtersToApply.category && filtersToApply.category !== 'all') {
        query = query.eq('category_id', filtersToApply.category);
      }
      
      if (filtersToApply.priceMin) {
        query = query.gte('price', filtersToApply.priceMin);
      }
      
      if (filtersToApply.priceMax) {
        query = query.lte('price', filtersToApply.priceMax);
      }
      
      if (filtersToApply.highRotationOnly) {
        query = query.eq('high_rotation', true);
      }
      
      if (filtersToApply.inStock) {
        query = query.gt('stock_quantity', 0);
      }

      // Apply sorting with optimized hierarchy:
      // 1. Featured products first (featured DESC)
      // 2. High rotation products last (high_rotation ASC)
      // 3. User-selected sorting
      const sortBy = filtersToApply.sortBy || 'name';
      switch (sortBy) {
        case 'name':
          query = query
            .order('featured', { ascending: false, nullsFirst: false })
            .order('high_rotation', { ascending: true, nullsFirst: true })
            .order('name', { ascending: true });
          break;
        case 'price_asc':
          query = query
            .order('featured', { ascending: false, nullsFirst: false })
            .order('high_rotation', { ascending: true, nullsFirst: true })
            .order('price', { ascending: true });
          break;
        case 'price_desc':
          query = query
            .order('featured', { ascending: false, nullsFirst: false })
            .order('high_rotation', { ascending: true, nullsFirst: true })
            .order('price', { ascending: false });
          break;
        case 'recent':
          query = query
            .order('featured', { ascending: false, nullsFirst: false })
            .order('high_rotation', { ascending: true, nullsFirst: true })
            .order('created_at', { ascending: false });
          break;
        default:
          query = query
            .order('featured', { ascending: false, nullsFirst: false })
            .order('high_rotation', { ascending: true, nullsFirst: true })
            .order('name', { ascending: true });
      }

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user's store products to mark which ones are already in store
      if (user?.id) {
        const { data: myProducts } = await supabase
          .from('reseller_products')
          .select('product_id, custom_price')
          .eq('reseller_id', user.id);

        const myProductIds = myProducts?.map(p => p.product_id) || [];
        const myProductPrices = myProducts?.reduce((acc, p) => {
          acc[p.product_id] = p.custom_price;
          return acc;
        }, {} as Record<string, number>) || {};

        setMyStoreProducts(myProductIds);

        // Mark products that are in user's store
        const enrichedProducts = (data || []).map(product => ({
          ...product,
          isInMyStore: myProductIds.includes(product.id),
          myStorePrice: myProductPrices[product.id]
        }));

        setProducts(enrichedProducts);
      } else {
        setProducts(data || []);
      }
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching catalog products:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = (newFilters: CatalogFilters) => {
    setFilters(newFilters);
    fetchCatalogProducts(newFilters);
  };

  const calculateMargin = (cost: number, price: number): number => {
    if (!cost || cost === 0) return 0;
    return ((price - cost) / cost) * 100;
  };

  const calculatePrice = (cost: number, marginPercent: number): number => {
    if (!cost || cost === 0) return 0;
    return cost * (1 + marginPercent / 100);
  };

  const getSuggestedPrice = (product: CatalogProduct): number => {
    // If product has original_price, use it as suggested
    if (product.original_price) {
      return product.original_price;
    }
    
    // Otherwise, suggest a 30% margin over cost if available
    if (product.cost_price) {
      return calculatePrice(product.cost_price, 30);
    }
    
    // Fallback to current price
    return product.price;
  };

  const getProductStats = () => {
    return {
      totalProducts: products.length,
      inMyStore: products.filter(p => p.isInMyStore).length,
      highRotation: products.filter(p => p.high_rotation).length,
      averageMargin: products.reduce((acc, p) => {
        if (p.cost_price && p.price) {
          return acc + calculateMargin(p.cost_price, p.price);
        }
        return acc;
      }, 0) / products.filter(p => p.cost_price && p.price).length || 0
    };
  };

  useEffect(() => {
    fetchCatalogProducts();
  }, [user?.id]);

  return {
    products,
    myStoreProducts,
    isLoading,
    error,
    filters,
    applyFilters,
    calculateMargin,
    calculatePrice,
    getSuggestedPrice,
    getProductStats,
    refetch: () => fetchCatalogProducts(),
    setFilters
  };
};
