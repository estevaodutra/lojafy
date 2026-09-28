import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Search, 
  Send, 
  RefreshCw, 
  Copy, 
  Eye, 
  EyeOff, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Code2, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Layers,
  FileJson,
  Zap,
  Check
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { useWebhookSettings, WebhookSetting } from '@/hooks/useWebhookSettings';
import { WEBHOOK_CATEGORIES, WEBHOOK_EVENTS_CATALOG, WebhookEventMeta } from '@/data/webhookEventsCatalog';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

export const Webhooks: React.FC = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    settings,
    loading,
    updating,
    updateWebhookUrl,
    toggleWebhookActive,
    testWebhook,
    regenerateSecret,
  } = useWebhookSettings();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showSecretToken, setShowSecretToken] = useState(false);
  const [previewPayload, setPreviewPayload] = useState<WebhookEventMeta | null>(null);
  const [copiedToken, setCopiedToken] = useState(false);
  const [editingUrls, setEditingUrls] = useState<Record<string, string>>({});

  // Secret token (reuse first setting's secret or default)
  const secretToken = useMemo(() => {
    return settings.find(s => !!s.secret_token)?.secret_token || '';
  }, [settings]);

  const handleCopyToken = () => {
    if (!secretToken) return;
    navigator.clipboard.writeText(secretToken);
    setCopiedToken(true);
    toast({
      title: 'Token copiado!',
      description: 'O secret token foi copiado para a área de transferência.',
    });
    setTimeout(() => setCopiedToken(false), 2000);
  };

  // Map settings by event_type for fast lookup
  const settingsByEvent = useMemo(() => {
    const map = new Map<string, WebhookSetting>();
    settings.forEach(s => map.set(s.event_type, s));
    return map;
  }, [settings]);

  // Filter events from catalog
  const filteredEvents = useMemo(() => {
    return WEBHOOK_EVENTS_CATALOG.filter(item => {
      const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
      const q = searchQuery.toLowerCase().trim();
      const matchesQuery = !q || 
        item.eventType.toLowerCase().includes(q) || 
        item.title.toLowerCase().includes(q) || 
        item.description.toLowerCase().includes(q);
      return matchesCategory && matchesQuery;
    });
  }, [selectedCategory, searchQuery]);

  const handleUrlChange = (eventType: string, val: string) => {
    setEditingUrls(prev => ({ ...prev, [eventType]: val }));
  };

  const handleSaveUrl = async (eventType: string) => {
    const currentVal = editingUrls[eventType];
    if (currentVal !== undefined) {
      await updateWebhookUrl(eventType, currentVal.trim());
      setEditingUrls(prev => {
        const next = { ...prev };
        delete next[eventType];
        return next;
      });
    }
  };

  const handleTestEvent = async (eventType: string) => {
    const currentSetting = settingsByEvent.get(eventType);
    const url = editingUrls[eventType] !== undefined ? editingUrls[eventType] : currentSetting?.webhook_url;
    
    if (!url) {
      toast({
        title: 'URL obrigatória',
        description: 'Preencha e salve a URL do webhook antes de disparar o teste.',
        variant: 'destructive',
      });
      return;
    }

    // If edited but not saved, save first
    if (editingUrls[eventType] !== undefined) {
      await updateWebhookUrl(eventType, editingUrls[eventType].trim());
      setEditingUrls(prev => {
        const next = { ...prev };
        delete next[eventType];
        return next;
      });
    }

    await testWebhook(eventType);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Top Navigation & Header */}
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

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <span>Webhooks da Plataforma</span>
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-xs">
                SuperAdmin
              </Badge>
            </h1>
            <p className="text-muted-foreground mt-1 text-base">
              Monitore e transmita eventos em tempo real para URLs externas (n8n, ERPs, Zapier, Webhook customizado).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/super-admin/logs')}
              className="gap-1.5 text-xs"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              Ver Logs de API
            </Button>
          </div>
        </div>
      </div>

      {/* Secret Token (HMAC-SHA256) */}
      <Card className="border-border/80 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
              <CardTitle className="text-base">Chave Secreta de Assinatura (HMAC SHA-256)</CardTitle>
            </div>
            <Badge variant="secondary" className="text-xs font-mono">
              x-webhook-signature
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Cada disparo de webhook inclui o header <code>x-webhook-signature</code> com o hash HMAC do payload para você autenticar a origem com segurança.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex-1 relative">
              <Input
                type={showSecretToken ? 'text' : 'password'}
                value={secretToken || 'Nenhum token configurado ainda'}
                readOnly
                className="pr-10 font-mono text-xs bg-muted/40 h-9"
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                onClick={() => setShowSecretToken(!showSecretToken)}
              >
                {showSecretToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyToken}
                disabled={!secretToken}
                className="gap-1.5 h-9"
              >
                {copiedToken ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>{copiedToken ? 'Copiado!' : 'Copiar Chave'}</span>
              </Button>

              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const firstType = settings[0]?.event_type || 'user.created';
                  regenerateSecret(firstType);
                }}
                disabled={!!updating}
                className="gap-1.5 h-9"
              >
                <RefreshCw className={`h-4 w-4 ${updating ? 'animate-spin' : ''}`} />
                <span>Regenerar</span>
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter and Search */}
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Categories Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
            {WEBHOOK_CATEGORIES.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-primary text-primary-foreground shadow-sm'
                    : 'bg-muted/60 hover:bg-muted text-muted-foreground hover:text-foreground'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search bar */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar evento (ex: user.created)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
        </div>

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Mostrando <strong>{filteredEvents.length}</strong> eventos da plataforma</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            Tratado em produção (user.created, order.paid, inatividade)
          </span>
        </div>
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {filteredEvents.map((eventMeta) => {
          const setting = settingsByEvent.get(eventMeta.eventType);
          const currentUrlValue = editingUrls[eventMeta.eventType] !== undefined 
            ? editingUrls[eventMeta.eventType] 
            : (setting?.webhook_url || '');
          const isDirty = editingUrls[eventMeta.eventType] !== undefined && editingUrls[eventMeta.eventType] !== (setting?.webhook_url || '');
          const isBusy = updating === eventMeta.eventType;
          const isActive = setting?.active || false;

          return (
            <Card 
              key={eventMeta.eventType}
              className={`border transition-all duration-200 ${
                eventMeta.eventType === 'user.created' 
                  ? 'border-primary/40 bg-primary/[0.015] shadow-sm' 
                  : 'border-border/80'
              }`}
            >
              <CardContent className="p-5 space-y-4">
                {/* Event Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-base text-foreground">
                        {eventMeta.title}
                      </span>
                      <code className="text-xs px-2 py-0.5 rounded bg-muted font-mono text-muted-foreground">
                        {eventMeta.eventType}
                      </code>

                      {eventMeta.eventType === 'user.created' && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600 text-white text-[10px] font-semibold tracking-wide uppercase">
                          ★ Em Destaque
                        </Badge>
                      )}

                      {eventMeta.status === 'production' && (
                        <Badge variant="outline" className="border-emerald-500/30 text-emerald-600 dark:text-emerald-400 bg-emerald-500/5 text-[11px]">
                          Produção Ativa
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {eventMeta.description}
                    </p>
                  </div>

                  {/* Switch Active/Inactive */}
                  <div className="flex items-center gap-2 self-start sm:self-center bg-muted/40 px-3 py-1.5 rounded-lg border">
                    <Switch
                      checked={isActive}
                      onCheckedChange={() => toggleWebhookActive(eventMeta.eventType)}
                      disabled={isBusy}
                    />
                    <span className="text-xs font-medium">
                      {isActive ? (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold">Ativo</span>
                      ) : (
                        <span className="text-muted-foreground">Inativo</span>
                      )}
                    </span>
                  </div>
                </div>

                {/* URL Input & Controls */}
                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <div className="flex-1 relative">
                    <Input
                      placeholder="https://sua-empresa.com/api/webhooks"
                      value={currentUrlValue}
                      onChange={(e) => handleUrlChange(eventMeta.eventType, e.target.value)}
                      disabled={isBusy}
                      className="font-mono text-xs h-9 pr-16"
                    />
                    {isDirty && (
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-600 font-medium">
                        Não salvo
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {isDirty && (
                      <Button
                        size="sm"
                        onClick={() => handleSaveUrl(eventMeta.eventType)}
                        disabled={isBusy}
                        className="h-9 text-xs font-medium"
                      >
                        Salvar URL
                      </Button>
                    )}

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleTestEvent(eventMeta.eventType)}
                      disabled={isBusy || (!currentUrlValue && !setting?.webhook_url)}
                      className="h-9 text-xs gap-1.5"
                    >
                      {isBusy ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Send className="h-3.5 w-3.5" />
                      )}
                      <span>Testar Disparo</span>
                    </Button>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewPayload(eventMeta)}
                      className="h-9 text-xs gap-1 text-muted-foreground hover:text-foreground"
                    >
                      <FileJson className="h-3.5 w-3.5" />
                      <span>Payload</span>
                    </Button>
                  </div>
                </div>

                {/* Delivery Status Row */}
                {setting?.last_triggered_at && (
                  <div className="flex flex-wrap items-center gap-4 text-xs text-muted-foreground pt-1 border-t border-border/50">
                    <span className="flex items-center gap-1.5">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      Último disparo: {format(new Date(setting.last_triggered_at), "dd/MM/yyyy 'às' HH:mm:ss", { locale: ptBR })}
                    </span>

                    {setting.last_status_code && setting.last_status_code >= 200 && setting.last_status_code < 300 ? (
                      <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-[11px] font-mono">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        {setting.last_status_code} OK
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="text-[11px] font-mono">
                        <XCircle className="h-3 w-3 mr-1" />
                        Status {setting.last_status_code || 'Erro'}
                      </Badge>
                    )}

                    {setting.last_error_message && (
                      <span className="text-red-500 text-xs truncate max-w-sm" title={setting.last_error_message}>
                        Erro: {setting.last_error_message}
                      </span>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {filteredEvents.length === 0 && (
          <div className="text-center py-12 border rounded-xl bg-card">
            <p className="text-muted-foreground text-sm">Nenhum evento corresponde à busca.</p>
          </div>
        )}
      </div>

      {/* Modal: Preview Sample Payload */}
      <Dialog open={!!previewPayload} onOpenChange={(open) => !open && setPreviewPayload(null)}>
        {previewPayload && (
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <div className="flex items-center gap-2">
                <FileJson className="h-5 w-5 text-primary" />
                <DialogTitle className="text-lg">Payload do Evento: {previewPayload.title}</DialogTitle>
              </div>
              <DialogDescription className="font-mono text-xs">
                {previewPayload.eventType}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3 py-2 text-xs">
              <p className="text-muted-foreground">
                Exemplo do corpo JSON enviado no método POST para a URL configurada:
              </p>
              <div className="relative">
                <pre className="bg-slate-950 text-slate-100 p-4 rounded-xl text-xs overflow-x-auto max-h-80 font-mono leading-relaxed">
                  {JSON.stringify(previewPayload.samplePayload, null, 2)}
                </pre>
                <Button
                  size="sm"
                  variant="secondary"
                  className="absolute top-2 right-2 h-7 px-2 text-[11px] gap-1"
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(previewPayload.samplePayload, null, 2));
                    toast({ title: 'JSON copiado para a área de transferência!' });
                  }}
                >
                  <Copy className="h-3 w-3" />
                  Copiar
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
    </div>
  );
};

export default Webhooks;
