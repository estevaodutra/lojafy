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

  return {
    templates,
    loading,
    updateTemplate,
    toggleTemplate,
    refetch: fetchTemplates,
  };
};
