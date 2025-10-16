import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { MandatoryNotification, MandatoryNotificationMetrics, MandatoryNotificationFormData } from '@/types/notifications';

export const useMandatoryNotifications = () => {
  const { user, profile } = useAuth();
  const [pendingNotification, setPendingNotification] = useState<MandatoryNotification | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && profile) {
      checkPendingNotifications();
    } else {
      setLoading(false);
    }
  }, [user, profile]);

  const checkPendingNotifications = async () => {
    try {
      setLoading(true);

      const { data: activeNotifications, error: fetchError } = await supabase
        .from('mandatory_notifications')
        .select('*')
        .eq('is_active', true)
        .or(`target_audience.eq.all,target_audience.eq.${profile?.role}`)
        .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
        .order('priority', { ascending: false });

      if (fetchError) throw fetchError;
      if (!activeNotifications || activeNotifications.length === 0) {
        setPendingNotification(null);
        return;
      }

      const { data: viewedNotifications, error: viewError } = await supabase
        .from('mandatory_notification_views')
        .select('notification_id')
        .eq('user_id', user!.id)
        .in('notification_id', activeNotifications.map(n => n.id));

      if (viewError) throw viewError;

      const viewedIds = new Set(viewedNotifications?.map(v => v.notification_id) || []);
      const pending = activeNotifications.find(n => !viewedIds.has(n.id));
      
      setPendingNotification((pending || null) as MandatoryNotification | null);
    } catch (error) {
      console.error('Error checking pending notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsViewed = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_notification_views')
        .insert({
          notification_id: notificationId,
          user_id: user!.id,
        });

      if (error && error.code !== '23505') {
        throw error;
      }
    } catch (error) {
      console.error('Error marking notification as viewed:', error);
    }
  };

  const updateVideoProgress = async (notificationId: string, seconds: number) => {
    try {
      const { error } = await supabase
        .from('mandatory_notification_views')
        .update({ video_watched_seconds: seconds })
        .eq('notification_id', notificationId)
        .eq('user_id', user!.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating video progress:', error);
    }
  };

  const markVideoCompleted = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_notification_views')
        .update({ video_completed: true })
        .eq('notification_id', notificationId)
        .eq('user_id', user!.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking video as completed:', error);
    }
  };

  const markButtonClicked = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_notification_views')
        .update({ button_clicked: true })
        .eq('notification_id', notificationId)
        .eq('user_id', user!.id);

      if (error) throw error;

      setPendingNotification(null);
      await checkPendingNotifications();
    } catch (error) {
      console.error('Error marking button clicked:', error);
    }
  };

  const markActionClicked = async (notificationId: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_notification_views')
        .update({ action_clicked: true })
        .eq('notification_id', notificationId)
        .eq('user_id', user!.id);

      if (error) throw error;
    } catch (error) {
      console.error('Error marking action clicked:', error);
    }
  };

  return {
    pendingNotification,
    loading,
    markAsViewed,
    updateVideoProgress,
    markVideoCompleted,
    markButtonClicked,
    markActionClicked,
    refetch: checkPendingNotifications,
  };
};

export const useAdminMandatoryNotifications = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<MandatoryNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('mandatory_notifications')
        .select('*')
        .order('priority', { ascending: false });

      if (error) throw error;
      setNotifications((data || []) as MandatoryNotification[]);
    } catch (error) {
      console.error('Error fetching mandatory notifications:', error);
      toast.error('Erro ao carregar notificações obrigatórias');
    } finally {
      setLoading(false);
    }
  };

  const createNotification = async (data: MandatoryNotificationFormData) => {
    try {
      const { error } = await supabase
        .from('mandatory_notifications')
        .insert([{ ...data, created_by: user!.id }]);

      if (error) throw error;
      
      toast.success('Notificação obrigatória criada com sucesso!');
      await fetchNotifications();
      return { success: true };
    } catch (error) {
      console.error('Error creating notification:', error);
      toast.error('Erro ao criar notificação obrigatória');
      return { success: false, error };
    }
  };

  const updateNotification = async (id: string, data: Partial<MandatoryNotificationFormData>) => {
    try {
      const { error } = await supabase
        .from('mandatory_notifications')
        .update(data)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Notificação atualizada com sucesso!');
      await fetchNotifications();
      return { success: true };
    } catch (error) {
      console.error('Error updating notification:', error);
      toast.error('Erro ao atualizar notificação');
      return { success: false, error };
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      const { error } = await supabase
        .from('mandatory_notifications')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Notificação excluída com sucesso!');
      await fetchNotifications();
      return { success: true };
    } catch (error) {
      console.error('Error deleting notification:', error);
      toast.error('Erro ao excluir notificação');
      return { success: false, error };
    }
  };

  const getMetrics = async (notificationId: string): Promise<MandatoryNotificationMetrics | null> => {
    try {
      const { data, error } = await supabase
        .rpc('get_mandatory_notification_metrics', { notification_uuid: notificationId });

      if (error) throw error;
      return data[0] || null;
    } catch (error) {
      console.error('Error fetching metrics:', error);
      return null;
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  return {
    notifications,
    loading,
    createNotification,
    updateNotification,
    deleteNotification,
    getMetrics,
    refetch: fetchNotifications,
  };
};
