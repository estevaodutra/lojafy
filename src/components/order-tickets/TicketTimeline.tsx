import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { User, Bot, Store, Truck, ShieldCheck } from 'lucide-react';
import type { OrderTicketMessage, TicketAuthorType } from '@/types/orderTickets';
import { AUTHOR_TYPE_LABELS } from '@/types/orderTickets';
import { useAuth } from '@/contexts/AuthContext';

interface TicketTimelineProps {
  messages: OrderTicketMessage[];
  isLoading?: boolean;
  className?: string;
}

const authorIcons: Record<TicketAuthorType, typeof User> = {
  cliente: User,
  revendedor: Store,
  fornecedor: Truck,
  superadmin: ShieldCheck,
  sistema: Bot,
};

const authorColors: Record<TicketAuthorType, string> = {
  cliente: 'bg-blue-100 text-blue-700',
  revendedor: 'bg-purple-100 text-purple-700',
  fornecedor: 'bg-amber-100 text-amber-700',
  superadmin: 'bg-emerald-100 text-emerald-700',
  sistema: 'bg-gray-100 text-gray-700',
};

export const TicketTimeline = ({ messages, isLoading, className }: TicketTimelineProps) => {
  const { user } = useAuth();

  if (isLoading) {
    return (
      <div className="space-y-4 p-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-20 w-full rounded-lg" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (messages.length === 0) {
    return (
      <div className="flex items-center justify-center h-32 text-muted-foreground">
        Nenhuma mensagem ainda
      </div>
    );
  }

  return (
    <ScrollArea className={cn('h-[400px] pr-4', className)}>
      <div className="space-y-4 p-1">
        {messages.map((message, index) => {
          const isOwnMessage = message.author_id === user?.id;
          const Icon = authorIcons[message.author_type];
          const colorClass = authorColors[message.author_type];

          return (
            <div
              key={message.id}
              className={cn(
                'flex gap-3',
                isOwnMessage && 'flex-row-reverse'
              )}
            >
              {/* Avatar */}
              <Avatar className="h-9 w-9 shrink-0">
                {message.author?.avatar_url ? (
                  <AvatarImage src={message.author.avatar_url} />
                ) : null}
                <AvatarFallback className={colorClass}>
                  <Icon className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>

              {/* Message bubble */}
              <div className={cn('flex-1 max-w-[80%]', isOwnMessage && 'flex flex-col items-end')}>
                {/* Author info */}
                <div className={cn(
                  'flex items-center gap-2 mb-1',
                  isOwnMessage && 'flex-row-reverse'
                )}>
                  <span className="text-sm font-medium">
                    {isOwnMessage ? 'Você' : (
                      message.author 
                        ? `${message.author.first_name} ${message.author.last_name}`
                        : AUTHOR_TYPE_LABELS[message.author_type]
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(message.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                  </span>
                </div>

                {/* Message content */}
                <div
                  className={cn(
                    'rounded-lg p-3 text-sm',
                    isOwnMessage 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-muted',
                    message.author_type === 'sistema' && 'bg-muted/50 italic text-muted-foreground border border-dashed'
                  )}
                >
                  {message.is_internal && (
                    <span className="text-xs font-medium text-amber-500 block mb-1">
                      [Nota interna]
                    </span>
                  )}
                  <p className="whitespace-pre-wrap">{message.message}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </ScrollArea>
  );
};
