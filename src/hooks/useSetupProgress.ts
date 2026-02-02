import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface SetupStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  actionUrl: string;
  actionLabel: string;
}

export const useSetupProgress = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["setup-progress", user?.id],
    queryFn: async (): Promise<{ steps: SetupStep[]; progress: number }> => {
      if (!user?.id) {
        return { steps: [], progress: 0 };
      }

      // Check store configuration
      const { data: store } = await supabase
        .from("reseller_stores")
        .select("store_name, store_slug, primary_color, logo_url, whatsapp, contact_email, benefits_config, reseller_id")
        .eq("reseller_id", user.id)
        .single();

      // Check products
      const { data: products } = await supabase
        .from("reseller_products")
        .select("id, active, reseller_id")
        .eq("reseller_id", user.id);

      const activeProducts = products?.filter((p) => p.active) || [];

      // Check benefits (store has benefits_config)
      const hasBenefits = store?.benefits_config != null && 
        typeof store.benefits_config === 'object' && 
        !Array.isArray(store.benefits_config) === false &&
        (store.benefits_config as unknown[]).length > 0;

      const steps: SetupStep[] = [
        {
          id: "store-name",
          title: "Criar nome da loja",
          description: "Defina o nome e URL da sua loja",
          completed: !!store?.store_name && !!store?.store_slug,
          actionUrl: "/reseller/loja",
          actionLabel: "Configurar",
        },
        {
          id: "store-design",
          title: "Personalizar visual",
          description: "Escolha cores e adicione logo",
          completed: !!store?.primary_color || !!store?.logo_url,
          actionUrl: "/reseller/loja",
          actionLabel: "Personalizar",
        },
        {
          id: "contact-info",
          title: "Adicionar contatos",
          description: "WhatsApp, email e telefone",
          completed: !!store?.whatsapp || !!store?.contact_email,
          actionUrl: "/reseller/loja",
          actionLabel: "Adicionar",
        },
        {
          id: "add-products",
          title: "Importar produtos",
          description: "Adicione pelo menos 3 produtos",
          completed: (products?.length || 0) >= 3,
          actionUrl: "/reseller/catalogo",
          actionLabel: "Importar",
        },
        {
          id: "activate-products",
          title: "Ativar produtos",
          description: "Ative produtos para venda",
          completed: activeProducts.length >= 1,
          actionUrl: "/reseller/produtos",
          actionLabel: "Ativar",
        },
        {
          id: "add-benefits",
          title: "Adicionar vantagens",
          description: "Mostre os benefícios da sua loja",
          completed: hasBenefits,
          actionUrl: "/reseller/vantagens",
          actionLabel: "Configurar",
        },
      ];

      const completedSteps = steps.filter((s) => s.completed).length;
      const progress = Math.round((completedSteps / steps.length) * 100);

      return { steps, progress };
    },
    enabled: !!user?.id,
  });
};
