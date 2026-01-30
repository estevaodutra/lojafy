import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, AlertCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

type Status = 'loading' | 'success' | 'error';

const AuthOneTime = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<Status>('loading');
  const [message, setMessage] = useState('Verificando link de acesso...');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const verifyAndLogin = async () => {
      const token = searchParams.get('token');

      if (!token) {
        setStatus('error');
        setErrorMessage('Link de acesso inválido. Token não encontrado.');
        return;
      }

      try {
        setMessage('Validando token de acesso...');

        // Call edge function to verify token
        const { data, error } = await supabase.functions.invoke('verify-onetime-link', {
          body: { token },
        });

        if (error || !data?.success) {
          console.error('Verification error:', error, data);
          setStatus('error');
          setErrorMessage(data?.error || error?.message || 'Erro ao validar o link de acesso.');
          return;
        }

        setMessage('Autenticando...');

        // Use the email OTP to sign in
        if (data.email_otp && data.hashed_token) {
          const { error: signInError } = await supabase.auth.verifyOtp({
            token_hash: data.hashed_token,
            type: 'email',
          });

          if (signInError) {
            // Try alternative approach - redirect to magic link
            if (data.magic_link) {
              window.location.href = data.magic_link;
              return;
            }
            
            console.error('Sign in error:', signInError);
            setStatus('error');
            setErrorMessage('Erro ao realizar login automático.');
            return;
          }
        } else if (data.magic_link) {
          // Redirect to magic link
          window.location.href = data.magic_link;
          return;
        }

        setStatus('success');
        setMessage('Login realizado com sucesso! Redirecionando...');

        // Redirect to onboarding
        setTimeout(() => {
          navigate(data.redirect_url || '/reseller/onboarding');
        }, 1500);

      } catch (err) {
        console.error('Unexpected error:', err);
        setStatus('error');
        setErrorMessage('Ocorreu um erro inesperado. Tente novamente.');
      }
    };

    verifyAndLogin();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="flex items-center justify-center gap-2">
            {status === 'loading' && (
              <>
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                Acessando...
              </>
            )}
            {status === 'success' && (
              <>
                <CheckCircle className="h-6 w-6 text-green-500" />
                Sucesso!
              </>
            )}
            {status === 'error' && (
              <>
                <AlertCircle className="h-6 w-6 text-destructive" />
                Erro
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          {status === 'loading' && (
            <p className="text-muted-foreground">{message}</p>
          )}
          
          {status === 'success' && (
            <p className="text-muted-foreground">{message}</p>
          )}
          
          {status === 'error' && (
            <div className="space-y-4">
              <p className="text-muted-foreground">{errorMessage}</p>
              <div className="flex flex-col gap-2">
                <Button onClick={() => navigate('/auth')} variant="default">
                  Fazer login manualmente
                </Button>
                <Button onClick={() => navigate('/')} variant="outline">
                  Voltar para o início
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthOneTime;
