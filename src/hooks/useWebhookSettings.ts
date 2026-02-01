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

      // Always use real data from the database
      const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
        body: {
          event_type: eventType,
          payload: undefined, // Edge function will fetch real data
          is_test: true,
          use_real_data: true,
        },
      });

      if (error) throw error;

      await fetchSettings(); // Refresh to get latest status

      if (data?.success) {
        toast({
          title: 'Teste enviado!',
          description: `Resposta: ${data.status_code} (dados reais)`,
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
        description: error.message || 'Não foi possível enviar o teste',
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
