export type NotificationType = 
  | 'new_product' 
  | 'product_removed' 
  | 'new_lesson' 
  | 'new_feature' 
  | 'promotion' 
  | 'system'
  | 'custom';

export type NotificationTargetAudience = 
  | 'all' 
  | 'customers' 
  | 'resellers' 
  | 'suppliers' 
  | 'specific';

export interface NotificationFormData {
  target_audience: NotificationTargetAudience;
  target_user_ids?: string[];
  type: NotificationType;
  title: string;
  message: string;
  action_url?: string;
  action_label?: string;
  metadata?: Record<string, any>;
}

export interface NotificationCampaign {
  id: string;
  created_by: string;
  title: string;
  message: string;
  type: NotificationType;
  target_audience: NotificationTargetAudience;
  target_user_ids?: string[];
  sent_count: number;
  created_at: string;
}

export interface NotificationStats {
  total_sent: number;
  average_read_rate: number;
  total_unread: number;
  sent_today: number;
}

export type AutomaticTriggerType =
  | 'price_decrease'
  | 'price_increase'
  | 'back_in_stock'
  | 'low_stock'
  | 'order_confirmed'
  | 'order_shipped'
  | 'order_delivered'
  | 'new_lesson'
  | 'course_completed';

export interface NotificationTemplate {
  id: string;
  trigger_type: AutomaticTriggerType;
  active: boolean;
  title_template: string;
  message_template: string;
  target_audience: string;
  action_url_template?: string;
  action_label?: string;
  conditions?: Record<string, any>;
  total_sent: number;
  total_read: number;
  last_sent_at?: string;
  created_at: string;
  updated_at: string;
}

export interface TemplateVariable {
  key: string;
  description: string;
  example: string;
}
