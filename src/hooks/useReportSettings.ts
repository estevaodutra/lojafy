import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReportSettings {
  id: string;
  generation_hour: number;
  generation_minute: number;
  auto_generate_enabled: boolean;
  notification_email: string | null;
}

export const useReportSettings = () => {
  const [settings, setSettings] = useState<ReportSettings | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('report_settings')
        .select('*')
        .single();

      if (error) throw error;
      setSettings(data);
    } catch (error) {
      console.error('Error fetching report settings:', error);
      toast.error('Erro ao carregar configurações');
    } finally {
      setLoading(false);
    }
  };

  const updateSettings = async (updates: Partial<ReportSettings>) => {
    try {
      if (!settings) return;

      const { error } = await supabase
        .from('report_settings')
        .update(updates)
        .eq('id', settings.id);

      if (error) throw error;

      await fetchSettings();
      toast.success('Configurações atualizadas!');
    } catch (error) {
      console.error('Error updating settings:', error);
      toast.error('Erro ao atualizar configurações');
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return {
    settings,
    loading,
    updateSettings,
    refetch: fetchSettings,
  };
};