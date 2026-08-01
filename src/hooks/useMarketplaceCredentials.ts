import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface MarketplaceCredentials {
  id: string;
  marketplace: string;
  client_id: string | null;
  client_secret: string | null;
  app_url: string | null;
  created_at: string | null;
  updated_at: string | null;
}

export interface UpdateMarketplaceCredentialsParams {
  client_id?: string | null;
  client_secret?: string | null;
  app_url?: string | null;
}

export const useMarketplaceCredentials = (marketplace: string = "mercadolivre") => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: credentials, isLoading } = useQuery({
    queryKey: ["marketplace-credentials", marketplace],
    queryFn: async (): Promise<MarketplaceCredentials | null> => {
      const { data, error } = await supabase
        .from("marketplace_credentials")
        .select("*")
        .eq("marketplace", marketplace)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching marketplace credentials for ${marketplace}:`, error);
        throw error;
      }

      return data as MarketplaceCredentials | null;
    },
  });

  const updateCredentials = useMutation({
    mutationFn: async (params: UpdateMarketplaceCredentialsParams) => {
      // Clean undefined values
      const filteredUpdateData = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined)
      );

      const { data, error } = await supabase
        .from("marketplace_credentials")
        .update(filteredUpdateData)
        .eq("marketplace", marketplace)
        .select()
        .single();

      if (error) {
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["marketplace-credentials", marketplace] });
      toast({
        title: "Configurações salvas",
        description: `As credenciais do ${marketplace === "mercadolivre" ? "Mercado Livre" : marketplace} foram atualizadas com sucesso.`,
      });
    },
    onError: (error) => {
      console.error(`Error updating marketplace credentials for ${marketplace}:`, error);
      toast({
        title: "Erro ao salvar",
        description: "Não foi possível atualizar as configurações. Verifique os dados e tente novamente.",
        variant: "destructive",
      });
    },
  });

  return {
    credentials,
    isLoading,
    updateCredentials: updateCredentials.mutate,
    isUpdating: updateCredentials.isPending,
  };
};
