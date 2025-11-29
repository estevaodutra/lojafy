import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

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

const STORAGE_KEY = 'reseller-onboarding-progress';

export const useResellerOnboarding = () => {
  const { user } = useAuth();
  const [steps, setSteps] = useState<OnboardingStep[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user) return;

    const loadProgress = async () => {
      try {
        // Carregar do localStorage
        const localData = localStorage.getItem(STORAGE_KEY);
        let completedSteps: string[] = localData ? JSON.parse(localData) : [];

        // Verificações automáticas de progresso
        const { data: storeConfig } = await supabase
          .from('reseller_stores')
          .select('id')
          .eq('reseller_id', user.id)
          .maybeSingle();

        if (storeConfig && !completedSteps.includes('store-config')) {
          completedSteps.push('store-config');
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
        setLoading(false);
      }
    };

    loadProgress();
  }, [user]);

  const markStepCompleted = async (stepId: string) => {
    if (!user) return;

    const newSteps = steps.map(step =>
      step.id === stepId ? { ...step, completed: true } : step
    );
    setSteps(newSteps);

    const completedSteps = newSteps.filter(s => s.completed).map(s => s.id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(completedSteps));

    // Fechar se 100% completo
    const progress = (completedSteps.length / ONBOARDING_STEPS.length) * 100;
    if (progress === 100) {
      setIsOpen(false);
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
