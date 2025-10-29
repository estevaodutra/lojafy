import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export const useSubscriptionCheck = () => {
  const { profile } = useAuth();
  const { toast } = useToast();
  
  const isPremium = profile?.subscription_plan === 'premium';
  const isFree = profile?.subscription_plan === 'free' || !profile?.subscription_plan;
  const isExpired = profile?.subscription_expires_at 
    ? new Date(profile.subscription_expires_at) < new Date() 
    : false;

  const paymentUrl = profile?.subscription_payment_url || 'https://kwfy.app/c/Qeuh5bFm';
  
  const requiresPremium = (action: string): boolean => {
    if (isExpired || !isPremium) {
      toast({
        title: 'Recurso Premium Necessário',
        description: 'A ação "' + action + '" requer plano Premium.',
      });
      return false;
    }
    return true;
  };
  
  return {
    isPremium: isPremium && !isExpired,
    isFree,
    isExpired,
    requiresPremium,
    expiresAt: profile?.subscription_expires_at,
    paymentUrl,
  };
};
