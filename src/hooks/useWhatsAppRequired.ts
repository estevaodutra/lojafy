import { useAuth } from '@/contexts/AuthContext';
import { cleanPhone } from '@/lib/phone';

export const useWhatsAppRequired = () => {
  const { user, profile, loading } = useAuth();

  // Usuário não logado ou carregando = não mostra modal
  if (loading || !user || !profile) {
    return { requiresWhatsApp: false, userId: null };
  }

  // Verificar se tem telefone válido cadastrado
  const phone = profile.phone ? cleanPhone(profile.phone) : '';
  const requiresWhatsApp = phone.length < 10;

  return { 
    requiresWhatsApp, 
    userId: user.id 
  };
};
