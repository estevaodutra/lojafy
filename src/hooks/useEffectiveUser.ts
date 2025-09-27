import { useAuth } from '@/contexts/AuthContext';

export const useEffectiveUser = () => {
  const { 
    user, 
    profile, 
    impersonationData, 
    getEffectiveUserId, 
    getEffectiveProfile 
  } = useAuth();
  
  const effectiveUserId = getEffectiveUserId();
  const effectiveProfile = getEffectiveProfile();
  
  return {
    user,
    profile,
    effectiveUserId,
    effectiveProfile,
    isImpersonating: !!impersonationData,
    impersonationData,
    originalUser: user,
    originalProfile: profile
  };
};