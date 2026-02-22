import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface ImpersonationData {
  originalUserId: string;
  originalRole: string;
  targetUserId: string;
  targetRole: string;
  targetUserName?: string;
  targetProfile?: any;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  profile: any | null;
  impersonationData: ImpersonationData | null;
  setImpersonationData: (data: ImpersonationData | null) => void;
  getEffectiveUserId: () => string | null;
  getEffectiveProfile: () => any;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any | null>(null);
  const [impersonationData, setImpersonationData] = useState<ImpersonationData | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('🚀 Auth state change:', event, session?.user?.id);
        setSession(session);
        setUser(session?.user ?? null);
        
        // Send auth events to N8N for specific events (no setTimeout needed)
        if (session?.user?.email) {
          switch (event) {
            case 'SIGNED_IN':
              sendAuthEvent('token_refresh_login', session.user.email!, session.user.id);
              break;
            case 'TOKEN_REFRESHED':
              sendAuthEvent('token_refreshed', session.user.email!, session.user.id);
              break;
            case 'SIGNED_OUT':
              sendAuthEvent('logout', session.user.email!, session.user.id);
              break;
          }
        }
        
        // Fetch profile when user logs in (defer to avoid deadlock)
        // IMPORTANT: Only set loading=false AFTER profile is loaded
        if (session?.user) {
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            setProfile(profileData);
            setLoading(false);
          }, 0);
        } else {
          setProfile(null);
          setLoading(false);
        }
      }
    );

    // THEN check for existing session - load profile before setting loading=false
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      
      if (session?.user) {
        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', session.user.id)
          .single();
        
        setProfile(profileData);
      }
      
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const sendAuthEvent = async (event_type: string, email: string, user_id?: string, status: 'success' | 'error' = 'success', metadata?: Record<string, any>) => {
    try {
      await supabase.functions.invoke('webhook-auth-events', {
        body: {
          event_type,
          email,
          user_id,
          status,
          metadata
        }
      });
    } catch (error) {
      console.error('Failed to send auth event:', error);
    }
  };


  const signUp = async (email: string, password: string, firstName?: string, lastName?: string, phone?: string) => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      
      const { error, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            first_name: firstName,
            last_name: lastName,
            phone: phone || '',
          }
        }
      });
      
      if (error) {
        // Send error event to N8N
        await sendAuthEvent('signup', email, undefined, 'error', { error: error.message });
        
        // Translate common error messages to Portuguese
        let errorMessage = error.message;
        if (error.message.includes('User already registered')) {
          errorMessage = 'Este email já está cadastrado. Tente fazer login ou use outro email.';
        } else if (error.message.includes('Password should be at least')) {
          errorMessage = 'A senha deve ter pelo menos 6 caracteres.';
        } else if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.';
        }
        
        toast({
          variant: "destructive",
          title: "Erro no cadastro",
          description: errorMessage,
        });
        return { error: { ...error, friendlyMessage: errorMessage } };
      }

      // Send successful signup event to N8N
      await sendAuthEvent('signup', email, data.user?.id, 'success', { 
        first_name: firstName, 
        last_name: lastName 
      });

      // Note: The toast will be replaced by a modal in the Auth component
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { error, data } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      
      if (error) {
        // Send error event to N8N
        await sendAuthEvent('login', email, undefined, 'error', { error: error.message });
        
        // Translate common error messages to Portuguese
        let errorMessage = error.message;
        if (error.message.includes('Invalid login credentials')) {
          errorMessage = 'Email ou senha incorretos. Verifique suas credenciais.';
        } else if (error.message.includes('Email not confirmed')) {
          errorMessage = 'Email não confirmado. Verifique sua caixa de entrada e confirme seu email antes de fazer login.';
        } else if (error.message.includes('Too many requests')) {
          errorMessage = 'Muitas tentativas de login. Tente novamente em alguns minutos.';
        }
        
        toast({
          variant: "destructive",
          title: "Erro no login",
          description: errorMessage,
        });
        return { error: { ...error, friendlyMessage: errorMessage, needsEmailConfirmation: error.message.includes('Email not confirmed') } };
      }

      // Send successful login event to N8N
      await sendAuthEvent('login', email, data.user?.id, 'success');

      toast({
        title: "Login realizado!",
        description: "Bem-vindo de volta!",
      });
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const resetPassword = async (email: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('reset-password-proxy', {
        body: { email },
      });

      if (error) {
        toast({
          variant: "destructive",
          title: "Erro ao recuperar senha",
          description: "Não foi possível processar sua solicitação. Tente novamente.",
        });
        return { error };
      }

      // Check webhook response for errors
      if (data?.error) {
        const errorMessage = data.error || 'Erro ao processar solicitação.';
        toast({
          variant: "destructive",
          title: "Erro ao recuperar senha",
          description: errorMessage,
        });
        return { error: { message: errorMessage } };
      }

      toast({
        title: "Solicitação enviada!",
        description: data?.message || "Se o email estiver cadastrado, você receberá um link para redefinir sua senha.",
      });
      
      return { error: null };
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Erro ao recuperar senha",
        description: "Ocorreu um erro inesperado. Tente novamente.",
      });
      return { error };
    }
  };

  const resendConfirmationEmail = async (email: string) => {
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: email,
        options: {
          emailRedirectTo: `${window.location.origin}/`
        }
      });
      
      if (error) {
        let errorMessage = error.message;
        if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.';
        } else if (error.message.includes('Email rate limit exceeded')) {
          errorMessage = 'Limite de emails excedido. Aguarde alguns minutos antes de tentar novamente.';
        }
        
        toast({
          variant: "destructive",
          title: "Erro ao reenviar confirmação",
          description: errorMessage,
        });
        return { error: { ...error, friendlyMessage: errorMessage } };
      }

      toast({
        title: "Email reenviado!",
        description: "Verifique sua caixa de entrada para confirmar seu email.",
      });
      
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Evitar cliques múltiplos
      if ((signOut as any)._running) return;
      (signOut as any)._running = true;

      // Limpa impersonation local
      sessionStorage.removeItem('impersonation_data');
      setImpersonationData(null);

      let globalError: any = null;
      try {
        const { error } = await supabase.auth.signOut(); // global (revoga no servidor)
        if (error) globalError = error;
      } catch (err) {
        globalError = err;
      }

      if (globalError) {
        console.error('Global signOut failed, applying local fallback:', globalError);

        // Tenta logout local (não usa rede)
        try {
          await supabase.auth.signOut({ scope: 'local' } as any);
        } catch (e) {
          console.warn('Local signOut fallback failed, purging storage keys:', e);
        }

        // Purga as chaves do Supabase para garantir remoção do token
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            if (key.startsWith('sb-') || key.includes('bbrmjrjorcgsgeztzbsr')) {
              localStorage.removeItem(key);
            }
          }
        } catch (e) {
          console.warn('Failed to purge localStorage keys:', e);
        }
      }

      // Zera estados locais
      setUser(null);
      setSession(null);
      setProfile(null);

      toast({ title: 'Logout realizado', description: 'Até logo!' });

      setTimeout(() => {
        (signOut as any)._running = false;
        window.location.href = '/';
      }, 700);
    } catch (error) {
      (signOut as any)._running = false;
      console.error('Error signing out (unexpected):', error);
      toast({
        variant: 'destructive',
        title: 'Erro ao sair',
        description: 'Ocorreu um erro inesperado. Limpamos sua sessão local.',
      });
      // Última linha de defesa: limpar tudo e recarregar
      try {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (!key) continue;
          if (key.startsWith('sb-') || key.includes('bbrmjrjorcgsgeztzbsr')) {
            localStorage.removeItem(key);
          }
        }
      } catch {}
      sessionStorage.removeItem('impersonation_data');
      setTimeout(() => (window.location.href = '/'), 400);
    }
  };

  // Functions to get effective user data (considering impersonation)
  const getEffectiveUserId = (): string | null => {
    return impersonationData?.targetUserId || user?.id || null;
  };

  const getEffectiveProfile = () => {
    return impersonationData?.targetProfile || profile;
  };

  // Initialize impersonation data from sessionStorage on mount
  useEffect(() => {
    const storedData = sessionStorage.getItem('impersonation_data');
    if (storedData) {
      try {
        const data = JSON.parse(storedData) as ImpersonationData;
        setImpersonationData(data);
      } catch (error) {
        console.error('Error parsing impersonation data:', error);
        sessionStorage.removeItem('impersonation_data');
      }
    }
  }, []);

  const isAdmin = profile?.role === 'admin' || profile?.role === 'super_admin';

  const value: AuthContextType = {
    user,
    session,
    loading,
    signUp,
    signIn,
    signOut,
    resetPassword,
    resendConfirmationEmail,
    isAdmin,
    profile,
    impersonationData,
    setImpersonationData,
    getEffectiveUserId,
    getEffectiveProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};