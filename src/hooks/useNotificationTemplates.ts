import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NotificationTemplate } from '@/types/notifications';

export const useNotificationTemplates = () => {
  const [templates, setTemplates] = useState<NotificationTemplate[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('notification_templates')
        .select('*')
        .order('trigger_type', { ascending: true });

      if (error) throw error;
      setTemplates((data || []) as NotificationTemplate[]);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Erro ao carregar templates');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async (id: string, updates: Partial<NotificationTemplate>) => {
    try {
      const { error } = await supabase
        .from('notification_templates')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      toast.success('Template atualizado com sucesso!');
      fetchTemplates();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Erro ao atualizar template');
    }
  };

  const toggleTemplate = async (id: string, active: boolean) => {
    await updateTemplate(id, { active });
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const getExampleVariablesForTrigger = (triggerType: string): any => {
    const examples: Record<string, any> = {
      price_decrease: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
        OLD_PRICE: '199,90',
        NEW_PRICE: '149,90',
        DISCOUNT_PERCENTAGE: '25',
      },
      price_increase: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
        OLD_PRICE: '149,90',
        NEW_PRICE: '199,90',
      },
      back_in_stock: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
        STOCK_QUANTITY: '10',
      },
      low_stock: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
        STOCK_QUANTITY: '3',
      },
      order_confirmed: {
        ORDER_ID: '00000000-0000-0000-0000-000000000000',
        ORDER_NUMBER: 'ORD-20250110-000001',
      },
      order_shipped: {
        ORDER_ID: '00000000-0000-0000-0000-000000000000',
        ORDER_NUMBER: 'ORD-20250110-000001',
        TRACKING_CODE: 'BR123456789',
      },
      order_delivered: {
        ORDER_ID: '00000000-0000-0000-0000-000000000000',
        ORDER_NUMBER: 'ORD-20250110-000001',
      },
      new_lesson: {
        COURSE_ID: '00000000-0000-0000-0000-000000000000',
        COURSE_NAME: 'Curso de Exemplo',
        LESSON_TITLE: 'Aula 1: Introdução',
      },
      course_completed: {
        COURSE_ID: '00000000-0000-0000-0000-000000000000',
        COURSE_NAME: 'Curso de Exemplo',
      },
      product_removed: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
      },
      product_reactivated: {
        PRODUCT_ID: '00000000-0000-0000-0000-000000000000',
        PRODUCT_NAME: 'Produto de Exemplo',
      },
    };
    
    return examples[triggerType] || {};
  };

  const replaceVariables = (text: string, variables: any): string => {
    let result = text;
    Object.entries(variables).forEach(([key, value]) => {
      result = result.replace(new RegExp(`{${key}}`, 'g'), String(value));
    });
    return result;
  };

  const triggerManualNotification = async (
    template: NotificationTemplate, 
    customVariables?: any,
    targetAudience?: string
  ) => {
    try {
      setLoading(true);
      
      // Use custom variables if provided, otherwise use examples
      const variables = customVariables || getExampleVariablesForTrigger(template.trigger_type);
      const audienceToUse = targetAudience || template.target_audience;
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error('Usuário não autenticado');
      
      // Create temporary campaign
      const { data: campaign, error: campaignError } = await supabase
        .from('notification_campaigns')
        .insert({
          created_by: user.id,
          title: replaceVariables(template.title_template, variables),
          message: replaceVariables(template.message_template, variables),
          type: template.trigger_type,
          target_audience: audienceToUse,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;
      
      // Send using campaign RPC which accepts target_audience
      const { data, error } = await supabase.rpc('send_notification_campaign', {
        p_campaign_id: campaign.id,
        p_title: replaceVariables(template.title_template, variables),
        p_message: replaceVariables(template.message_template, variables),
        p_type: template.trigger_type,
        p_target_audience: audienceToUse,
        p_target_user_ids: null,
        p_action_url: template.action_url_template 
          ? replaceVariables(template.action_url_template, variables) 
          : null,
        p_action_label: template.action_label || null,
        p_metadata: variables,
      });
      
      if (error) throw error;
      
      toast.success(`✅ ${data} notificações enviadas!`);
      await fetchTemplates();
      
      return { success: true, sentCount: data };
    } catch (error) {
      console.error('Error triggering manual notification:', error);
      toast.error('❌ Erro ao enviar notificação manual');
      return { success: false };
    } finally {
      setLoading(false);
    }
  };

  return {
    templates,
    loading,
    updateTemplate,
    toggleTemplate,
    triggerManualNotification,
    refetch: fetchTemplates,
  };
};
