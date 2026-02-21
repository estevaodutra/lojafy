import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

const ITEMS_PER_PAGE = 24;

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
  ml_ready?: boolean;
}

export interface CatalogFilters {
  search?: string;
  category?: string;
  priceMin?: number;
  priceMax?: number;
  highRotationOnly?: boolean;
  inStock?: boolean;
  sortBy?: string;
  topProducts?: boolean;
  mlReadyOnly?: boolean;
}

export const useResellerCatalog = () => {
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [myStoreProducts, setMyStoreProducts] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [filters, setFilters] = useState<CatalogFilters>({});
  
  const { user } = useAuth();

  const fetchCatalogProducts = async (currentFilters?: CatalogFilters, page: number = currentPage) => {
    try {
      setIsLoading(true);
      
      const filtersToApply = currentFilters || filters;
      
      // If topProducts filter is active, fetch top 10 IDs first
      let topProductIds: string[] | null = null;
      if (filtersToApply.topProducts) {
        const { data: featureData } = await supabase
          .from('features')
          .select('id')
          .eq('slug', 'top_10_produtos')
          .maybeSingle();

        if (featureData) {
          const { data: featureProdutos } = await supabase
            .from('feature_produtos')
            .select('produto_id')
            .eq('feature_id', featureData.id)
            .eq('ativo', true)
            .order('ordem', { ascending: true })
            .limit(10);
          topProductIds = featureProdutos?.map(r => r.produto_id) || [];
        }
        if (topProductIds.length === 0) {
          setProducts([]);
          setTotalCount(0);
          setIsLoading(false);
          return;
        }
      }

      // Fetch ML ready product IDs
      const { data: mlReadyData } = await supabase
        .from('product_marketplace_data')
        .select('product_id')
        .eq('marketplace', 'mercadolivre')
        .or('is_validated.eq.true,listing_status.in.(ready,active,pending)');
      const mlReadyIds = new Set(mlReadyData?.map(r => r.product_id) || []);

      // If mlReadyOnly filter is active, restrict to ML ready IDs
      let mlFilterIds: string[] | null = null;
      if (filtersToApply.mlReadyOnly) {
        mlFilterIds = Array.from(mlReadyIds);
        if (mlFilterIds.length === 0) {
          setProducts([]);
          setTotalCount(0);
          setIsLoading(false);
          return;
        }
      }

      // Calculate pagination range
      const from = (page - 1) * ITEMS_PER_PAGE;
      const to = from + ITEMS_PER_PAGE - 1;
      
      let query = supabase
        .from('products')
        .select(`
          *,
          category:categories(id, name)
        `, { count: 'exact' })
        .eq('active', true)
        .range(from, to);

      // Apply top products filter
      if (topProductIds) {
        query = query.in('id', topProductIds);
      }

      // Apply ML ready only filter
      if (mlFilterIds) {
        query = query.in('id', mlFilterIds);
      }

      // Apply filters
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

      // Apply sorting
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

      const { data, error, count } = await query;

      if (error) throw error;
      
      setTotalCount(count || 0);

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

        const enrichedProducts = (data || []).map(product => ({
          ...product,
          isInMyStore: myProductIds.includes(product.id),
          myStorePrice: myProductPrices[product.id],
          ml_ready: mlReadyIds.has(product.id),
        }));

        setProducts(enrichedProducts);
      } else {
        const enrichedProducts = (data || []).map(product => ({
          ...product,
          ml_ready: mlReadyIds.has(product.id),
        }));
        setProducts(enrichedProducts);
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
    setCurrentPage(1); // Reset to page 1 when filters change
    fetchCatalogProducts(newFilters, 1);
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
    fetchCatalogProducts(filters, page);
  };

  const totalPages = Math.ceil(totalCount / ITEMS_PER_PAGE);

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
    currentPage,
    totalPages,
    totalCount,
    applyFilters,
    goToPage,
    calculateMargin,
    calculatePrice,
    getSuggestedPrice,
    getProductStats,
    refetch: () => fetchCatalogProducts(),
    setFilters,
    ITEMS_PER_PAGE
  };
};
