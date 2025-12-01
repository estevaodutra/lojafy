import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Store, Sparkles, ShoppingBag, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';

export const WelcomeResellerModal = () => {
  const { user, profile } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile?.role === 'reseller') {
      checkFirstAccess();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const checkFirstAccess = async () => {
    try {
      // Buscar transições não vistas
      const { data, error } = await supabase
        .from('role_transition_logs')
        .select('id, welcome_popup_seen')
        .eq('user_id', user!.id)
        .eq('to_role', 'reseller')
        .eq('welcome_popup_seen', false)
        .order('created_at', { ascending: false })
        .limit(1);

      if (error) {
        console.error('Error checking first access:', error);
        return;
      }
      
      if (data && data.length > 0) {
        setIsOpen(true);
      }
    } catch (error) {
      console.error('Error checking first access:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsSeen = async () => {
    try {
      await supabase
        .from('role_transition_logs')
        .update({ 
          welcome_popup_seen: true,
          welcome_popup_seen_at: new Date().toISOString()
        })
        .eq('user_id', user!.id)
        .eq('to_role', 'reseller')
        .eq('welcome_popup_seen', false);
      
      setIsOpen(false);
    } catch (error) {
      console.error('Error marking popup as seen:', error);
      setIsOpen(false);
    }
  };

  if (loading || !isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && markAsSeen()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-center text-2xl">
            🎉 Parabéns!
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="bg-primary/10 p-4 rounded-full">
                <Store className="h-12 w-12 text-primary" />
              </div>
            </div>
            <h3 className="text-xl font-semibold">
              Agora você é um Revendedor!
            </h3>
            <p className="text-muted-foreground">
              Você agora pode montar sua própria loja online e começar a vender produtos para seus clientes.
            </p>
          </div>

          <div className="grid gap-3">
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <ShoppingBag className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Catálogo de Produtos</p>
                <p className="text-sm text-muted-foreground">
                  Adicione produtos ao seu catálogo pessoal
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <Sparkles className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Loja Personalizada</p>
                <p className="text-sm text-muted-foreground">
                  Personalize cores, logo e banners da sua loja
                </p>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              <TrendingUp className="h-5 w-5 text-primary" />
              <div>
                <p className="font-medium">Comissões por Venda</p>
                <p className="text-sm text-muted-foreground">
                  Ganhe comissão em cada venda realizada
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            <Button asChild size="lg" className="w-full">
              <Link to="/reseller/loja" onClick={markAsSeen}>
                Configurar Minha Loja
              </Link>
            </Button>
            <Button 
              variant="outline" 
              size="lg" 
              className="w-full"
              onClick={markAsSeen}
            >
              Explorar Depois
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
