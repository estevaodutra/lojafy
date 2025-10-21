import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { ChatAvatar } from './ChatAvatar';
import { MessageAttachment } from './MessageAttachment';
import { Check, CheckCheck } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender_type: string;
  content: string;
  is_internal: boolean;
  created_at: string;
  sender_id?: string;
  read_at?: string;
  attachments?: any[];
}

interface ChatMessageProps {
  message: ChatMessage;
  customerName?: string;
  customerEmail?: string;
}

export const ChatMessage = ({ message, customerName, customerEmail }: ChatMessageProps) => {
  const isCustomer = message.sender_type === 'customer';
  const isAI = message.sender_type === 'ai';
  const isAdmin = message.sender_type === 'admin';
  const isInternal = message.is_internal;

  // Layout invertido: cliente à ESQUERDA, atendente/IA à DIREITA
  const getMessageClasses = () => {
    if (isInternal) {
      return 'bg-yellow-50 border-l-4 border-yellow-400 text-gray-900';
    }
    if (isCustomer) {
      return 'bg-gray-100 text-gray-900';
    }
    if (isAI) {
      return 'bg-blue-100 text-gray-900';
    }
    return 'bg-blue-500 text-white'; // Admin
  };

  const getSenderLabel = () => {
    if (isInternal) return '📝 Nota Interna';
    if (isAI) return '🤖 Automação';
    if (isAdmin) return 'Atendente';
    return customerName || customerEmail || 'Cliente';
  };

  const showAvatar = isCustomer;
  const alignLeft = isCustomer;

  return (
    <div className={cn(
      'flex mb-3 gap-2',
      alignLeft ? 'justify-start' : 'justify-end'
    )}>
      {/* Avatar à esquerda (apenas para cliente) */}
      {showAvatar && (
        <ChatAvatar
          name={customerName}
          email={customerEmail}
          size="sm"
        />
      )}

      <div className="flex flex-col max-w-[75%]">
        {/* Nome do remetente acima da mensagem */}
        {!isInternal && (
          <span className={cn(
            'text-xs font-medium mb-1 px-1',
            alignLeft ? 'text-left' : 'text-right',
            isAI ? 'text-blue-600' : 'text-gray-600'
          )}>
            {getSenderLabel()}
          </span>
        )}

        {/* Bolha da mensagem */}
        <div className={cn(
          'rounded-2xl p-3 shadow-sm',
          getMessageClasses()
        )}>
          {/* Badge para nota interna */}
          {isInternal && (
            <div className="flex items-center gap-1 mb-2">
              <span className="text-xs font-semibold text-yellow-700">
                {getSenderLabel()}
              </span>
            </div>
          )}

          {/* Conteúdo da mensagem */}
          <p className="text-sm whitespace-pre-wrap break-words">
            {message.content}
          </p>

          {/* Anexos */}
          {message.attachments && message.attachments.length > 0 && (
            <div className="mt-2 space-y-2">
              {message.attachments.map((attachment, index) => (
                <MessageAttachment key={index} attachment={attachment} />
              ))}
            </div>
          )}

          {/* Timestamp e checkmarks */}
          <div className="flex items-center justify-end gap-1 mt-1">
            <span className={cn(
              'text-xs',
              isCustomer ? 'text-gray-500' :
              isInternal ? 'text-yellow-600' :
              isAdmin ? 'text-white/70' :
              'text-gray-500'
            )}>
              {format(new Date(message.created_at), 'HH:mm', { locale: ptBR })}
            </span>
            {/* Checkmarks para mensagens do atendente/IA */}
            {(isAdmin || isAI) && !isInternal && (
              <span className={cn(
                'text-xs',
                isAdmin ? 'text-white/70' : 'text-gray-500'
              )}>
                {message.read_at ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
