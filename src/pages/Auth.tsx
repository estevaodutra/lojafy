import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { Loader2, Mail, Lock, User, RefreshCw } from 'lucide-react';
import lojafyLogo from '@/assets/lojafy-logo-new.png';
const Auth = () => {
  const {
    user,
    loading,
    signIn,
    signUp,
    resetPassword,
    resendConfirmationEmail
  } = useAuth();
  
  // Use the auth redirect hook
  useAuthRedirect();
  const [isLoading, setIsLoading] = useState(false);
  const [showEmailVerificationDialog, setShowEmailVerificationDialog] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [showEmailNotConfirmedDialog, setShowEmailNotConfirmedDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [unconfirmedEmail, setUnconfirmedEmail] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');

  // Show loading while checking authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signIn(loginEmail, loginPassword);
    
    // Check if login failed due to unconfirmed email
    if (result.error && result.error.needsEmailConfirmation) {
      setUnconfirmedEmail(loginEmail);
      setShowEmailNotConfirmedDialog(true);
    } else if (!result.error) {
      // Check for return URL after successful login
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
        return;
      }
    }
    
    setIsLoading(false);
  };
  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signUp(signupEmail, signupPassword, firstName, lastName);
    if (!result.error) {
      setShowEmailVerificationDialog(true);
    } else if (result.error.friendlyMessage && result.error.friendlyMessage.includes('já está cadastrado')) {
      // If user already exists, switch to login tab and pre-fill email
      setLoginEmail(signupEmail);
      setActiveTab('login');
    }
    setIsLoading(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await resetPassword(resetEmail);
    if (!result.error) {
      setShowResetPasswordDialog(false);
      setResetEmail('');
    }
    setIsLoading(false);
  };

  const handleResendConfirmation = async () => {
    setIsLoading(true);
    const result = await resendConfirmationEmail(unconfirmedEmail);
    if (!result.error) {
      setShowEmailNotConfirmedDialog(false);
      setShowEmailVerificationDialog(true);
    }
    setIsLoading(false);
  };
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>;
  }
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src={lojafyLogo}
              alt="Lojafy - Sua Loja Descomplicada"
              className="w-48 h-20 object-contain"
            />
          </div>
          <p className="text-muted-foreground">Sua Loja Descomplicada</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Acessar sua conta</CardTitle>
            <CardDescription>
              Entre ou crie uma conta para continuar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Entrar</TabsTrigger>
                <TabsTrigger value="signup">Cadastrar</TabsTrigger>
              </TabsList>
              
              <TabsContent value="login" className="space-y-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-email" type="email" placeholder="seu@email.com" value={loginEmail} onChange={e => setLoginEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="login-password" type="password" placeholder="••••••••" value={loginPassword} onChange={e => setLoginPassword(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <Dialog open={showResetPasswordDialog} onOpenChange={setShowResetPasswordDialog}>
                      <DialogTrigger asChild>
                        <Button variant="link" className="p-0 h-auto text-sm text-muted-foreground hover:text-primary">
                          Esqueci minha senha
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="sm:max-w-[425px]">
                        <DialogHeader>
                          <DialogTitle>Recuperar senha</DialogTitle>
                          <DialogDescription>
                            Digite seu email para receber instruções de recuperação de senha.
                          </DialogDescription>
                        </DialogHeader>
                        <form onSubmit={handleResetPassword} className="space-y-4">
                          <div className="space-y-2">
                            <Label htmlFor="reset-email">Email</Label>
                            <div className="relative">
                              <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                              <Input
                                id="reset-email"
                                type="email"
                                placeholder="seu@email.com"
                                value={resetEmail}
                                onChange={(e) => setResetEmail(e.target.value)}
                                className="pl-10"
                                required
                              />
                            </div>
                          </div>
                          <DialogFooter>
                            <Button type="button" variant="outline" onClick={() => setShowResetPasswordDialog(false)}>
                              Cancelar
                            </Button>
                            <Button type="submit" disabled={isLoading}>
                              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                              Enviar
                            </Button>
                          </DialogFooter>
                        </form>
                      </DialogContent>
                    </Dialog>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Entrar
                  </Button>
                </form>
              </TabsContent>
              
              <TabsContent value="signup" className="space-y-4">
                <form onSubmit={handleSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">Nome</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                        <Input id="firstName" type="text" placeholder="João" value={firstName} onChange={e => setFirstName(e.target.value)} className="pl-10" required />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input id="lastName" type="text" placeholder="Silva" value={lastName} onChange={e => setLastName(e.target.value)} required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-email" type="email" placeholder="seu@email.com" value={signupEmail} onChange={e => setSignupEmail(e.target.value)} className="pl-10" required />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input id="signup-password" type="password" placeholder="••••••••" value={signupPassword} onChange={e => setSignupPassword(e.target.value)} className="pl-10" minLength={6} required />
                    </div>
                  </div>
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Criar conta
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <AlertDialog open={showEmailVerificationDialog} onOpenChange={setShowEmailVerificationDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Verifique seu email</AlertDialogTitle>
            <AlertDialogDescription>
              Enviamos um email de confirmação para você. Por favor, verifique sua caixa de entrada e clique no link para confirmar sua conta.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogAction onClick={() => setShowEmailVerificationDialog(false)}>
              Ok, vou verificar o e-mail
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={showEmailNotConfirmedDialog} onOpenChange={setShowEmailNotConfirmedDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Email não confirmado</AlertDialogTitle>
            <AlertDialogDescription>
              Você precisa confirmar seu email antes de fazer login. Verifique sua caixa de entrada ou clique no botão abaixo para reenviar o email de confirmação.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowEmailNotConfirmedDialog(false)}>
              Fechar
            </Button>
            <Button onClick={handleResendConfirmation} disabled={isLoading}>
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              <RefreshCw className="mr-2 h-4 w-4" />
              Reenviar confirmação
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};
export default Auth;