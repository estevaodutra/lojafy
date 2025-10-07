import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Bell, Package, GraduationCap, AlertCircle, Gift, Info, Trash2, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface Notification {
  id: string;
  title: string;
  message: string;
  type: string;
  action_url?: string;
  action_label?: string;
  is_read: boolean;
  created_at: string;
}

interface NotificationCardProps {
  notification: Notification;
  onMarkAsRead?: (id: string) => void;
  onDelete?: (id: string) => void;
  compact?: boolean;
}

const typeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  new_product: Package,
  product_removed: AlertCircle,
  new_lesson: GraduationCap,
  new_feature: Gift,
  promotion: Gift,
  system: Info,
  custom: Bell,
};

const typeColors: Record<string, string> = {
  new_product: 'text-green-500',
  product_removed: 'text-red-500',
  new_lesson: 'text-blue-500',
  new_feature: 'text-purple-500',
  promotion: 'text-orange-500',
  system: 'text-gray-500',
  custom: 'text-primary',
};

export function NotificationCard({ notification, onMarkAsRead, onDelete, compact }: NotificationCardProps) {
  const navigate = useNavigate();
  const Icon = typeIcons[notification.type] || Bell;

  const handleActionClick = () => {
    if (!notification.is_read && onMarkAsRead) {
      onMarkAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  return (
    <Card className={cn(
      "p-4 transition-colors",
      !notification.is_read && "bg-accent/30",
      compact && "p-3"
    )}>
      <div className="flex gap-3">
        <div className={cn("flex-shrink-0", typeColors[notification.type])}>
          <Icon className={compact ? "h-5 w-5" : "h-6 w-6"} />
        </div>
        
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <h4 className={cn(
                  "font-semibold",
                  compact ? "text-sm" : "text-base"
                )}>
                  {notification.title}
                </h4>
                {!notification.is_read && (
                  <Badge variant="secondary" className="h-5">Novo</Badge>
                )}
              </div>
              <p className={cn(
                "text-muted-foreground mt-1",
                compact ? "text-xs" : "text-sm"
              )}>
                {notification.message}
              </p>
              <span className="text-xs text-muted-foreground mt-2 block">
                {formatDistanceToNow(new Date(notification.created_at), {
                  addSuffix: true,
                  locale: ptBR,
                })}
              </span>
            </div>
          </div>

          {!compact && (
            <div className="flex items-center gap-2 mt-3">
              {notification.action_url && (
                <Button
                  size="sm"
                  variant="default"
                  onClick={handleActionClick}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {notification.action_label || 'Ver'}
                </Button>
              )}
              {!notification.is_read && onMarkAsRead && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onMarkAsRead(notification.id)}
                >
                  Marcar como lida
                </Button>
              )}
              {onDelete && (
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => onDelete(notification.id)}
                  className="ml-auto"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
