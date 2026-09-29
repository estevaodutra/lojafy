import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { WEBHOOK_EVENTS_CATALOG } from '@/data/webhookEventsCatalog';

export interface RegisteredWebhook {
  id: string;
  name: string;
  url: string;
  token: string;
  events: string[];
  active: boolean;
  created_at: string;
  updated_at: string;
  last_triggered_at?: string | null;
  last_status_code?: number | null;
  last_error_message?: string | null;
}

const STORAGE_KEY = 'lojafy_custom_webhooks_v1';
const DB_REGISTRY_EVENT = 'registered_webhooks';

export const useRegisteredWebhooks = () => {
  const [webhooks, setWebhooks] = useState<RegisteredWebhook[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  // Load webhooks from DB with localStorage fallback
  const fetchWebhooks = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Fetch all webhook_settings rows from database
      const { data: allRows, error: allRowsError } = await supabase
        .from('webhook_settings')
        .select('*');

      let loaded: RegisteredWebhook[] = [];

      // 2. Check if registered_webhooks registry row exists
      const registryRow = allRows?.find(r => r.event_type === DB_REGISTRY_EVENT);
      if (registryRow?.last_error_message) {
        try {
          const parsed = JSON.parse(registryRow.last_error_message);
          if (Array.isArray(parsed)) {
            loaded = parsed;
          }
        } catch (e) {
          console.warn('Erro ao parsear registry do banco:', e);
        }
      }

      // If loaded is empty, fallback to localStorage
      if (loaded.length === 0) {
        const local = localStorage.getItem(STORAGE_KEY);
        if (local) {
          try {
            const parsedLocal = JSON.parse(local);
            if (Array.isArray(parsedLocal) && parsedLocal.length > 0) {
              loaded = parsedLocal;
            }
          } catch (e) {
            console.warn('Erro ao ler localStorage:', e);
          }
        }
      }

      // 3. MIGRAÇÃO AUTOMÁTICA DOS WEBHOOKS JÁ CONFIGURADOS NO API DOCS
      // Qualquer linha com webhook_url preenchida (ex: order.paid, user.created) que ainda não esteja na lista
      let hasMigrated = false;
      if (allRows && allRows.length > 0) {
        for (const row of allRows) {
          if (row.event_type === DB_REGISTRY_EVENT) continue;
          if (row.webhook_url && row.webhook_url.trim().length > 0) {
            const alreadyExists = loaded.some(w => 
              w.id === row.id || 
              (w.url.trim() === row.webhook_url.trim() && w.events.includes(row.event_type))
            );

            if (!alreadyExists) {
              const meta = WEBHOOK_EVENTS_CATALOG.find(e => e.eventType === row.event_type);
              const eventTitle = meta?.title || row.event_type;
              const migratedWebhook: RegisteredWebhook = {
                id: row.id || 'migrated_' + row.event_type,
                name: `Webhook ${eventTitle}`,
                url: row.webhook_url.trim(),
                token: row.secret_token || 'whsec_' + Math.random().toString(36).substring(2, 12),
                events: [row.event_type],
                active: row.active ?? true,
                created_at: row.created_at || new Date().toISOString(),
                updated_at: row.updated_at || new Date().toISOString(),
                last_triggered_at: row.last_triggered_at || null,
                last_status_code: row.last_status_code || null,
                last_error_message: row.last_error_message || null,
              };

              loaded.push(migratedWebhook);
              hasMigrated = true;
            }
          }
        }
      }

      setWebhooks(loaded);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(loaded));

      if (hasMigrated) {
        await syncToDatabase(loaded);
      }
    } catch (err) {
      console.error('Erro ao buscar webhooks:', err);
      // Fallback to local storage
      const local = localStorage.getItem(STORAGE_KEY);
      if (local) {
        try {
          setWebhooks(JSON.parse(local));
        } catch {}
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWebhooks();
  }, [fetchWebhooks]);

  // Sync state to DB and localStorage
  const syncToDatabase = async (list: RegisteredWebhook[]) => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));

      // 1. Check if registry record exists
      const { data: existing } = await supabase
        .from('webhook_settings')
        .select('id')
        .eq('event_type', DB_REGISTRY_EVENT)
        .maybeSingle();

      const payloadJson = JSON.stringify(list);

      if (existing) {
        await supabase
          .from('webhook_settings')
          .update({
            last_error_message: payloadJson,
            active: list.some(w => w.active),
            updated_at: new Date().toISOString()
          })
          .eq('event_type', DB_REGISTRY_EVENT);
      } else {
        await supabase
          .from('webhook_settings')
          .insert({
            event_type: DB_REGISTRY_EVENT,
            webhook_url: list[0]?.url || 'https://registry.internal',
            active: list.some(w => w.active),
            secret_token: list[0]?.token || 'whsec_' + Math.random().toString(36).substring(2, 15),
            last_error_message: payloadJson,
          });
      }

      // 2. Also sync individual event settings for standard edge functions compatibility
      const activeWebhooks = list.filter(w => w.active && w.url);
      const allEvents = Array.from(new Set(list.flatMap(w => w.events)));

      for (const ev of allEvents) {
        const matchingWebhook = activeWebhooks.find(w => w.events.includes(ev));
        const { data: evRow } = await supabase
          .from('webhook_settings')
          .select('id')
          .eq('event_type', ev)
          .maybeSingle();

        if (matchingWebhook) {
          if (evRow) {
            await supabase
              .from('webhook_settings')
              .update({
                webhook_url: matchingWebhook.url,
                active: true,
                secret_token: matchingWebhook.token
              })
              .eq('event_type', ev);
          } else {
            await supabase
              .from('webhook_settings')
              .insert({
                event_type: ev,
                webhook_url: matchingWebhook.url,
                active: true,
                secret_token: matchingWebhook.token
              });
          }
        }
      }
    } catch (err) {
      console.warn('Sync do banco webhook falhou (RLS ou offline):', err);
    }
  };

  // Create new webhook
  const createWebhook = async (data: {
    name: string;
    url: string;
    token: string;
    events: string[];
    active: boolean;
  }): Promise<boolean> => {
    try {
      setSaving(true);
      const newWebhook: RegisteredWebhook = {
        id: crypto.randomUUID ? crypto.randomUUID() : 'wh_' + Date.now(),
        name: data.name.trim() || 'Webhook sem nome',
        url: data.url.trim(),
        token: data.token.trim(),
        events: data.events,
        active: data.active,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        last_triggered_at: null,
        last_status_code: null,
        last_error_message: null,
      };

      const updatedList = [newWebhook, ...webhooks];
      setWebhooks(updatedList);
      await syncToDatabase(updatedList);

      toast({
        title: 'Webhook criado!',
        description: `O webhook "${newWebhook.name}" foi cadastrado com sucesso.`,
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao criar webhook:', err);
      toast({
        title: 'Erro ao criar webhook',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Update existing webhook
  const updateWebhook = async (
    id: string,
    data: Partial<Omit<RegisteredWebhook, 'id' | 'created_at'>>
  ): Promise<boolean> => {
    try {
      setSaving(true);
      const updatedList = webhooks.map(w => {
        if (w.id === id) {
          return {
            ...w,
            ...data,
            updated_at: new Date().toISOString()
          };
        }
        return w;
      });

      setWebhooks(updatedList);
      await syncToDatabase(updatedList);

      toast({
        title: 'Webhook atualizado',
        description: 'As alterações foram salvas com sucesso.',
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao atualizar webhook:', err);
      toast({
        title: 'Erro ao atualizar',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Toggle active/inactive
  const toggleActive = async (id: string): Promise<void> => {
    const webhook = webhooks.find(w => w.id === id);
    if (!webhook) return;
    const newStatus = !webhook.active;
    await updateWebhook(id, { active: newStatus });
  };

  // Delete webhook
  const deleteWebhook = async (id: string): Promise<boolean> => {
    try {
      setSaving(true);
      const webhook = webhooks.find(w => w.id === id);
      const updatedList = webhooks.filter(w => w.id !== id);
      setWebhooks(updatedList);
      await syncToDatabase(updatedList);

      toast({
        title: 'Webhook removido',
        description: `O webhook "${webhook?.name || ''}" foi excluído.`,
      });
      return true;
    } catch (err: any) {
      console.error('Erro ao excluir webhook:', err);
      toast({
        title: 'Erro ao excluir',
        description: err.message || 'Tente novamente.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  // Test webhook (either by direct URL or for a registered webhook)
  const testWebhook = async (
    url: string,
    eventType: string = 'user.created',
    secretToken?: string,
    webhookId?: string
  ): Promise<{ success: boolean; statusCode?: number; error?: string }> => {
    try {
      const sample = WEBHOOK_EVENTS_CATALOG.find(e => e.eventType === eventType)?.samplePayload?.data || {
        _test: true,
        message: 'Teste de webhook da Lojafy',
        timestamp: new Date().toISOString()
      };

      const { data, error } = await supabase.functions.invoke('dispatch-webhook', {
        body: {
          event_type: eventType,
          payload: sample,
          is_test: true,
          use_real_data: eventType === 'user.created' || eventType === 'order.paid',
          webhook_url: url,
          secret_token: secretToken || 'whsec_test',
        }
      });

      if (error) throw error;

      const statusCode = data?.status_code || (data?.success ? 200 : 500);
      const success = !!data?.success;
      const errorMessage = data?.error || (success ? null : 'Falha na resposta do webhook');

      // If we tested a saved webhook, update its last delivery status
      if (webhookId) {
        const updatedList = webhooks.map(w => {
          if (w.id === webhookId) {
            return {
              ...w,
              last_triggered_at: new Date().toISOString(),
              last_status_code: statusCode,
              last_error_message: errorMessage
            };
          }
          return w;
        });
        setWebhooks(updatedList);
        await syncToDatabase(updatedList);
      }

      if (success) {
        toast({
          title: 'Teste enviado com sucesso!',
          description: `O webhook respondeu com status ${statusCode} OK`,
        });
      } else {
        toast({
          title: 'Falha no teste do webhook',
          description: errorMessage || `Status retornado: ${statusCode}`,
          variant: 'destructive',
        });
      }

      return { success, statusCode, error: errorMessage };
    } catch (err: any) {
      console.error('Erro ao testar webhook:', err);
      toast({
        title: 'Erro ao testar webhook',
        description: err.message || 'Verifique se a URL informada está acessível e aceita requisições POST.',
        variant: 'destructive',
      });
      return { success: false, error: err.message };
    }
  };

  return {
    webhooks,
    loading,
    saving,
    fetchWebhooks,
    createWebhook,
    updateWebhook,
    toggleActive,
    deleteWebhook,
    testWebhook,
  };
};
