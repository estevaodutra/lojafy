import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ResellerStore {
  id: string;
  reseller_id: string;
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
  payment_methods: any;
  policies: any;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface ResellerProduct {
  id: string;
  reseller_id: string;
  product_id: string;
  active: boolean;
  custom_price?: number;
  custom_description?: string;
  position: number;
  created_at: string;
  updated_at: string;
  product?: any; // Joined product data
}

export const useResellerStore = () => {
  const [store, setStore] = useState<ResellerStore | null>(null);
  const [products, setProducts] = useState<ResellerProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const { user } = useAuth();

  const fetchStore = async () => {
    if (!user?.id) return;

    try {
      setIsLoading(true);
      
      const { data: storeData, error: storeError } = await supabase
        .from('reseller_stores')
        .select('*')
        .eq('reseller_id', user.id)
        .single();

      if (storeError && storeError.code !== 'PGRST116') { // Not found error
        throw storeError;
      }

      setStore(storeData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching reseller store:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProducts = async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('reseller_products')
        .select(`
          id,
          reseller_id,
          product_id,
          active,
          custom_price,
          custom_description,
          position,
          created_at,
          updated_at,
          products!reseller_products_product_id_fkey (
            id,
            name,
            price,
            sku,
            main_image_url,
            image_url,
            brand,
            description,
            active,
            category_id,
            categories!products_category_id_fkey (
              id,
              name,
              slug,
              icon,
              color
            )
          )
        `)
        .eq('reseller_id', user.id)
        .order('position', { ascending: true });

      if (error) throw error;
      
      // Transform the data to match expected structure
      const transformedData = data?.map(item => ({
        ...item,
        product: item.products
      })) || [];
      
      setProducts(transformedData);
    } catch (err: any) {
      setError(err.message);
      console.error('Error fetching reseller products:', err);
    }
  };

  const createOrUpdateStore = async (storeData: Partial<ResellerStore>) => {
    if (!user?.id) return;

    try {
      const dataToSave = {
        store_name: storeData.store_name,
        store_slug: storeData.store_slug,
        logo_url: storeData.logo_url,
        primary_color: storeData.primary_color,
        secondary_color: storeData.secondary_color,
        accent_color: storeData.accent_color,
        banner_image_url: storeData.banner_image_url,
        banner_title: storeData.banner_title,
        banner_subtitle: storeData.banner_subtitle,
        contact_phone: storeData.contact_phone,
        contact_email: storeData.contact_email,
        contact_address: storeData.contact_address,
        whatsapp: storeData.whatsapp,
        payment_methods: storeData.payment_methods,
        policies: storeData.policies,
        active: storeData.active,
        reseller_id: user.id,
        updated_at: new Date().toISOString()
      };

      if (store?.id) {
        // Update existing store
        const { data, error } = await supabase
          .from('reseller_stores')
          .update(dataToSave)
          .eq('id', store.id)
          .select()
          .single();

        if (error) throw error;
        setStore(data);
        toast.success('Loja atualizada com sucesso!');
      } else {
        // Create new store
        const { data, error } = await supabase
          .from('reseller_stores')
          .insert(dataToSave)
          .select()
          .single();

        if (error) throw error;
        setStore(data);
        toast.success('Loja criada com sucesso!');
      }
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao salvar loja: ' + err.message);
      console.error('Error creating/updating store:', err);
    }
  };

  const addProduct = async (productId: string, customPrice?: number) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('reseller_products')
        .insert({
          reseller_id: user.id,
          product_id: productId,
          custom_price: customPrice,
          position: products.length + 1
        })
        .select(`
          id,
          reseller_id,
          product_id,
          active,
          custom_price,
          custom_description,
          position,
          created_at,
          updated_at,
          products!reseller_products_product_id_fkey (
            id,
            name,
            price,
            sku,
            main_image_url,
            image_url,
            brand,
            description,
            active,
            category_id,
            categories!products_category_id_fkey (
              id,
              name,
              slug,
              icon,
              color
            )
          )
        `)
        .single();

      if (error) throw error;
      
      // Transform the data to match expected structure
      const transformedItem = {
        ...data,
        product: data.products
      };
      
      setProducts(prev => [...prev, transformedItem]);
      toast.success('Produto adicionado à sua loja!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao adicionar produto: ' + err.message);
      console.error('Error adding product:', err);
    }
  };

  const removeProduct = async (productId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('reseller_products')
        .delete()
        .eq('reseller_id', user.id)
        .eq('product_id', productId);

      if (error) throw error;
      
      setProducts(prev => prev.filter(p => p.product_id !== productId));
      toast.success('Produto removido da sua loja!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao remover produto: ' + err.message);
      console.error('Error removing product:', err);
    }
  };

  const updateProductStatus = async (id: string, active: boolean) => {
    try {
      const { data, error } = await supabase
        .from('reseller_products')
        .update({ active })
        .eq('id', id)
        .select(`
          id,
          reseller_id,
          product_id,
          active,
          custom_price,
          custom_description,
          position,
          created_at,
          updated_at,
          products!reseller_products_product_id_fkey (
            id,
            name,
            price,
            sku,
            main_image_url,
            image_url,
            brand,
            description,
            active,
            category_id,
            categories!products_category_id_fkey (
              id,
              name,
              slug,
              icon,
              color
            )
          )
        `)
        .single();

      if (error) throw error;
      
      // Transform the data to match expected structure
      const transformedItem = {
        ...data,
        product: data.products
      };
      
      setProducts(prev => 
        prev.map(p => p.id === id ? transformedItem : p)
      );
      
      toast.success(`Produto ${active ? 'ativado' : 'desativado'} com sucesso!`);
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar produto: ' + err.message);
      console.error('Error updating product status:', err);
    }
  };

  const updateProductPrice = async (id: string, customPrice: number) => {
    try {
      const { data, error } = await supabase
        .from('reseller_products')
        .update({ custom_price: customPrice })
        .eq('id', id)
        .select(`
          id,
          reseller_id,
          product_id,
          active,
          custom_price,
          custom_description,
          position,
          created_at,
          updated_at,
          products!reseller_products_product_id_fkey (
            id,
            name,
            price,
            sku,
            main_image_url,
            image_url,
            brand,
            description,
            active,
            category_id,
            categories!products_category_id_fkey (
              id,
              name,
              slug,
              icon,
              color
            )
          )
        `)
        .single();

      if (error) throw error;
      
      // Transform the data to match expected structure
      const transformedItem = {
        ...data,
        product: data.products
      };
      
      setProducts(prev => 
        prev.map(p => p.id === id ? transformedItem : p)
      );
      
      toast.success('Preço atualizado com sucesso!');
    } catch (err: any) {
      setError(err.message);
      toast.error('Erro ao atualizar preço: ' + err.message);
      console.error('Error updating product price:', err);
    }
  };

  useEffect(() => {
    if (user?.id) {
      fetchStore();
      fetchProducts();
    }
  }, [user?.id]);

  return {
    store,
    products,
    isLoading,
    error,
    fetchStore,
    fetchProducts,
    createOrUpdateStore,
    addProduct,
    removeProduct,
    updateProductStatus,
    updateProductPrice,
    refetch: () => {
      fetchStore();
      fetchProducts();
    }
  };
};