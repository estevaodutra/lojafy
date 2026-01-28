import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useAuth } from '@/contexts/AuthContext';
import { useAuthRedirect } from '@/hooks/useAuthRedirect';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone } from 'lucide-react';
import { formatPhone } from '@/lib/phone';
import lojafyLogo from '@/assets/lojafy-logo-new.png';

const Auth = () => {
  const { user, loading, signIn, signUp, resetPassword } = useAuth();
  const { toast } = useToast();
  
  useAuthRedirect();
  
  const [isLoading, setIsLoading] = useState(false);
  const [showResetPasswordDialog, setShowResetPasswordDialog] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [activeTab, setActiveTab] = useState('login');

  // Login form state
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // Signup form state
  const [signupEmail, setSignupEmail] = useState('');
  const [confirmSignupEmail, setConfirmSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [confirmSignupPassword, setConfirmSignupPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [signupPhone, setSignupPhone] = useState('');

  // Mostrar loading se autenticação está em andamento ou usuário já logado
  if (loading || user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const result = await signIn(loginEmail, loginPassword);
    
    if (!result.error) {
      const returnUrl = sessionStorage.getItem('returnUrl');
      if (returnUrl) {
        sessionStorage.removeItem('returnUrl');
        window.location.href = returnUrl;
        return;
      }
      // Login bem-sucedido sem returnUrl - manter loading ativo
      // useAuthRedirect fará o redirecionamento quando o profile carregar
      return;
    }
    
    setIsLoading(false);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se emails coincidem
    if (signupEmail !== confirmSignupEmail) {
      toast({ title: 'Os emails não coincidem', variant: 'destructive' });
      return;
    }
    
    // Validar se senhas coincidem
    if (signupPassword !== confirmSignupPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);
    const result = await signUp(signupEmail, signupPassword, firstName, lastName, signupPhone);
    
    if (result.error?.friendlyMessage?.includes('já está cadastrado')) {
      setLoginEmail(signupEmail);
      setActiveTab('login');
    }
    // Se não houver erro, useAuthRedirect cuida do redirecionamento automático
    
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

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
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
                      <Input 
                        id="login-email" 
                        type="email" 
                        placeholder="seu@email.com" 
                        value={loginEmail} 
                        onChange={e => setLoginEmail(e.target.value)} 
                        className="pl-10" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="login-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={loginPassword} 
                        onChange={e => setLoginPassword(e.target.value)} 
                        className="pl-10" 
                        required 
                      />
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
                        <Input 
                          id="firstName" 
                          type="text" 
                          placeholder="João" 
                          value={firstName} 
                          onChange={e => setFirstName(e.target.value)} 
                          className="pl-10" 
                          required 
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Sobrenome</Label>
                      <Input 
                        id="lastName" 
                        type="text" 
                        placeholder="Silva" 
                        value={lastName} 
                        onChange={e => setLastName(e.target.value)} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-phone">WhatsApp</Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-phone" 
                        type="tel" 
                        placeholder="+55 (11) 99999-9999" 
                        value={signupPhone} 
                        onChange={e => setSignupPhone(formatPhone(e.target.value))} 
                        className="pl-10" 
                        maxLength={19}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-email" 
                        type="email" 
                        placeholder="seu@email.com" 
                        value={signupEmail} 
                        onChange={e => setSignupEmail(e.target.value)} 
                        className="pl-10" 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-signup-email">Confirmar Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirm-signup-email" 
                        type="email" 
                        placeholder="Repita seu email" 
                        value={confirmSignupEmail} 
                        onChange={e => setConfirmSignupEmail(e.target.value)} 
                        className={`pl-10 ${confirmSignupEmail && signupEmail !== confirmSignupEmail ? 'border-red-500' : ''}`}
                        required 
                      />
                    </div>
                    {confirmSignupEmail && signupEmail !== confirmSignupEmail && (
                      <p className="text-sm text-red-500">Os emails não coincidem</p>
                    )}
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="signup-password">Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="signup-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={signupPassword} 
                        onChange={e => setSignupPassword(e.target.value)} 
                        className="pl-10" 
                        minLength={6} 
                        required 
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="confirm-signup-password">Confirmar Senha</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input 
                        id="confirm-signup-password" 
                        type="password" 
                        placeholder="••••••••" 
                        value={confirmSignupPassword} 
                        onChange={e => setConfirmSignupPassword(e.target.value)} 
                        className={`pl-10 ${confirmSignupPassword && signupPassword !== confirmSignupPassword ? 'border-red-500' : ''}`}
                        minLength={6} 
                        required 
                      />
                    </div>
                    {confirmSignupPassword && signupPassword !== confirmSignupPassword && (
                      <p className="text-sm text-red-500">As senhas não coincidem</p>
                    )}
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
    </div>
  );
};

export default Auth;