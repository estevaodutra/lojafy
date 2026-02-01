import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface WebhookSetting {
  id: string;
  event_type: string;
  webhook_url: string | null;
  active: boolean;
  secret_token: string | null;
  last_triggered_at: string | null;
  last_status_code: number | null;
  last_error_message: string | null;
  created_at: string;
  updated_at: string;
}

export const useWebhookSettings = () => {
  const [settings, setSettings] = useState<WebhookSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('webhook_settings')
        .select('*')
        .order('event_type');

      if (error) throw error;
      
      setSettings((data as unknown as WebhookSetting[]) || []);
    } catch (error: any) {
      console.error('Erro ao buscar configurações de webhook:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível carregar as configurações de webhook',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  const updateWebhookUrl = async (eventType: string, url: string) => {
    try {
      setUpdating(eventType);
      
      const { error } = await supabase
        .from('webhook_settings')
        .update({ webhook_url: url || null })
        .eq('event_type', eventType);

      if (error) throw error;

      setSettings(prev => 
        prev.map(s => s.event_type === eventType ? { ...s, webhook_url: url || null } : s)
      );

      toast({
        title: 'URL atualizada',
        description: `Webhook ${eventType} atualizado com sucesso`,
      });
    } catch (error: any) {
      console.error('Erro ao atualizar URL:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar a URL',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const toggleWebhookActive = async (eventType: string) => {
    const current = settings.find(s => s.event_type === eventType);
    if (!current) return;

    try {
      setUpdating(eventType);

      const newActive = !current.active;
      
      // Validar se tem URL antes de ativar
      if (newActive && !current.webhook_url) {
        toast({
          title: 'URL obrigatória',
          description: 'Configure a URL do webhook antes de ativar',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('webhook_settings')
        .update({ active: newActive })
        .eq('event_type', eventType);

      if (error) throw error;

      setSettings(prev => 
        prev.map(s => s.event_type === eventType ? { ...s, active: newActive } : s)
      );

      toast({
        title: newActive ? 'Webhook ativado' : 'Webhook desativado',
        description: `${eventType} foi ${newActive ? 'ativado' : 'desativado'}`,
      });
    } catch (error: any) {
      console.error('Erro ao alternar status:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível alterar o status',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const testWebhook = async (eventType: string) => {
    const current = settings.find(s => s.event_type === eventType);
    if (!current?.webhook_url) {
      toast({
        title: 'URL obrigatória',
        description: 'Configure a URL do webhook antes de testar',
        variant: 'destructive',
      });
      return;
    }

    try {
      setUpdating(eventType);

      const testPayload = getTestPayload(eventType);

      const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
        body: {
          event_type: eventType,
          payload: testPayload,
          is_test: true,
        },
      });

      if (error) throw error;

      await fetchSettings(); // Refresh para pegar último status

      if (data?.success) {
        toast({
          title: 'Teste enviado!',
          description: `Resposta: ${data.status_code}`,
        });
      } else {
        toast({
          title: 'Falha no teste',
          description: data?.error || 'Erro ao enviar webhook',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      console.error('Erro ao testar webhook:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível enviar o teste',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  const regenerateSecret = async (eventType: string) => {
    try {
      setUpdating(eventType);

      // Gerar novo secret token
      const randomBytes = new Uint8Array(24);
      crypto.getRandomValues(randomBytes);
      const newSecret = 'whsec_' + Array.from(randomBytes).map(b => b.toString(16).padStart(2, '0')).join('');

      const { error } = await supabase
        .from('webhook_settings')
        .update({ secret_token: newSecret })
        .eq('event_type', eventType);

      if (error) throw error;

      setSettings(prev => 
        prev.map(s => s.event_type === eventType ? { ...s, secret_token: newSecret } : s)
      );

      toast({
        title: 'Token regenerado',
        description: 'Novo secret token gerado com sucesso',
      });
    } catch (error: any) {
      console.error('Erro ao regenerar secret:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível regenerar o token',
        variant: 'destructive',
      });
    } finally {
      setUpdating(null);
    }
  };

  return {
    settings,
    loading,
    updating,
    updateWebhookUrl,
    toggleWebhookActive,
    testWebhook,
    regenerateSecret,
    refetch: fetchSettings,
  };
};

function getTestPayload(eventType: string): Record<string, any> {
  switch (eventType) {
    case 'order.paid':
      return {
        order_id: '00000000-0000-0000-0000-000000000000',
        order_number: 'ORD-TEST-000001',
        total_amount: 199.90,
        payment_method: 'pix',
        customer: {
          user_id: '00000000-0000-0000-0000-000000000000',
          email: 'teste@exemplo.com',
          name: 'Cliente Teste',
          phone: '11999999999',
        },
        reseller: {
          user_id: '00000000-0000-0000-0000-000000000000',
          store_name: 'Loja Teste',
        },
        items: [
          { product_id: '00000000-0000-0000-0000-000000000000', name: 'Produto Teste', quantity: 1, unit_price: 199.90 }
        ],
      };
    
    case 'user.created':
      return {
        user_id: '00000000-0000-0000-0000-000000000000',
        email: 'novo@exemplo.com',
        name: 'Novo Usuário Teste',
        phone: '11988888888',
        role: 'reseller',
        origin: {
          type: 'api',
          store_id: null,
          store_name: null,
        },
        created_at: new Date().toISOString(),
      };
    
    case 'user.inactive.7days':
    case 'user.inactive.15days':
    case 'user.inactive.30days':
      const days = parseInt(eventType.split('.')[2].replace('days', ''));
      return {
        user_id: '00000000-0000-0000-0000-000000000000',
        email: 'usuario@exemplo.com',
        name: 'Usuário Inativo Teste',
        role: 'customer',
        last_sign_in_at: new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString(),
        days_inactive: days,
        created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      };
    
    default:
      return { message: 'Evento de teste' };
  }
}
