import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  completed: boolean;
  url: string;
  order: number;
}

const ONBOARDING_STEPS: Omit<OnboardingStep, 'completed'>[] = [
  {
    id: 'store-config',
    title: 'Configure sua Loja',
    description: 'Personalize logo, cores e URL da sua loja',
    url: '/reseller/loja',
    order: 1
  },
  {
    id: 'add-products',
    title: 'Adicione Produtos',
    description: 'Importe produtos e configure suas margens',
    url: '/reseller/produtos',
    order: 2
  },
  {
    id: 'payment-setup',
    title: 'Configure Pagamento',
    description: 'Entenda comissões e sistema de saques',
    url: '/reseller/financeiro',
    order: 3
  },
  {
    id: 'share-link',
    title: 'Compartilhe sua Loja',
    description: 'Copie o link da sua loja pública',
    url: '/reseller/loja#share',
    order: 4
  },
  {
    id: 'academy',
    title: 'Conheça a Academia',
    description: 'Aprenda estratégias de vendas',
    url: '/minha-conta/academy',
    order: 5
  },
  {
    id: 'first-sale',
    title: 'Faça sua Primeira Venda',
    description: 'Acompanhe seus primeiros resultados',
    url: '/reseller/vendas',
    order: 6
  }
];

export const useResellerOnboarding = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProgress = async () => {
      try {
        // Carregar progresso do banco de dados
        const { data: savedProgress } = await supabase
          .from('reseller_onboarding_progress')
          .select('step_id')
          .eq('user_id', user.id);

        let completedSteps: string[] = savedProgress?.map(p => p.step_id) || [];

        // Verificações automáticas de progresso
        const [storeConfig, products, sales] = await Promise.all([
          supabase
            .from('reseller_stores')
            .select('id')
            .eq('reseller_id', user.id)
            .maybeSingle(),
          supabase
            .from('reseller_products')
            .select('id')
            .eq('reseller_id', user.id)
            .limit(1)
            .maybeSingle(),
          supabase
            .from('orders')
            .select('id')
            .eq('user_id', user.id)
            .in('status', ['confirmed', 'processing', 'shipped', 'delivered'])
            .limit(1)
            .maybeSingle()
        ]);

        // Auto-completar steps baseado em dados reais
        const autoCompleteSteps = [];
        
        if (storeConfig.data && !completedSteps.includes('store-config')) {
          autoCompleteSteps.push('store-config');
        }
        
        if (products.data && !completedSteps.includes('add-products')) {
          autoCompleteSteps.push('add-products');
        }
        
        if (sales.data && !completedSteps.includes('first-sale')) {
          autoCompleteSteps.push('first-sale');
        }

        // Salvar auto-completados no banco
        if (autoCompleteSteps.length > 0) {
          await Promise.all(
            autoCompleteSteps.map(stepId =>
              supabase
                .from('reseller_onboarding_progress')
                .upsert({ user_id: user.id, step_id: stepId }, { onConflict: 'user_id,step_id' })
            )
          );
          completedSteps = [...new Set([...completedSteps, ...autoCompleteSteps])];
        }

        // Montar steps com progresso
        const stepsWithProgress = ONBOARDING_STEPS.map(step => ({
          ...step,
          completed: completedSteps.includes(step.id)
        }));

        setSteps(stepsWithProgress);

        // Mostrar wizard se progresso < 100%
        const progress = (completedSteps.length / ONBOARDING_STEPS.length) * 100;
        if (progress < 100) {
          setIsOpen(true);
        }

        setLoading(false);
      } catch (error) {
        console.error('Error loading onboarding progress:', error);
        toast.error('Erro ao carregar progresso do onboarding');
        setLoading(false);
      }
    };

    loadProgress();
  }, [user]);

  const markStepCompleted = async (stepId: string) => {
    if (!user) return;

    try {
      // Salvar no banco de dados
      await supabase
        .from('reseller_onboarding_progress')
        .upsert({ user_id: user.id, step_id: stepId }, { onConflict: 'user_id,step_id' });

      // Atualizar estado local
      const newSteps = steps.map(step =>
        step.id === stepId ? { ...step, completed: true } : step
      );
      setSteps(newSteps);

      const completedSteps = newSteps.filter(s => s.completed).map(s => s.id);

      // Fechar se 100% completo
      const progress = (completedSteps.length / ONBOARDING_STEPS.length) * 100;
      if (progress === 100) {
        setIsOpen(false);
        toast.success('🎉 Parabéns! Você concluiu o onboarding!');
      }
    } catch (error) {
      console.error('Error marking step as completed:', error);
      toast.error('Erro ao salvar progresso');
    }
  };

  const progress = (steps.filter(s => s.completed).length / steps.length) * 100;

  return {
    steps,
    progress,
    isOpen,
    setIsOpen,
    loading,
    markStepCompleted
  };
};
