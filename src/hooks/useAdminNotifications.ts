import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { NotificationFormData, NotificationCampaign, NotificationStats } from '@/types/notifications';

export const useAdminNotifications = () => {
  const [loading, setLoading] = useState(false);

  const sendNotification = async (data: NotificationFormData) => {
    setLoading(true);
    try {
      // Get current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Create campaign record
      const { data: campaign, error: campaignError } = await supabase
        .from('notification_campaigns')
        .insert({
          created_by: user.id,
          title: data.title,
          message: data.message,
          type: data.type,
          target_audience: data.target_audience,
          target_user_ids: data.target_user_ids || null,
          action_url: data.action_url || null,
          action_label: data.action_label || null,
          metadata: data.metadata || null,
        })
        .select()
        .single();

      if (campaignError) throw campaignError;

      // Call function to send notifications
      const { data: result, error: sendError } = await supabase.rpc(
        'send_notification_campaign',
        {
          p_campaign_id: campaign.id,
          p_title: data.title,
          p_message: data.message,
          p_type: data.type,
          p_target_audience: data.target_audience,
          p_target_user_ids: data.target_user_ids || [],
          p_action_url: data.action_url || null,
          p_action_label: data.action_label || null,
          p_metadata: data.metadata || null,
        }
      );

      if (sendError) throw sendError;

      toast.success(`Notificação enviada para ${result} usuários!`);
      return { success: true, sentCount: result };
    } catch (error: any) {
      console.error('Error sending notification:', error);
      toast.error('Erro ao enviar notificação');
      return { success: false, error };
    } finally {
      setLoading(false);
    }
  };

  const fetchNotificationHistory = async (limit = 50) => {
    try {
      const { data, error } = await supabase
        .from('notification_campaigns')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;
      return data as NotificationCampaign[];
    } catch (error) {
      console.error('Error fetching history:', error);
      toast.error('Erro ao carregar histórico');
      return [];
    }
  };

  const getNotificationStats = async (): Promise<NotificationStats> => {
    try {
      // Total sent in last 30 days
      const { count: totalSent } = await supabase
        .from('notification_campaigns')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      // Total unread
      const { count: totalUnread } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', false);

      // Sent today
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      
      const { count: sentToday } = await supabase
        .from('notification_campaigns')
        .select('*', { count: 'exact', head: true })
        .gte('created_at', startOfDay.toISOString());

      // Calculate read rate
      const { count: totalNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true });

      const { count: readNotifications } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('is_read', true);

      const averageReadRate = totalNotifications 
        ? Math.round((readNotifications! / totalNotifications) * 100)
        : 0;

      return {
        total_sent: totalSent || 0,
        average_read_rate: averageReadRate,
        total_unread: totalUnread || 0,
        sent_today: sentToday || 0,
      };
    } catch (error) {
      console.error('Error fetching stats:', error);
      return {
        total_sent: 0,
        average_read_rate: 0,
        total_unread: 0,
        sent_today: 0,
      };
    }
  };

  return {
    sendNotification,
    fetchNotificationHistory,
    getNotificationStats,
    loading,
  };
};
