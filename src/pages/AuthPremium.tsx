import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, User, Phone, Crown } from 'lucide-react';
import { formatPhone, cleanPhone } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';
import lojafyLogo from '@/assets/lojafy-logo-new.png';

const AuthPremium = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Parâmetro ofuscado para validade em meses (default: 1)
  const validity = parseInt(searchParams.get('validity') || '1', 10);
  
  const [isLoading, setIsLoading] = useState(false);

  // Form state
  const [email, setEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validar se emails coincidem
    if (email !== confirmEmail) {
      toast({ title: 'Os emails não coincidem', variant: 'destructive' });
      return;
    }
    
    // Validar se senhas coincidem
    if (password !== confirmPassword) {
      toast({ title: 'As senhas não coincidem', variant: 'destructive' });
      return;
    }

    // Validar senha mínima
    if (password.length < 6) {
      toast({ title: 'A senha deve ter pelo menos 6 caracteres', variant: 'destructive' });
      return;
    }
    
    setIsLoading(true);

    // Validar nono dígito (celulares brasileiros começam com 9 após o DDD)
    const phoneNumbers = cleanPhone(phone);
    if (phoneNumbers.length === 13) { // 55 + DDD(2) + número(9)
      const firstDigitAfterDDD = phoneNumbers.charAt(4);
      if (firstDigitAfterDDD !== '9') {
        toast({ 
          title: 'Telefone inválido', 
          description: 'Celulares devem começar com 9 após o DDD.',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }
    }

    // Validação externa via webhook
    try {
      const validationResponse = await fetch(
        'https://n8n-n8n.nuwfic.easypanel.host/webhook/lojafy_data_validation',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: email,
            phone: phoneNumbers,
            first_name: firstName,
            last_name: lastName,
          }),
        }
      );
      
      const validationData = await validationResponse.json();
      const validation = Array.isArray(validationData) ? validationData[0] : validationData;
      
      if (validation.exists === false) {
        toast({ 
          title: 'WhatsApp inválido', 
          description: 'Por favor, forneça um número válido.',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }
      
      if (validation.email_valid === false) {
        toast({ 
          title: 'Email inválido', 
          description: validation.reason || 'Por favor, verifique o email informado.',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }
      
    } catch (error) {
      console.error('Erro na validação:', error);
      toast({ 
        title: 'Erro na validação', 
        description: 'Não foi possível validar seus dados. Tente novamente.',
        variant: 'destructive' 
      });
      setIsLoading(false);
      return;
    }

    // Chamar Edge Function para criar usuário premium
    try {
      const { data, error } = await supabase.functions.invoke('create-premium-reseller', {
        body: {
          email,
          password,
          first_name: firstName,
          last_name: lastName,
          phone: phoneNumbers,
          validity_months: validity
        }
      });

      if (error) {
        console.error('Erro ao criar usuário:', error);
        toast({ 
          title: 'Erro ao criar conta', 
          description: error.message || 'Tente novamente.',
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      if (data?.error) {
        toast({ 
          title: 'Erro ao criar conta', 
          description: data.error,
          variant: 'destructive' 
        });
        setIsLoading(false);
        return;
      }

      // Fazer login com as credenciais
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        toast({ 
          title: 'Conta criada!', 
          description: 'Faça login para continuar.',
        });
        navigate('/auth');
        return;
      }

      // Sucesso - redirecionar para first-access
      toast({ 
        title: 'Bem-vindo à Lojafy! 🎉', 
        description: 'Sua conta premium foi criada com sucesso.',
      });
      
      navigate('/reseller/first-access');
      
    } catch (error: any) {
      console.error('Erro:', error);
      toast({ 
        title: 'Erro inesperado', 
        description: 'Tente novamente mais tarde.',
        variant: 'destructive' 
      });
    } finally {
      setIsLoading(false);
    }
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
          <div className="flex items-center justify-center gap-2 mb-2">
            <Crown className="h-5 w-5 text-yellow-500" />
            <span className="font-semibold text-lg">Acesso Premium</span>
            <Crown className="h-5 w-5 text-yellow-500" />
          </div>
          <p className="text-muted-foreground text-sm">
            Crie sua conta e tenha acesso completo à plataforma
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Criar sua conta</CardTitle>
            <CardDescription>
              Preencha seus dados para começar
            </CardDescription>
          </CardHeader>
          <CardContent>
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
                      disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="phone">WhatsApp</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="phone" 
                    type="tel" 
                    placeholder="+55 (11) 99999-9999" 
                    value={phone} 
                    onChange={e => setPhone(formatPhone(e.target.value))} 
                    className="pl-10" 
                    maxLength={19}
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="seu@email.com" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    className="pl-10" 
                    required 
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmEmail">Confirmar Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmEmail" 
                    type="email" 
                    placeholder="Repita seu email" 
                    value={confirmEmail} 
                    onChange={e => setConfirmEmail(e.target.value)} 
                    className={`pl-10 ${confirmEmail && email !== confirmEmail ? 'border-destructive' : ''}`}
                    required 
                    disabled={isLoading}
                  />
                </div>
                {confirmEmail && email !== confirmEmail && (
                  <p className="text-sm text-destructive">Os emails não coincidem</p>
                )}
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="password">Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password" 
                    placeholder="••••••••" 
                    value={password} 
                    onChange={e => setPassword(e.target.value)} 
                    className="pl-10" 
                    minLength={6} 
                    required 
                    disabled={isLoading}
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input 
                    id="confirmPassword" 
                    type="password" 
                    placeholder="••••••••" 
                    value={confirmPassword} 
                    onChange={e => setConfirmPassword(e.target.value)} 
                    className={`pl-10 ${confirmPassword && password !== confirmPassword ? 'border-destructive' : ''}`}
                    minLength={6} 
                    required 
                    disabled={isLoading}
                  />
                </div>
                {confirmPassword && password !== confirmPassword && (
                  <p className="text-sm text-destructive">As senhas não coincidem</p>
                )}
              </div>
              
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Criar conta premium
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AuthPremium;
