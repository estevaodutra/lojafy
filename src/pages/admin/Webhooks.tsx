import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Plus, 
  Send, 
  Copy, 
  RefreshCw, 
  Edit2, 
  Trash2, 
  Eye, 
  FileJson, 
  HelpCircle, 
  Clock, 
  Webhook as WebhookIcon, 
  AlertCircle,
  Users,
  Package,
  Boxes,
  Truck,
  ShoppingCart,
  DollarSign,
  FileText,
  GraduationCap,
  MessageSquare,
  Search,
  CheckCheck
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useRegisteredWebhooks, RegisteredWebhook } from '@/hooks/useRegisteredWebhooks';
import { 
  WEBHOOK_GROUPS, 
  WEBHOOK_EVENTS_CATALOG, 
  WebhookEventMeta, 
  WebhookGroupId 
} from '@/data/webhookEventsCatalog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

// Helper to render group icon
const renderGroupIcon = (groupId: WebhookGroupId, className: string = 'h-4 w-4') => {
  switch (groupId) {
    case 'user': return <Users className={className} />;
    case 'order': return <Package className={className} />;
    case 'stock': return <Boxes className={className} />;
    case 'logistics': return <Truck className={className} />;
    case 'cart': return <ShoppingCart className={className} />;
    case 'finance': return <DollarSign className={className} />;
    case 'subscription': return <FileText className={className} />;
    case 'academy': return <GraduationCap className={className} />;
    case 'support': return <MessageSquare className={className} />;
    default: return <WebhookIcon className={className} />;
  }
};

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

  // Filter Webhooks on main page
  const [filterGroup, setFilterGroup] = useState<string>('all');
  const [searchWebhooks, setSearchWebhooks] = useState('');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingWebhook, setEditingWebhook] = useState<RegisteredWebhook | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUrl, setFormUrl] = useState('');
  const [formToken, setFormToken] = useState('');
  const [formEvents, setFormEvents] = useState<string[]>(['user.created']);
  const [testingFormUrl, setTestingFormUrl] = useState(false);
  const [modalFilterGroup, setModalFilterGroup] = useState<string>('all');
  const [modalSearchEvent, setModalSearchEvent] = useState('');

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
    setModalFilterGroup('all');
    setModalSearchEvent('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEditModal = (webhook: RegisteredWebhook) => {
    setEditingWebhook(webhook);
    setFormName(webhook.name);
    setFormUrl(webhook.url);
    setFormToken(webhook.token || generateRandomToken());
    setFormEvents(webhook.events || []);
    setModalFilterGroup('all');
    setModalSearchEvent('');
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

  // Toggle all events of a specific group
  const handleToggleGroupEvents = (groupId: WebhookGroupId) => {
    const groupEventKeys = WEBHOOK_EVENTS_CATALOG
      .filter(e => e.group === groupId)
      .map(e => e.eventType);

    const allGroupSelected = groupEventKeys.every(k => formEvents.includes(k));

    if (allGroupSelected) {
      // Remove all group events
      setFormEvents(formEvents.filter(k => !groupEventKeys.includes(k)));
    } else {
      // Add missing group events
      const next = new Set([...formEvents, ...groupEventKeys]);
      setFormEvents(Array.from(next));
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

  // Filtered groups in modal
  const modalVisibleGroups = useMemo(() => {
    return WEBHOOK_GROUPS.filter(g => {
      if (modalFilterGroup !== 'all' && g.id !== modalFilterGroup) return false;
      return true;
    });
  }, [modalFilterGroup]);

  // Filtered webhooks on main page
  const filteredWebhooks = useMemo(() => {
    return webhooks.filter(wh => {
      const matchesSearch = !searchWebhooks || 
        wh.name.toLowerCase().includes(searchWebhooks.toLowerCase()) ||
        wh.url.toLowerCase().includes(searchWebhooks.toLowerCase());

      if (!matchesSearch) return false;

      if (filterGroup === 'all') return true;

      // Check if this webhook has any event in filterGroup
      const groupEvents = WEBHOOK_EVENTS_CATALOG
        .filter(e => e.group === filterGroup)
        .map(e => e.eventType);

      return wh.events.some(ev => groupEvents.includes(ev));
    });
  }, [webhooks, searchWebhooks, filterGroup]);

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Breadcrumb & Header */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <button 
            onClick={() => navigate('/super-admin/recursos')} 
            className="hover:text-foreground flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Voltar para Recursos</span>
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
              Gerencie seus webhooks organizados por grupos (Usuários, Pedidos, Estoque, etc.) com suporte a múltiplos destinos para o mesmo evento.
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

      {/* Filter Bar (Groups Dropdown Menu & Search) */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 flex-1 max-w-xl">
          {/* Menu Suspenso de Grupos */}
          <div className="w-full sm:w-64 shrink-0">
            <Select 
              value={filterGroup} 
              onValueChange={(val) => setFilterGroup(val as WebhookGroupId | 'all')}
            >
              <SelectTrigger className="h-9 text-xs bg-card">
                <div className="flex items-center gap-2 truncate">
                  {filterGroup === 'all' ? (
                    <WebhookIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                  ) : (
                    <span className="shrink-0">{renderGroupIcon(filterGroup, 'h-3.5 w-3.5')}</span>
                  )}
                  <SelectValue placeholder="Filtrar por grupo" />
                </div>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">
                  <div className="flex items-center justify-between w-full gap-4">
                    <span className="font-medium">Todos os Grupos</span>
                    <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
                      {webhooks.length}
                    </Badge>
                  </div>
                </SelectItem>
                {WEBHOOK_GROUPS.map(grp => {
                  const grpEvents = WEBHOOK_EVENTS_CATALOG.filter(e => e.group === grp.id).map(e => e.eventType);
                  const count = webhooks.filter(w => w.events.some(ev => grpEvents.includes(ev))).length;

                  return (
                    <SelectItem key={grp.id} value={grp.id} className="text-xs">
                      <div className="flex items-center justify-between w-full gap-4">
                        <div className="flex items-center gap-2">
                          {renderGroupIcon(grp.id, 'h-3.5 w-3.5 text-muted-foreground')}
                          <span>{grp.name}</span>
                        </div>
                        {count > 0 && (
                          <Badge variant="secondary" className="text-[10px] px-1.5 py-0 font-normal">
                            {count}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>

          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome ou URL..."
              value={searchWebhooks}
              onChange={(e) => setSearchWebhooks(e.target.value)}
              className="pl-8 h-9 text-xs bg-card"
            />
          </div>
        </div>

        {filterGroup !== 'all' && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setFilterGroup('all')}
            className="text-xs h-9 text-muted-foreground hover:text-foreground self-start sm:self-auto"
          >
            Limpar filtro
          </Button>
        )}
      </div>

      {/* Webhooks List */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-16">
            <RefreshCw className="h-6 w-6 animate-spin mx-auto text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground">Carregando webhooks configurados...</p>
          </div>
        ) : filteredWebhooks.length === 0 ? (
          /* Empty State */
          <div className="text-center py-16 border border-dashed rounded-2xl bg-card/60 p-8 space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <WebhookIcon className="h-7 w-7" />
            </div>
            <div className="max-w-md mx-auto space-y-1">
              <h3 className="font-semibold text-lg text-foreground">
                {webhooks.length === 0 ? 'Nenhum webhook cadastrado' : 'Nenhum webhook encontrado para este filtro'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {webhooks.length === 0 
                  ? 'Crie seu primeiro webhook para receber notificações dos eventos selecionados (Usuários, Pedidos, Estoque, etc.).'
                  : 'Tente alterar os filtros de grupo ou o termo da busca acima.'}
              </p>
            </div>
            {webhooks.length === 0 && (
              <Button 
                onClick={handleOpenCreateModal}
                className="bg-[#5B47FB] hover:bg-[#4C39EC] text-white gap-2 text-sm mt-2"
              >
                <Plus className="h-4 w-4" />
                Criar meu primeiro webhook
              </Button>
            )}
          </div>
        ) : (
          /* Cards List */
          <div className="grid grid-cols-1 gap-4">
            {filteredWebhooks.map((wh) => (
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

                  {/* Events Badges with Group Classification */}
                  <div className="space-y-1.5">
                    <span className="text-xs text-muted-foreground font-medium">Eventos que acionam este webhook:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {wh.events.map(evKey => {
                        const meta = WEBHOOK_EVENTS_CATALOG.find(e => e.eventType === evKey);
                        const group = WEBHOOK_GROUPS.find(g => g.id === meta?.group);

                        return (
                          <Badge 
                            key={evKey}
                            variant="secondary"
                            className="text-xs font-normal py-0.5 gap-1.5 cursor-pointer hover:bg-secondary/80 border border-border/60"
                            onClick={() => meta && setPreviewPayload(meta)}
                            title="Clique para visualizar o payload deste evento"
                          >
                            {meta?.group && renderGroupIcon(meta.group, 'h-3 w-3 text-muted-foreground')}
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

      {/* Modal: Criar / Editar Webhook with Group Classification */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-4">
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
                placeholder="Ex: Notificações de Vendas - n8n, CRM de Leads..."
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

            {/* Field: Eventos Separados por Grupo */}
            <div className="space-y-3 pt-3 border-t">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Eventos da Plataforma
                  </label>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {formEvents.length} selecionados
                  </Badge>
                </div>

                <button
                  type="button"
                  onClick={handleToggleSelectAllEvents}
                  className="text-xs text-[#4F46E5] hover:underline font-semibold self-start sm:self-auto"
                >
                  {formEvents.length === WEBHOOK_EVENTS_CATALOG.length 
                    ? '(Desmarcar todos os eventos)' 
                    : '(Selecionar todos os eventos)'}
                </button>
              </div>

              {/* Group Quick Filter Dropdown inside Modal */}
              <div className="w-full sm:w-72">
                <Select
                  value={modalFilterGroup}
                  onValueChange={(val) => setModalFilterGroup(val as WebhookGroupId | 'all')}
                >
                  <SelectTrigger className="h-8 text-xs bg-muted/40">
                    <div className="flex items-center gap-2 truncate">
                      {modalFilterGroup === 'all' ? (
                        <WebhookIcon className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                      ) : (
                        <span className="shrink-0">{renderGroupIcon(modalFilterGroup, 'h-3.5 w-3.5')}</span>
                      )}
                      <SelectValue placeholder="Filtrar por grupo de eventos" />
                    </div>
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all" className="text-xs">
                      Todos os Grupos de Eventos ({WEBHOOK_EVENTS_CATALOG.length})
                    </SelectItem>
                    {WEBHOOK_GROUPS.map(g => {
                      const count = WEBHOOK_EVENTS_CATALOG.filter(e => e.group === g.id).length;
                      return (
                        <SelectItem key={g.id} value={g.id} className="text-xs">
                          <div className="flex items-center gap-2">
                            {renderGroupIcon(g.id, 'h-3.5 w-3.5 text-muted-foreground')}
                            <span>{g.name} ({count})</span>
                          </div>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Grouped Events Accordion / Section List */}
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {modalVisibleGroups.map((grp) => {
                  const groupEvents = WEBHOOK_EVENTS_CATALOG.filter(e => e.group === grp.id);
                  const selectedInGroup = groupEvents.filter(e => formEvents.includes(e.eventType)).length;
                  const isAllInGroupSelected = groupEvents.length > 0 && selectedInGroup === groupEvents.length;

                  return (
                    <div 
                      key={grp.id}
                      className="border border-border/80 rounded-xl overflow-hidden bg-card shadow-xs"
                    >
                      {/* Group Header */}
                      <div className="bg-muted/40 px-3.5 py-2.5 flex items-center justify-between border-b border-border/60">
                        <div className="flex items-center gap-2">
                          <div className="p-1 rounded-md bg-primary/10 text-primary">
                            {renderGroupIcon(grp.id, 'h-3.5 w-3.5')}
                          </div>
                          <div>
                            <span className="text-xs font-bold text-foreground">
                              {grp.name}
                            </span>
                            <span className="text-[11px] text-muted-foreground ml-2">
                              ({selectedInGroup}/{groupEvents.length})
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleToggleGroupEvents(grp.id)}
                          className="text-[11px] text-[#4F46E5] hover:underline font-medium"
                        >
                          {isAllInGroupSelected ? 'Desmarcar grupo' : 'Selecionar grupo'}
                        </button>
                      </div>

                      {/* Group Items */}
                      <div className="p-2 space-y-1.5 divide-y divide-border/30">
                        {groupEvents.map((ev) => {
                          const isChecked = formEvents.includes(ev.eventType);

                          return (
                            <div 
                              key={ev.eventType} 
                              className={`flex items-center justify-between p-2 rounded-lg transition-colors ${
                                isChecked ? 'bg-primary/[0.04]' : 'hover:bg-muted/30'
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
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span>{ev.title}</span>
                                    {ev.eventType === 'user.created' && (
                                      <Badge className="bg-emerald-600 text-white text-[9px] h-4 px-1.5 py-0 font-medium">
                                        user.created
                                      </Badge>
                                    )}
                                  </div>
                                  <p className="text-[11px] text-muted-foreground font-normal line-clamp-1">
                                    {ev.description}
                                  </p>
                                </div>
                              </label>

                              {/* Botão Visualizar Payload */}
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setPreviewPayload(ev);
                                }}
                                className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 px-2 py-1 rounded hover:bg-muted shrink-0 ml-2"
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
                Evento: <code>{previewPayload.eventType}</code> ({previewPayload.group})
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
