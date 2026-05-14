import { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  MessageSquare, RefreshCw, Send, ShoppingBag,
  CheckCircle2, Clock, Search, ChevronRight
} from 'lucide-react';
import { format, formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuestions, usePacks, usePackMessages, type MlQuestion, type MlPack } from '@/hooks/useMlMessages';
import { useMercadoLivreIntegration } from '@/hooks/useMercadoLivreIntegration';

// ── Respostas rápidas ─────────────────────────────────────────────────────────
const QUICK_REPLIES = [
  'Sim, temos disponível!',
  'Produto novo, com garantia do fabricante.',
  'Enviamos via Correios com código de rastreamento.',
  'O prazo de entrega é de 3 a 7 dias úteis.',
  'Aceitamos cartão, PIX e boleto.',
  'Trabalhamos com nota fiscal.',
];

// ── Aba de Perguntas ──────────────────────────────────────────────────────────

function QuestionsTab({ resellerUserId }: { resellerUserId?: string }) {
  const [filter, setFilter] = useState<'UNANSWERED' | 'ANSWERED' | 'all'>('UNANSWERED');
  const [search, setSearch] = useState('');
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const { questions, isLoading, refetch, answerQuestion, isAnswering } = useQuestions(filter, resellerUserId);

  const filtered = questions.filter(q =>
    !search || q.text.toLowerCase().includes(search.toLowerCase()) || q.item_title?.toLowerCase().includes(search.toLowerCase())
  );

  function setAnswer(id: number, text: string) {
    setAnswers(prev => ({ ...prev, [id]: text }));
  }

  async function handleAnswer(q: MlQuestion) {
    const text = answers[q.id]?.trim();
    if (!text) return;
    await answerQuestion(q.id, text);
    setAnswers(prev => { const n = { ...prev }; delete n[q.id]; return n; });
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-3 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar pergunta ou produto..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <Select value={filter} onValueChange={(v: any) => setFilter(v)}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="UNANSWERED">Sem resposta</SelectItem>
            <SelectItem value="ANSWERED">Respondidas</SelectItem>
            <SelectItem value="all">Todas</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isLoading}>
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <CheckCircle2 className="h-10 w-10 mx-auto mb-2 opacity-40" />
          <p>Nenhuma pergunta {filter === 'UNANSWERED' ? 'sem resposta' : ''} encontrada.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map(q => (
            <Card key={q.id} className={q.status === 'UNANSWERED' ? 'border-amber-300' : ''}>
              <CardContent className="p-4">
                <div className="flex gap-3">
                  {/* Thumbnail do produto */}
                  <div className="flex-shrink-0">
                    {q.item_thumbnail ? (
                      <img src={q.item_thumbnail} alt="" className="w-14 h-14 object-cover rounded" />
                    ) : (
                      <div className="w-14 h-14 bg-muted rounded flex items-center justify-center">
                        <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    {/* Produto + data */}
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-xs text-muted-foreground truncate">{q.item_title ?? q.item_id}</p>
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {q.status === 'UNANSWERED' ? (
                          <Badge className="bg-amber-100 text-amber-800 text-xs gap-1">
                            <Clock className="h-2.5 w-2.5" />Sem resposta
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-green-700 border-green-400 text-xs gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" />Respondida
                          </Badge>
                        )}
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDistanceToNow(new Date(q.date_created), { locale: ptBR, addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    {/* Pergunta */}
                    <p className="text-sm font-medium mb-2">"{q.text}"</p>

                    {/* Resposta existente */}
                    {q.answer && (
                      <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                        <p className="text-xs text-green-700 font-medium mb-0.5">Sua resposta:</p>
                        <p className="text-sm text-green-900">{q.answer.text}</p>
                      </div>
                    )}

                    {/* Campo de resposta (só para sem resposta) */}
                    {q.status === 'UNANSWERED' && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Digite sua resposta..."
                          className="text-sm min-h-[70px]"
                          value={answers[q.id] ?? ''}
                          onChange={e => setAnswer(q.id, e.target.value)}
                        />
                        {/* Respostas rápidas */}
                        <div className="flex flex-wrap gap-1">
                          {QUICK_REPLIES.slice(0, 3).map(r => (
                            <Button key={r} size="sm" variant="outline" className="text-xs h-6 px-2"
                              onClick={() => setAnswer(q.id, r)}>
                              {r.substring(0, 30)}…
                            </Button>
                          ))}
                        </div>
                        <div className="flex justify-end">
                          <Button
                            size="sm"
                            disabled={!answers[q.id]?.trim() || isAnswering}
                            onClick={() => handleAnswer(q)}
                            className="gap-1"
                          >
                            <Send className="h-3 w-3" />
                            {isAnswering ? 'Enviando...' : 'Responder'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Chat de uma conversa ──────────────────────────────────────────────────────

function PackChat({ pack, mlUserId, resellerUserId }: { pack: MlPack; mlUserId: number; resellerUserId?: string }) {
  const { messages, isLoading, sendMessage, isSending } = usePackMessages(pack.id, resellerUserId);
  const [text, setText] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  async function handleSend() {
    if (!text.trim() || isSending) return;
    const t = text.trim();
    setText('');
    await sendMessage(t);
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b bg-muted/30">
        <p className="font-medium text-sm">{pack.buyer?.nickname ?? 'Comprador'}</p>
        <p className="text-xs text-muted-foreground">
          Pack #{pack.id} · {pack.orders?.length ?? 0} pedido(s)
        </p>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="space-y-3">{[...Array(4)].map((_, i) => <Skeleton key={i} className="h-12 w-3/4" />)}</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground text-sm">
            Nenhuma mensagem ainda. Inicie a conversa!
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map(msg => {
              const isMine = msg.from?.user_id === mlUserId;
              return (
                <div key={msg.id} className={`flex gap-2 ${isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                  <Avatar className="w-7 h-7 flex-shrink-0">
                    <AvatarFallback className="text-xs">
                      {isMine ? 'Eu' : (pack.buyer?.nickname?.[0] ?? 'C')}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[75%] rounded-lg px-3 py-2 text-sm ${isMine ? 'bg-primary text-primary-foreground ml-auto' : 'bg-muted'}`}>
                    <p>{msg.text?.plain}</p>
                    <p className={`text-[10px] mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                      {msg.message_date?.received
                        ? formatDistanceToNow(new Date(msg.message_date.received), { locale: ptBR, addSuffix: true })
                        : ''}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t flex gap-2">
        <Textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Digite sua mensagem..."
          className="min-h-[60px] text-sm resize-none"
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
        />
        <Button className="self-end" onClick={handleSend} disabled={!text.trim() || isSending}>
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ── Aba de Mensagens Pós-Venda ────────────────────────────────────────────────

function MessagesTab({ resellerUserId }: { resellerUserId?: string }) {
  const { data: packs = [], isLoading } = usePacks(resellerUserId);
  const [selectedPack, setSelectedPack] = useState<MlPack | null>(null);
  const [mlUserId, setMlUserId] = useState<number | null>(null);
  const { user } = useMercadoLivreIntegration();

  // Buscar ml_user_id uma vez
  useEffect(() => {
    import('@/integrations/supabase/client').then(({ supabase }) => {
      const uid = resellerUserId ?? user?.id;
      if (!uid) return;
      supabase
        .from('mercadolivre_integrations')
        .select('ml_user_id')
        .eq('user_id', uid)
        .single()
        .then(({ data }) => setMlUserId(data?.ml_user_id ?? null));
    });
  }, [resellerUserId, user?.id]);

  if (isLoading) return <div className="space-y-2">{[...Array(5)].map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>;

  if (packs.length === 0) return (
    <div className="text-center py-12 text-muted-foreground">
      <MessageSquare className="h-10 w-10 mx-auto mb-2 opacity-40" />
      <p>Nenhuma conversa pós-venda ativa.</p>
    </div>
  );

  return (
    <div className="flex gap-4 h-[600px]">
      {/* Lista de packs */}
      <div className="w-64 flex-shrink-0 border rounded-lg overflow-hidden">
        <div className="p-3 bg-muted/30 border-b text-sm font-medium">Conversas ({packs.length})</div>
        <ScrollArea className="h-[550px]">
          {packs.map(pack => (
            <button
              key={pack.id}
              className={`w-full text-left p-3 border-b hover:bg-muted/50 transition-colors flex items-center gap-2 ${selectedPack?.id === pack.id ? 'bg-primary/10' : ''}`}
              onClick={() => setSelectedPack(pack)}
            >
              <Avatar className="w-8 h-8 flex-shrink-0">
                <AvatarFallback className="text-xs">{pack.buyer?.nickname?.[0] ?? 'C'}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{pack.buyer?.nickname ?? 'Comprador'}</p>
                <p className="text-xs text-muted-foreground">Pack #{pack.id}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
            </button>
          ))}
        </ScrollArea>
      </div>

      {/* Chat */}
      <div className="flex-1 border rounded-lg overflow-hidden">
        {selectedPack && mlUserId ? (
          <PackChat pack={selectedPack} mlUserId={mlUserId} resellerUserId={resellerUserId} />
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Selecione uma conversa para ver as mensagens
          </div>
        )}
      </div>
    </div>
  );
}

// ── Página principal ──────────────────────────────────────────────────────────

export default function MlMensagens({ resellerUserId }: { resellerUserId?: string }) {
  const { hasActiveIntegration } = useMercadoLivreIntegration();
  const { unansweredCount } = useQuestions('UNANSWERED', resellerUserId);

  if (!hasActiveIntegration && !resellerUserId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <MessageSquare className="h-12 w-12 text-muted-foreground" />
        <p className="text-muted-foreground">Conecte sua conta do Mercado Livre para ver as mensagens.</p>
        <Button onClick={() => window.location.href = '/reseller/integracoes'}>
          Conectar Mercado Livre
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 text-yellow-500" />
          Mensagens ML
          {unansweredCount > 0 && (
            <Badge className="bg-amber-500 text-white">{unansweredCount}</Badge>
          )}
        </h1>
        <p className="text-muted-foreground text-sm">Perguntas de compradores e mensagens pós-venda</p>
      </div>

      <Tabs defaultValue="questions">
        <TabsList>
          <TabsTrigger value="questions" className="relative">
            Perguntas
            {unansweredCount > 0 && (
              <span className="ml-1.5 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-white leading-none">
                {unansweredCount}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="messages">Pós-Venda</TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-4">
          <QuestionsTab resellerUserId={resellerUserId} />
        </TabsContent>

        <TabsContent value="messages" className="mt-4">
          <MessagesTab resellerUserId={resellerUserId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
