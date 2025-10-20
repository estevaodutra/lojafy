import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';

interface ChatMessage {
  id: string;
  sender_type: string;
  content: string;
  is_internal: boolean;
  created_at: string;
}

interface ChatMessageProps {
  message: ChatMessage;
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAdmin = message.sender_type === 'admin';
  const isInternal = message.is_internal;

  // Define colors based on message type
  const getMessageClasses = () => {
    if (isInternal) {
      return 'bg-yellow-100 border-l-4 border-yellow-500';
    }
    if (isCustomer) {
      return 'bg-green-500 text-white';
    }
    if (isAI) {
      return 'bg-blue-100 text-gray-900';
    }
    return 'bg-gray-700 text-white'; // Admin
  };

  const getSenderLabel = () => {
    if (isInternal) return '📝 Nota Interna';
    if (isAI) return '🤖 IA';
    if (isAdmin) return '👨‍💼 Admin';
    return '👤 Cliente';
  };

  return (
    <div className={cn(
      'flex mb-3',
      isCustomer ? 'justify-end' : 'justify-start'
    )}>
      <div className={cn(
        'rounded-2xl p-3 max-w-[75%] shadow-sm',
        getMessageClasses()
      )}>
        {/* Sender badge - only show for non-customer messages */}
        {!isCustomer && (
          <div className="flex items-center gap-1 mb-1">
            <span className={cn(
              'text-xs font-semibold',
              isInternal ? 'text-yellow-700' :
              isAI ? 'text-blue-600' :
              'text-white'
            )}>
              {getSenderLabel()}
            </span>
          </div>
        )}
        
        {/* Message content */}
        <p className="text-sm whitespace-pre-wrap break-words">
          {message.content}
        </p>
        
        {/* Timestamp */}
        <div className="flex items-center justify-end gap-1 mt-1">
          <span className={cn(
            'text-xs',
            isCustomer ? 'text-white opacity-70' :
            isInternal ? 'text-yellow-600' :
            'text-gray-500'
          )}>
            {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
          </span>
        </div>
      </div>
    </div>
  );
};
