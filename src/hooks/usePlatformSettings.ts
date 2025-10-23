import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface AdditionalCost {
  id: string;
  name: string;
  value: number;
  type: 'fixed' | 'percentage';
  active: boolean;
  created_at: string;
}

interface PlatformSettings {
  id: string;
  platform_fee_value: number;
  platform_fee_type: 'percentage' | 'fixed';
  gateway_fee_percentage: number;
  reseller_withdrawal_fee_value: number;
  reseller_withdrawal_fee_type: 'percentage' | 'fixed';
  withdrawal_processing_days: number;
  guarantee_period_days: number;
  auto_withdrawal_enabled: boolean;
  auto_withdrawal_frequency: string;
  additional_costs?: AdditionalCost[];
  created_at: string;
  updated_at: string;
}

interface UpdatePlatformSettingsParams {
  platform_fee_value?: number;
  platform_fee_type?: 'percentage' | 'fixed';
  gateway_fee_percentage?: number;
  reseller_withdrawal_fee_value?: number;
  reseller_withdrawal_fee_type?: 'percentage' | 'fixed';
  recalculate_prices?: boolean;
}

export const usePlatformSettings = () => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ['platform-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('platform_settings')
        .select('*')
        .single();
      
      if (error) {
        console.error('Error fetching platform settings:', error);
        throw error;
      }
      
      // Parse additional_costs from JSON
      const parsedData = {
        ...data,
        additional_costs: (data.additional_costs as unknown as AdditionalCost[]) || [],
      };
      
      return parsedData as PlatformSettings;
    },
  });

  const updateSettings = useMutation({
    mutationFn: async (params: UpdatePlatformSettingsParams) => {
      const { recalculate_prices, ...updateData } = params;
      
      // Filter out undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(updateData).filter(([_, value]) => value !== undefined)
      );
      
      // Update platform settings
      const { data, error } = await supabase
        .from('platform_settings')
        .update(filteredUpdateData)
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;

      // If recalculate_prices is true, trigger the recalculation
      if (recalculate_prices && settings) {
        const { error: recalcError } = await supabase.functions.invoke('recalculate-product-prices', {
          body: { 
            platform_fee_value: updateData.platform_fee_value ?? settings.platform_fee_value,
            platform_fee_type: updateData.platform_fee_type ?? settings.platform_fee_type,
            gateway_fee_percentage: updateData.gateway_fee_percentage ?? settings.gateway_fee_percentage
          }
        });

        if (recalcError) {
          console.error('Error triggering price recalculation:', recalcError);
          toast({
            title: "Configurações salvas",
            description: "Configurações atualizadas, mas houve erro no recálculo de preços.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Configurações atualizadas",
            description: "Taxas alteradas e preços dos produtos recalculados com sucesso!",
          });
        }
      } else {
        toast({
          title: "Configurações salvas",
          description: "Configurações da plataforma atualizadas com sucesso!",
        });
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
    },
    onError: (error) => {
      console.error('Error updating platform settings:', error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações. Tente novamente.",
        variant: "destructive",
      });
    },
  });

  // Function to calculate impact on product prices
  const calculatePriceImpact = async (newSettings: Partial<UpdatePlatformSettingsParams>) => {
    const { data: products, error } = await supabase
      .from('products')
      .select('id, cost_price, price')
      .eq('active', true)
      .not('cost_price', 'is', null);

    if (error || !products) return { affected_products: 0, average_change: 0 };

    let totalChange = 0;
    let validProducts = 0;

    products.forEach(product => {
      if (product.cost_price && product.price) {
        const currentPrice = product.price;
        
        // Calculate new price based on new settings
        let newPrice = product.cost_price;
        
        if (newSettings.platform_fee_type === 'percentage') {
          newPrice += (product.cost_price * (newSettings.platform_fee_value || 0) / 100);
        } else {
          newPrice += (newSettings.platform_fee_value || 0);
        }
        
        newPrice += (product.cost_price * (newSettings.gateway_fee_percentage || 0) / 100);
        
        const changePercent = ((newPrice - currentPrice) / currentPrice) * 100;
        totalChange += changePercent;
        validProducts++;
      }
    });

    return {
      affected_products: validProducts,
      average_change: validProducts > 0 ? totalChange / validProducts : 0
    };
  };

  const addAdditionalCost = useMutation({
    mutationFn: async (cost: Omit<AdditionalCost, 'id' | 'created_at'>) => {
      const newCost: AdditionalCost = {
        ...cost,
        id: crypto.randomUUID(),
        created_at: new Date().toISOString(),
      };

      const currentCosts = settings?.additional_costs || [];
      const updatedCosts = [...currentCosts, newCost];

      const { data, error } = await supabase
        .from('platform_settings')
        .update({ additional_costs: updatedCosts as any })
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: "Custo adicionado com sucesso!" });
    },
    onError: (error) => {
      console.error('Error adding cost:', error);
      toast({
        title: "Erro ao adicionar custo",
        description: "Não foi possível adicionar o custo. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const updateAdditionalCost = useMutation({
    mutationFn: async ({ costId, updates }: { costId: string, updates: Partial<AdditionalCost> }) => {
      const currentCosts = settings?.additional_costs || [];
      const updatedCosts = currentCosts.map((cost: AdditionalCost) =>
        cost.id === costId ? { ...cost, ...updates } : cost
      );

      const { data, error } = await supabase
        .from('platform_settings')
        .update({ additional_costs: updatedCosts as any })
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: "Custo atualizado com sucesso!" });
    },
    onError: (error) => {
      console.error('Error updating cost:', error);
      toast({
        title: "Erro ao atualizar custo",
        description: "Não foi possível atualizar o custo. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const deleteAdditionalCost = useMutation({
    mutationFn: async (costId: string) => {
      const currentCosts = settings?.additional_costs || [];
      const updatedCosts = currentCosts.filter((cost: AdditionalCost) => cost.id !== costId);

      const { data, error } = await supabase
        .from('platform_settings')
        .update({ additional_costs: updatedCosts as any })
        .eq('id', settings?.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platform-settings'] });
      toast({ title: "Custo removido com sucesso!" });
    },
    onError: (error) => {
      console.error('Error deleting cost:', error);
      toast({
        title: "Erro ao remover custo",
        description: "Não foi possível remover o custo. Tente novamente.",
        variant: "destructive",
      });
    }
  });

  const recalculateAllPrices = useMutation({
    mutationFn: async () => {
      if (!settings) {
        throw new Error('Configurações não carregadas');
      }

      console.log('Triggering price recalculation for all products...');
      
      const { data, error } = await supabase.functions.invoke('recalculate-product-prices', {
        body: { 
          platform_fee_value: settings.platform_fee_value,
          platform_fee_type: settings.platform_fee_type,
          gateway_fee_percentage: settings.gateway_fee_percentage,
        }
      });

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      console.log('Recalculation response:', data);
      toast({
        title: "✅ Recálculo Iniciado",
        description: `${data.products_to_update} produtos serão atualizados. Estimativa: ${data.estimated_completion}`,
      });
    },
    onError: (error) => {
      console.error('Error recalculating prices:', error);
      toast({
        title: "❌ Erro ao Recalcular",
        description: "Não foi possível iniciar o recálculo de preços.",
        variant: "destructive",
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings: updateSettings.mutate,
    isUpdating: updateSettings.isPending,
    calculatePriceImpact,
    addAdditionalCost: addAdditionalCost.mutate,
    updateAdditionalCost: updateAdditionalCost.mutate,
    deleteAdditionalCost: deleteAdditionalCost.mutate,
    recalculateAllPrices: recalculateAllPrices.mutate,
    isRecalculating: recalculateAllPrices.isPending,
  };
};