import { Bell, Package, AlertCircle, GraduationCap, Sparkles, Tag, Check } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useNotifications } from '@/hooks/useNotifications';
import { useNavigate } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const typeIcons: Record<string, any> = {
  new_product: Package,
  product_removed: AlertCircle,
  new_lesson: GraduationCap,
  new_feature: Sparkles,
  promotion: Tag,
  system: Bell
};

const typeColors: Record<string, string> = {
  new_product: 'text-green-600',
  product_removed: 'text-red-600',
  new_lesson: 'text-blue-600',
  new_feature: 'text-purple-600',
  promotion: 'text-orange-600',
  system: 'text-gray-600'
};

export const NotificationBell = () => {
  const { notifications, unreadCount, loading, markAsRead, markAllAsReadSilent } = useNotifications();
  const navigate = useNavigate();

  const handleOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      markAllAsReadSilent();
    }
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markAsRead(notification.id);
    }
    if (notification.action_url) {
      navigate(notification.action_url);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <Popover onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount > 9 ? '9+' : unreadCount}
            </Badge>
          )}
          <span className="sr-only">Notificações</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Notificações</h3>
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="p-8 text-center text-muted-foreground">
              Carregando...
            </div>
          ) : recentNotifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>Nenhuma notificação</p>
            </div>
          ) : (
            <div className="divide-y">
              {recentNotifications.map((notification) => {
                const Icon = typeIcons[notification.type] || Bell;
                const iconColor = typeColors[notification.type] || 'text-gray-600';
                
                return (
                  <div
                    key={notification.id}
                    onClick={() => handleNotificationClick(notification)}
                    className={cn(
                      "p-4 cursor-pointer transition-colors hover:bg-muted/50",
                      !notification.is_read && "bg-primary/5"
                    )}
                  >
                    <div className="flex gap-3">
                      <div className={cn("mt-1", iconColor)}>
                        <Icon className="h-5 w-5" />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <p className={cn(
                            "text-sm font-medium leading-tight",
                            !notification.is_read && "font-semibold"
                          )}>
                            {notification.title}
                          </p>
                          {!notification.is_read && (
                            <div className="h-2 w-2 rounded-full bg-primary flex-shrink-0 mt-1" />
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(notification.created_at), {
                            addSuffix: true,
                            locale: ptBR
                          })}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {notifications.length > 10 && (
          <>
            <Separator />
            <div className="p-2">
              <Button 
                variant="ghost" 
                className="w-full text-sm"
                onClick={() => navigate('/minha-conta/notificacoes')}
              >
                Ver todas as notificações
              </Button>
            </div>
          </>
        )}
      </PopoverContent>
    </Popover>
  );
};
