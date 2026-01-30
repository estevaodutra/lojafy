import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Lock, Eye, EyeOff, Loader2, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface SetPasswordStepProps {
  userId: string;
  onComplete: () => void;
}

export const SetPasswordStep = ({ userId, onComplete }: SetPasswordStepProps) => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const passwordsMatch = password === confirmPassword && password.length > 0;
  const passwordValid = password.length >= 6;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!passwordValid) {
      toast.error('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    if (!passwordsMatch) {
      toast.error('As senhas não coincidem');
      return;
    }

    setLoading(true);

    try {
      // Atualizar senha do usuário
      const { error: authError } = await supabase.auth.updateUser({
        password: password
      });

      if (authError) {
        throw authError;
      }

      // Marcar que senha foi definida no perfil
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_set: true })
        .eq('user_id', userId);

      if (profileError) {
        console.error('Erro ao atualizar perfil:', profileError);
      }

      toast.success('Senha definida com sucesso!');
      onComplete();
    } catch (error: any) {
      console.error('Erro ao definir senha:', error);
      toast.error(error.message || 'Erro ao definir senha');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="mx-auto w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mb-4">
          <Lock className="h-8 w-8 text-primary" />
        </div>
        <CardTitle className="text-2xl">Crie sua Senha</CardTitle>
        <CardDescription>
          Defina uma senha segura para acessar sua conta
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">Nova Senha</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Mínimo 6 caracteres"
                className="pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {password.length > 0 && !passwordValid && (
              <p className="text-sm text-destructive">A senha deve ter no mínimo 6 caracteres</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirmar Senha</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Repita a senha"
                className="pr-10"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {confirmPassword.length > 0 && !passwordsMatch && (
              <p className="text-sm text-destructive">As senhas não coincidem</p>
            )}
            {passwordsMatch && passwordValid && (
              <p className="text-sm text-primary flex items-center gap-1">
                <CheckCircle className="h-3 w-3" />
                Senhas coincidem
              </p>
            )}
          </div>

          <Button
            type="submit"
            className="w-full"
            size="lg"
            disabled={!passwordValid || !passwordsMatch || loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Salvando...
              </>
            ) : (
              'Continuar'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
