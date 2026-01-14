import { useState, useEffect, useRef } from 'react';
import { X, Send, User, Bot, Clock, MessageCircle, Package } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSupportTickets } from '@/hooks/useSupportTickets';
import { useChatMessages } from '@/hooks/useChatMessages';
import { SUPPORT_CATEGORIES } from '@/constants/supportCategories';
import { useAuth } from '@/contexts/AuthContext';

interface ChatInterfaceProps {
  isOpen: boolean;
  onClose: () => void;
}

// Função para extrair botão da mensagem
function extractButton(content: string) {
  const buttonRegex = /\[BUTTON:(.*?):(.*?)\]/;
  const match = content.match(buttonRegex);
  
  if (match) {
    return {
      text: content.replace(match[0], '').trim(),
      button: {
        text: match[1],
        url: match[2]
      }
    };
  }
  
  return { text: content, button: null };
}

export default function ChatInterface({ isOpen, onClose }: ChatInterfaceProps) {
  const [message, setMessage] = useState('');
  const [currentTicketId, setCurrentTicketId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [showCategorySelector, setShowCategorySelector] = useState(false);
  const [isCreatingTicket, setIsCreatingTicket] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  const { tickets, createTicket } = useSupportTickets();
  const { messages, sending, sendMessage } = useChatMessages(currentTicketId);
  const { profile } = useAuth();
  const navigate = useNavigate();

  // Buscar ticket existente ou mostrar seletor de categoria
  useEffect(() => {
    if (isOpen && !currentTicketId) {
      const openTicket = tickets.find(t => t.status !== 'closed' && t.status !== 'resolved');
      
      if (openTicket) {
        setCurrentTicketId(openTicket.id);
        setShowCategorySelector(false);
      } else {
        setShowCategorySelector(true);
      }
    }
  }, [isOpen, tickets, currentTicketId]);

  // Auto scroll para última mensagem
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const handleCategorySelect = async (categoryId: string) => {
    setSelectedCategory(categoryId);
    setIsCreatingTicket(true);
    
    const category = SUPPORT_CATEGORIES.find(c => c.id === categoryId);
    const newTicket = await createTicket(category?.label || 'Atendimento via Chat');
    
    if (newTicket) {
      setCurrentTicketId(newTicket.id);
      setShowCategorySelector(false);
      
      // Mensagem inicial automática da IA contextualizando a categoria
      setTimeout(() => {
        sendMessage(`Olá! Vi que você precisa de ajuda com ${category?.label}. Como posso ajudar?`);
      }, 500);
    }
    
    setIsCreatingTicket(false);
  };

  const filteredCategories = SUPPORT_CATEGORIES.filter(cat => 
    cat.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cat.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleSend = async () => {
    if (!message.trim() || sending) return;

    const messageToSend = message;
    setMessage('');
    await sendMessage(messageToSend);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (!isOpen) return null;

  const currentTicket = tickets.find(t => t.id === currentTicketId);

  return (
    <Card className="fixed bottom-24 right-6 z-50 w-[400px] h-[600px] shadow-2xl flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground">
        <div className="flex items-center gap-2">
          <MessageCircle className="h-5 w-5" />
          <div>
            <h3 className="font-semibold">Suporte ao Cliente</h3>
            <p className="text-xs opacity-90">Resposta instantânea com IA</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-primary-foreground hover:bg-primary-foreground/20"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Seletor de categoria (primeira interação) */}
      {showCategorySelector ? (
        <ScrollArea className="flex-1">
          <div className="p-6 space-y-6">
            <div className="text-center space-y-3">
              <h4 className="font-semibold text-lg">Como podemos ajudar?</h4>
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" />
                <span>Tempo médio de resposta: 2 minutos</span>
              </div>
              <Badge variant="secondary" className="mt-2">
                <Bot className="h-3 w-3 mr-1" />
                IA responde instantaneamente
              </Badge>
            </div>

            {/* Busca rápida */}
            <Input
              placeholder="Buscar por assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
            
            {/* Grid de botões de categorias */}
            <div className="grid grid-cols-2 gap-3">
              {filteredCategories.map((category) => {
                const Icon = category.icon;
                return (
                  <Button
                    key={category.id}
                    variant="outline"
                    className="h-auto p-4 flex flex-col items-start gap-2 hover:bg-accent hover:scale-[1.02] transition-all"
                    onClick={() => handleCategorySelect(category.id)}
                    disabled={isCreatingTicket}
                  >
                    <Icon className="h-6 w-6" style={{ color: category.color }} />
                    <div className="text-left">
                      <div className="font-semibold text-sm">{category.label}</div>
                      <div className="text-xs text-muted-foreground line-clamp-2">
                        {category.description}
                      </div>
                    </div>
                  </Button>
                );
              })}
            </div>

            {/* Ações Rápidas */}
            <div className="pt-4 border-t space-y-3">
              <p className="text-sm font-medium">Ações Rápidas</p>
              <div className="flex flex-col gap-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start hover:bg-accent" 
                  asChild
                  onClick={() => onClose()}
                >
                  <Link to="/customer/orders">
                    <Package className="h-4 w-4 mr-2" />
                    Ver meus pedidos
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start hover:bg-accent" 
                  asChild
                  onClick={() => onClose()}
                >
                  <Link to="/rastrear-pedido">
                    <Package className="h-4 w-4 mr-2" />
                    Rastrear meu pedido
                  </Link>
                </Button>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="justify-start hover:bg-accent" 
                  asChild
                  onClick={() => onClose()}
                >
                  <Link to="/minha-conta/academy">
                    <Bot className="h-4 w-4 mr-2" />
                    Acessar Academia
                  </Link>
                </Button>
                {profile?.role === 'reseller' && (
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="justify-start hover:bg-accent" 
                    asChild
                    onClick={() => onClose()}
                  >
                    <Link to="/reseller/financeiro">
                      <Clock className="h-4 w-4 mr-2" />
                      Ver minhas comissões
                    </Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </ScrollArea>
      ) : (
        <>
          {/* Status do Ticket */}
          {currentTicket && (
            <div className="px-4 py-2 border-b bg-muted/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">Status:</span>
              </div>
              <Badge variant={
                currentTicket.status === 'waiting_admin' ? 'default' : 
                currentTicket.status === 'resolved' ? 'secondary' : 'outline'
              }>
                {currentTicket.status === 'open' && 'Aberto'}
                {currentTicket.status === 'waiting_customer' && 'Aguardando sua resposta'}
                {currentTicket.status === 'waiting_admin' && 'Aguardando atendente'}
                {currentTicket.status === 'resolved' && 'Resolvido'}
                {currentTicket.status === 'closed' && 'Fechado'}
              </Badge>
            </div>
          )}

      {/* Mensagens */}
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
            <Bot className="h-12 w-12 mb-4 opacity-50" />
            <p className="text-sm">Olá! Como posso ajudar você hoje?</p>
            <p className="text-xs mt-2">Nossa IA responde instantaneamente</p>
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender_type === 'customer' ? 'flex-row-reverse' : ''
                }`}
              >
                <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${
                  msg.sender_type === 'customer' 
                    ? 'bg-primary text-primary-foreground' 
                    : msg.sender_type === 'ai'
                    ? 'bg-blue-500 text-white'
                    : 'bg-green-500 text-white'
                }`}>
                  {msg.sender_type === 'customer' ? (
                    <User className="h-4 w-4" />
                  ) : (
                    <Bot className="h-4 w-4" />
                  )}
                </div>
                <div className={`flex-1 ${msg.sender_type === 'customer' ? 'text-right' : ''}`}>
                  {(() => {
                    const { text, button } = extractButton(msg.content);
                    return (
                      <>
                        <div className={`inline-block px-4 py-2 rounded-lg max-w-[85%] ${
                          msg.sender_type === 'customer'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        }`}>
                          {msg.sender_type === 'ai' || msg.sender_type === 'admin' ? (
                            <div className="text-sm prose prose-sm max-w-none prose-p:my-1 prose-strong:font-semibold prose-a:no-underline">
                              <ReactMarkdown
                                components={{
                                  a: ({ node, ...props }) => {
                                    // Se o link é de aula, renderizar como botão
                                    if (props.href?.startsWith('/minha-conta/aula/')) {
                                      return (
                                        <Button
                                          asChild
                                          size="sm"
                                          className="w-full mt-2 mb-1"
                                          variant="default"
                                        >
                                          <a href={props.href} onClick={(e) => { e.preventDefault(); window.location.href = props.href!; }}>
                                            {props.children} 🎓
                                          </a>
                                        </Button>
                                      );
                                    }
                                    // Links normais
                                    return <a className="text-blue-600 underline hover:text-blue-700" target="_blank" rel="noopener noreferrer" {...props} />;
                                  },
                                  p: ({ node, ...props }) => <p className="whitespace-pre-wrap break-words" {...props} />,
                                  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />
                                }}
                              >
                                {text}
                              </ReactMarkdown>
                            </div>
                          ) : (
                            <p className="text-sm whitespace-pre-wrap">{text}</p>
                          )}
                        </div>
                        
                        {/* Renderizar botão customizado se houver */}
                        {button && (
                          <div className={msg.sender_type === 'customer' ? 'text-right' : ''}>
                            <Button
                              size="sm"
                              className="mt-2 inline-block"
                              onClick={() => {
                                if (button.url.startsWith('http')) {
                                  window.open(button.url, '_blank');
                                } else {
                                  navigate(button.url);
                                  onClose();
                                }
                              }}
                            >
                              {button.text}
                            </Button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                  <p className="text-xs text-muted-foreground mt-1">
                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-3">
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-blue-500 text-white flex items-center justify-center">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-muted px-4 py-2 rounded-lg">
                  <div className="flex gap-1">
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            placeholder="Digite sua mensagem..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button
            onClick={handleSend}
            disabled={!message.trim() || sending}
            size="icon"
          >
            <Send className="h-4 w-4" />
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-2 text-center">
          Pressione Enter para enviar
        </p>
      </div>
      </>
      )}
    </Card>
  );
}
