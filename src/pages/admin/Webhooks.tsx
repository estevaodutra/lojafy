import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Send, 
  Copy, 
  Check, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Eye, 
  FileJson, 
  ExternalLink, 
  HelpCircle, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Webhook as WebhookIcon, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { useRegisteredWebhooks, RegisteredWebhook } from '@/hooks/useRegisteredWebhooks';
import { WEBHOOK_EVENTS_CATALOG, WebhookEventMeta } from '@/data/webhookEventsCatalog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export const Webhooks: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    webhooks,
    loading,
    saving,
    createWebhook,
    updateWebhook,
    toggleActive,
    deleteWebhook,
    testWebhook,
  } = useRegisteredWebhooks();

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<RegisteredWebhook | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['user.created']);
  const [testingFormUrl, setTestingFormUrl] = useState(false);

  // Payload Preview Modal State
  const [previewPayload, setPreviewPayload] = useState<WebhookEventMeta | null>(null);

  // Delete Confirmation State
  const [webhookToDelete, setWebhookToDelete] = useState<RegisteredWebhook | null>(null);

  // Single Webhook Testing State
  const [testingId, setTestingId] = useState<string | null>(null);

  // Generate random token like in image (e.g. cex4v5mllbv or whsec_...)
  const generateRandomToken = () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let res = '';
    for (let i = 0; i < 11; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return res;
  };

  // Open modal for Create
  const handleOpenCreateModal = () => {
    setEditingWebhook(null);
    setFormName('');
    setFormUrl('');
    setFormToken(generateRandomToken());
    setFormEvents(['user.created']);
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (webhook: RegisteredWebhook) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormToken(webhook.token || generateRandomToken());
    setFormEvents(webhook.events || []);
    setIsModalOpen(true);
  };

  // Select all / Deselect all
  const handleToggleSelectAllEvents = () => {
    if (formEvents.length === WEBHOOK_EVENTS_CATALOG.length) {
      setFormEvents([]);
    } else {
      setFormEvents(WEBHOOK_EVENTS_CATALOG.map(e => e.eventType));
    }
  };

  // Toggle single event checkbox
  const handleToggleEvent = (eventType: string) => {
    if (formEvents.includes(eventType)) {
      setFormEvents(formEvents.filter(e => e !== eventType));
    } else {
      setFormEvents([...formEvents, eventType]);
    }
  };

  // Test URL inside modal
  const handleTestUrlInModal = async () => {
    if (!formUrl.trim()) {
      toast({
        title: 'URL obrigatória',
        description: 'Digite uma URL para realizar o teste.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setTestingFormUrl(true);
      const testEvent = formEvents[0] || 'user.created';
      await testWebhook(formUrl.trim(), testEvent, formToken);
    } finally {
      setTestingFormUrl(false);
    }
  };

  // Save (Create or Update)
  const handleSaveForm = async () => {
    if (!formName.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Por favor, informe um nome para identificar o webhook.',
        variant: 'destructive',
      });
      return;
    }

    if (!formUrl.trim()) {
      toast({
        title: 'URL obrigatória',
        description: 'Por favor, insira a URL de destino do webhook.',
        variant: 'destructive',
      });
      return;
    }

    if (formEvents.length === 0) {
      toast({
        title: 'Selecione ao menos um evento',
        description: 'Marque ao menos um evento para este webhook escutar.',
        variant: 'destructive',
      });
      return;
    }

    if (editingWebhook) {
      const ok = await updateWebhook(editingWebhook.id, {
        name: formName.trim(),
        url: formUrl.trim(),
        token: formToken.trim(),
        events: formEvents,
      });
      if (ok) setIsModalOpen(false);
    } else {
      const ok = await createWebhook({
        name: formName.trim(),
        url: formUrl.trim(),
        token: formToken.trim(),
        events: formEvents,
        active: true,
      });
      if (ok) setIsModalOpen(false);
    }
  };

  // Test saved webhook card
  const handleTestCardWebhook = async (webhook: RegisteredWebhook) => {
    try {
      setTestingId(webhook.id);
      const testEvent = webhook.events[0] || 'user.created';
      await testWebhook(webhook.url, testEvent, webhook.token, webhook.id);
    } finally {
      setTestingId(null);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: 'Copiado!',
      description: `${label} copiado para a área de transferência.`,
    });
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate('/super-admin/apps')} 
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Apps</span>
          </button>
          <span>/</span>
          <span className="text-foreground font-medium">Webhooks</span>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>Webhooks</span>
            </h1>
            <p className="text-muted-foreground mt-1 text-sm sm:text-base">
              Crie webhooks para receber notificações em tempo real e conecte múltiplos serviços com os mesmos eventos.
            </p>
          </div>

          <Button 
            onClick={handleOpenCreateModal}
            className="bg-[#5B47FB] hover:bg-[#4C39EC] text-white gap-2 font-medium shadow-sm h-10 px-4"
          >
            <Plus className="h-4 w-4" />
            Criar webhook
          </Button>
        </div>
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Carregando webhooks...</p>
          </div>
        ) : webhooks.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 border border-dashed rounded-2xl bg-card/60 p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <WebhookIcon className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-semibold text-lg text-foreground">Nenhum webhook cadastrado</h3>
              <p className="text-sm text-muted-foreground">
                Crie um novo webhook para começar a transmitir os eventos da Lojafy (como Usuário Criado e Pedido Pago) para automações no n8n, CRM ou planilhas.
              </p>
            </div>
            <Button 
              onClick={handleOpenCreateModal}
              className="bg-[#5B47FB] hover:bg-[#4C39EC] text-white gap-2 text-sm mt-2"
            >
              <Plus className="h-4 w-4" />
              Criar meu primeiro webhook
            </Button>
          </div>
        ) : (
          /* Cards List */
          <div className="grid grid-cols-1 gap-4">
            {webhooks.map((wh) => (
              <Card 
                key={wh.id}
                className="border border-border/80 shadow-sm hover:shadow transition-all bg-card"
              >
                <CardContent className="p-5 space-y-4">
                  {/* Card Header: Name + Switch */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b pb-3">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-lg text-foreground">{wh.name}</span>
                        <Badge variant="outline" className="text-xs font-normal text-muted-foreground">
                          {wh.events.length} {wh.events.length === 1 ? 'evento' : 'eventos'}
                        </Badge>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={wh.active}
                          onCheckedChange={() => toggleActive(wh.id)}
                        />
                        <span className="text-xs font-medium">
                          {wh.active ? (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ativo</span>
                          ) : (
                            <span className="text-muted-foreground">Inativo</span>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* URL & Token Info */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">URL de Destino:</span>
                      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg font-mono text-xs overflow-hidden">
                        <span className="truncate flex-1" title={wh.url}>{wh.url}</span>
                        <button 
                          onClick={() => copyToClipboard(wh.url, 'URL')}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Copiar URL"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <span className="text-muted-foreground font-medium">Token Secreto:</span>
                      <div className="flex items-center gap-2 bg-muted/50 p-2 rounded-lg font-mono text-xs">
                        <span className="truncate flex-1">{wh.token}</span>
                        <button 
                          onClick={() => copyToClipboard(wh.token, 'Token')}
                          className="text-muted-foreground hover:text-foreground shrink-0"
                          title="Copiar Token"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Events Badges */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Eventos que acionam este webhook:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {wh.events.map(evKey => {
                        const meta = WEBHOOK_EVENTS_CATALOG.find(e => e.eventType === evKey);
                        return (
                          <Badge 
                            key={evKey}
                            variant="secondary"
                            className="text-xs font-normal py-0.5 gap-1.5 cursor-pointer hover:bg-secondary/80"
                            onClick={() => meta && setPreviewPayload(meta)}
                            title="Clique para visualizar o payload deste evento"
                          >
                            <span>{meta?.title || evKey}</span>
                            <Eye className="h-3 w-3 text-muted-foreground" />
                          </Badge>
                        );
                      })}
                    </div>
                  </div>

                  {/* Delivery Info & Actions */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t text-xs">
                    <div className="text-muted-foreground flex items-center gap-2">
                      {wh.last_triggered_at ? (
                        <>
                          <Clock className="h-3.5 w-3.5" />
                          <span>
                            Último envio: {format(new Date(wh.last_triggered_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                          </span>
                          {wh.last_status_code && (
                            <Badge 
                              variant={wh.last_status_code >= 200 && wh.last_status_code < 300 ? 'default' : 'destructive'}
                              className={wh.last_status_code >= 200 && wh.last_status_code < 300 ? 'bg-emerald-600 text-white text-[10px]' : 'text-[10px]'}
                            >
                              {wh.last_status_code} {wh.last_status_code >= 200 && wh.last_status_code < 300 ? 'OK' : 'Erro'}
                            </Badge>
                          )}
                        </>
                      ) : (
                        <span className="italic">Nenhum envio registrado ainda</span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-auto">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleTestCardWebhook(wh)}
                        disabled={testingId === wh.id}
                        className="h-8 text-xs gap-1.5"
                      >
                        {testingId === wh.id ? (
                          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Send className="h-3.5 w-3.5" />
                        )}
                        <span>Testar</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleOpenEditModal(wh)}
                        className="h-8 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
                      >
                        <Edit2 className="h-3.5 w-3.5" />
                        <span>Editar</span>
                      </Button>

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setWebhookToDelete(wh)}
                        className="h-8 text-xs gap-1.5 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                        <span>Excluir</span>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Criar / Editar Webhook (matching user screenshot) */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4">
          <DialogHeader className="pb-2 border-b">
            <DialogTitle className="text-xl font-bold text-slate-900 dark:text-white">
              {editingWebhook ? 'Editar webhook' : 'Criar webhook'}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 text-sm">
            {/* Field: Nome */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Nome
              </label>
              <Input
                placeholder="Ex: Integração n8n, CRM de Leads..."
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
                className="h-10 text-sm"
              />
            </div>

            {/* Field: URL do Webhook */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                URL do Webhook
              </label>
              <Input
                placeholder="https://example.com/api/pbd/?u=5df7741ff..."
                value={formUrl}
                onChange={(e) => setFormUrl(e.target.value)}
                className="font-mono text-xs h-10"
              />

              {/* Botão Testar Webhook abaixo da URL */}
              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestUrlInModal}
                  disabled={testingFormUrl || !formUrl.trim()}
                  className="h-8 text-xs gap-1.5 text-slate-700 dark:text-slate-200"
                >
                  {testingFormUrl ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : null}
                  <span>Testar Webhook</span>
                </Button>
              </div>
            </div>

            {/* Field: Token */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">
                Token
              </label>
              <div className="flex gap-2">
                <Input
                  value={formToken}
                  readOnly
                  className="font-mono text-xs h-10 bg-muted/40"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => setFormToken(generateRandomToken())}
                  title="Gerar novo token"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className="h-10 w-10 shrink-0"
                  onClick={() => copyToClipboard(formToken, 'Token')}
                  title="Copiar token"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Banner Informativo azul (matching screenshot) */}
            <div className="bg-[#EEF2FF] dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50 p-3 rounded-lg flex items-center gap-2.5 text-xs text-[#3730A3] dark:text-indigo-300">
              <HelpCircle className="h-4 w-4 shrink-0 text-[#4F46E5]" />
              <span>Aprenda mais sobre os webhooks e como autenticar requisições usando o token secreto.</span>
            </div>

            {/* Field: Evento com Selecionar Todos */}
            <div className="space-y-2 pt-2 border-t">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">
                  Evento
                </label>
                <button
                  type="button"
                  onClick={handleToggleSelectAllEvents}
                  className="text-xs text-[#4F46E5] hover:underline font-medium"
                >
                  {formEvents.length === WEBHOOK_EVENTS_CATALOG.length 
                    ? '(Desmarcar todos)' 
                    : '(Selecionar todos)'}
                </button>
              </div>

              {/* Checkboxes List */}
              <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
                {WEBHOOK_EVENTS_CATALOG.map((ev) => {
                  const isChecked = formEvents.includes(ev.eventType);

                  return (
                    <div 
                      key={ev.eventType} 
                      className={`flex items-center justify-between p-2 rounded-lg border transition-colors ${
                        isChecked ? 'bg-primary/5 border-primary/30' : 'border-border/60 hover:bg-muted/40'
                      }`}
                    >
                      <label 
                        htmlFor={`check-${ev.eventType}`} 
                        className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-foreground flex-1"
                      >
                        <Checkbox
                          id={`check-${ev.eventType}`}
                          checked={isChecked}
                          onCheckedChange={() => handleToggleEvent(ev.eventType)}
                        />
                        <span>{ev.title}</span>
                        {ev.eventType === 'user.created' && (
                          <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1.5 py-0 font-medium">
                            user.created
                          </Badge>
                        )}
                      </label>

                      {/* Botão Visualizar Payload */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setPreviewPayload(ev);
                        }}
                        className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted"
                        title="Visualizar payload do documento que vai ser enviado"
                      >
                        <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                        <span className="text-[11px]">Ver payload</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="flex flex-row justify-end gap-2 pt-3 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsModalOpen(false)}
              className="text-xs h-9 px-4"
            >
              Cancelar
            </Button>

            <Button
              type="button"
              onClick={handleSaveForm}
              disabled={saving}
              className="bg-[#5B47FB] hover:bg-[#4C39EC] text-white text-xs h-9 px-5 font-medium"
            >
              {saving ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin mr-1.5" />
              ) : null}
              <span>{editingWebhook ? 'Salvar alterações' : 'Criar'}</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Visualizar Payload (JSON) */}
      <Dialog open={!!previewPayload} onOpenChange={(open) => !open && setPreviewPayload(null)}>
        {previewPayload && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-[#5B47FB]" />
                <DialogTitle className="text-lg">
                  Payload: {previewPayload.title}
                </DialogTitle>
              </div>
              <DialogDescription className="font-mono text-xs">
                Evento: <code>{previewPayload.eventType}</code>
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                Este é o modelo exato do documento JSON que será enviado via POST para a URL configurada quando este evento ocorrer:
              </p>
              <div className="relative">
                <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto max-h-80 font-mono leading-relaxed">
                  {JSON.stringify(previewPayload.samplePayload, null, 2)}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 h-7 px-2.5 text-[11px] gap-1 shadow-sm"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(previewPayload.samplePayload, null, 2));
                    toast({ title: 'JSON copiado para a área de transferência!' });
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar JSON
                </Button>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => setPreviewPayload(null)}>
                Fechar
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>

      {/* Confirmation Modal for Delete */}
      <Dialog open={!!webhookToDelete} onOpenChange={(open) => !open && setWebhookToDelete(null)}>
        {webhookToDelete && (
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="text-base text-red-600 flex items-center gap-2">
                <AlertCircle className="h-5 w-5" />
                Excluir webhook
              </DialogTitle>
              <DialogDescription className="text-xs pt-1">
                Tem certeza que deseja excluir o webhook <strong>"{webhookToDelete.name}"</strong>? Ele deixará de receber notificações imediatamente.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="gap-2 pt-2">
              <Button variant="outline" size="sm" onClick={() => setWebhookToDelete(null)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={async () => {
                  await deleteWebhook(webhookToDelete.id);
                  setWebhookToDelete(null);
                }}
              >
                Excluir
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Webhooks;
