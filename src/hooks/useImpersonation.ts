import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from './useUserRole';
import { useToast } from '@/hooks/use-toast';

interface ImpersonationData {
  originalUserId: string;
  originalRole: UserRole;
  targetUserId: string;
  targetRole: UserRole;
  targetUserName?: string;
}

export const useImpersonation = () => {
  const [isImpersonating, setIsImpersonating] = useState(false);
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { toast } = useToast();

  // Check if currently impersonating on mount
  const checkImpersonationStatus = useCallback(() => {
    const storedData = sessionStorage.getItem('impersonation_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as ImpersonationData;
        setIsImpersonating(true);
        setImpersonationData(data);
      } catch (error) {
        console.error('Error parsing impersonation data:', error);
        sessionStorage.removeItem('impersonation_data');
      }
    }
  }, []);

  // Get redirect path based on user role
  const getRedirectPathByRole = (role: UserRole): string => {
    switch (role) {
      case 'super_admin':
        return '/super-admin';
      case 'admin':
        return '/admin';
      case 'supplier':
        return '/supplier';
      case 'reseller':
        return '/reseller';
      case 'customer':
        return '/minha-conta';
      default:
        return '/';
    }
  };

  // Start impersonation
  const impersonateUser = useCallback(async (
    targetUserId: string, 
    targetRole: UserRole,
    targetUserName?: string
  ) => {
    try {
      // Get current user data
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        throw new Error('Unable to get current user');
      }

      // Get current user profile
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('user_id', user.id)
        .single();

      if (profileError || !profile) {
        throw new Error('Unable to get current user profile');
      }

      // Security check: only super_admin can impersonate
      if (profile.role !== 'super_admin') {
        throw new Error('Only super admins can impersonate other users');
      }

      // Security check: cannot impersonate another super_admin
      if (targetRole === 'super_admin') {
        throw new Error('Cannot impersonate another super admin');
      }

      // Store impersonation data
      const impersonationInfo: ImpersonationData = {
        originalUserId: user.id,
        originalRole: profile.role as UserRole,
        targetUserId,
        targetRole,
        targetUserName
      };

      sessionStorage.setItem('impersonation_data', JSON.stringify(impersonationInfo));
      setIsImpersonating(true);
      setImpersonationData(impersonationInfo);

      // Redirect to appropriate dashboard
      const redirectPath = getRedirectPathByRole(targetRole);
      navigate(redirectPath);

      toast({
        title: "Impersonação iniciada",
        description: `Agora você está visualizando como ${targetUserName || 'usuário'}`,
      });

    } catch (error) {
      console.error('Impersonation error:', error);
      toast({
        title: "Erro na impersonação",
        description: error instanceof Error ? error.message : 'Erro desconhecido',
        variant: "destructive",
      });
    }
  }, [navigate, toast]);

  // Stop impersonation
  const stopImpersonation = useCallback(() => {
    sessionStorage.removeItem('impersonation_data');
    setIsImpersonating(false);
    setImpersonationData(null);
    
    // Redirect back to super admin panel
    navigate('/super-admin');
    
    toast({
      title: "Impersonação finalizada",
      description: "Você voltou ao painel de super admin",
    });
  }, [navigate, toast]);

  // Initialize impersonation check
  React.useEffect(() => {
    checkImpersonationStatus();
  }, [checkImpersonationStatus]);

  return {
    isImpersonating,
    impersonationData,
    impersonateUser,
    stopImpersonation,
    getRedirectPathByRole
  };
};