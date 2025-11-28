import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface ResellerBanner {
  id: string;
  reseller_id: string;
  banner_type: 'carousel' | 'featured';
  desktop_image_url: string;
  mobile_image_url?: string;
  link_url?: string;
  open_new_tab: boolean;
  position: number;
  active: boolean;
  created_at?: string;
  updated_at?: string;
}

export const useResellerBanners = (resellerId?: string, bannerType?: 'carousel' | 'featured') => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: banners = [], isLoading, error } = useQuery({
    queryKey: ['reseller-banners', resellerId, bannerType],
    queryFn: async () => {
      if (!resellerId) return [];
      
      let query = supabase
        .from('reseller_banners')
        .select('*')
        .eq('reseller_id', resellerId)
        .eq('active', true);
      
      if (bannerType) {
        query = query.eq('banner_type', bannerType);
      }
      
      query = query.order('position', { ascending: true });
      
      const { data, error } = await query;
      
      if (error) throw error;
      return data as ResellerBanner[];
    },
    enabled: !!resellerId,
  });

  const createBanner = useMutation({
    mutationFn: async (data: Omit<ResellerBanner, 'id' | 'created_at' | 'updated_at'>) => {
      const { error } = await supabase
        .from('reseller_banners')
        .insert([data]);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-banners'] });
      toast({
        title: "Banner criado",
        description: "O banner foi criado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao criar banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const updateBanner = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<ResellerBanner> }) => {
      const { error } = await supabase
        .from('reseller_banners')
        .update(data)
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-banners'] });
      toast({
        title: "Banner atualizado",
        description: "O banner foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const deleteBanner = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('reseller_banners')
        .delete()
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-banners'] });
      toast({
        title: "Banner excluído",
        description: "O banner foi excluído com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao excluir banner",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  const toggleActive = useMutation({
    mutationFn: async ({ id, active }: { id: string; active: boolean }) => {
      const { error } = await supabase
        .from('reseller_banners')
        .update({ active })
        .eq('id', id);
      
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reseller-banners'] });
      toast({
        title: "Status atualizado",
        description: "O status do banner foi atualizado com sucesso.",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  return {
    banners,
    isLoading,
    error,
    createBanner,
    updateBanner,
    deleteBanner,
    toggleActive,
  };
};