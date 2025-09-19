import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useNavigate } from 'react-router-dom';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signUp: (email: string, password: string, firstName?: string, lastName?: string) => Promise<{ error: any }>;
  signIn: (email: string, password: string) => Promise<{ error: any }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: any }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: any }>;
  isAdmin: boolean;
  profile: any | null;
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
  const { toast } = useToast();

  useEffect(() => {
    // Set up auth state listener FIRST
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        
        // Send auth events to N8N for specific events
        if (session?.user?.email) {
          switch (event) {
            case 'SIGNED_IN':
              // This is handled in the signIn function for password login
              // But we also catch token refresh logins here
              setTimeout(() => sendAuthEvent('token_refresh_login', session.user.email!, session.user.id), 100);
              break;
            case 'TOKEN_REFRESHED':
              setTimeout(() => sendAuthEvent('token_refreshed', session.user.email!, session.user.id), 100);
              break;
            case 'SIGNED_OUT':
              setTimeout(() => sendAuthEvent('logout', session.user.email!, session.user.id), 100);
              break;
          }
        }
        
        // Fetch profile when user logs in
        if (session?.user) {
          setTimeout(async () => {
            const { data: profileData } = await supabase
              .from('profiles')
              .select('*')
              .eq('user_id', session.user.id)
              .single();
            
            setProfile(profileData);
            
            // Redirect based on role after profile is loaded
            if (profileData?.role && event === 'SIGNED_IN') {
              setTimeout(() => {
                redirectToPanel(profileData.role);
              }, 100);
            }
          }, 0);
        } else {
          setProfile(null);
        }
        
        setLoading(false);
      }
    );

    // THEN check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
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

  const redirectToPanel = (role: string) => {
    // Only redirect if we're currently on auth or home page
    const currentPath = window.location.pathname;
    if (currentPath === '/auth' || currentPath === '/') {
      // Use setTimeout to avoid potential navigation issues
      setTimeout(() => {
        switch (role) {
          case 'super_admin':
            window.location.replace('/super-admin');
            break;
          case 'admin':
            window.location.replace('/admin');
            break;
          case 'supplier':
            window.location.replace('/supplier');
            break;
          case 'reseller':
            window.location.replace('/reseller');
            break;
          default:
            window.location.replace('/');
            break;
        }
      }, 100);
    }
  };

  const signUp = async (email: string, password: string, firstName?: string, lastName?: string) => {
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
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        // Translate error messages to Portuguese
        let errorMessage = error.message;
        if (error.message.includes('Invalid email')) {
          errorMessage = 'Email inválido. Verifique o formato do email.';
        }
        
        toast({
          variant: "destructive",
          title: "Erro ao recuperar senha",
          description: errorMessage,
        });
        return { error: { ...error, friendlyMessage: errorMessage } };
      }

      toast({
        title: "Email enviado!",
        description: "Verifique sua caixa de entrada para redefinir sua senha.",
      });
      
      return { error: null };
    } catch (error) {
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
      await supabase.auth.signOut();
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

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