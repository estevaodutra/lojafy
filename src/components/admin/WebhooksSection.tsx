import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Link, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Send, 
  RefreshCw, 
  Eye, 
  EyeOff,
  ShoppingCart,
  UserPlus,
  Clock3,
  Copy,
  ExternalLink
} from 'lucide-react';
import { useWebhookSettings, WebhookSetting } from '@/hooks/useWebhookSettings';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const eventConfig: Record<string, { icon: React.ElementType; title: string; description: string }> = {
  'order.paid': {
    icon: ShoppingCart,
    title: 'Pedido Pago',
    description: 'Disparado quando um pedido tem o pagamento confirmado',
  },
  'user.created': {
    icon: UserPlus,
    title: 'Usuário Criado',
    description: 'Disparado quando um novo usuário é criado via API',
  },
  'user.inactive.7days': {
    icon: Clock3,
    title: 'Usuário Inativo (7 dias)',
    description: 'Disparado quando um usuário fica 7 dias sem acessar',
  },
  'user.inactive.15days': {
    icon: Clock3,
    title: 'Usuário Inativo (15 dias)',
    description: 'Disparado quando um usuário fica 15 dias sem acessar',
  },
  'user.inactive.30days': {
    icon: Clock3,
    title: 'Usuário Inativo (30 dias)',
    description: 'Disparado quando um usuário fica 30 dias sem acessar',
  },
};

interface WebhookCardProps {
  setting: WebhookSetting;
  updating: string | null;
  onUrlChange: (eventType: string, url: string) => void;
  onToggle: (eventType: string) => void;
  onTest: (eventType: string) => void;
}

const WebhookCard: React.FC<WebhookCardProps> = ({
  setting,
  updating,
  onUrlChange,
  onToggle,
  onTest,
}) => {
  const [localUrl, setLocalUrl] = useState(setting.webhook_url || '');
  const [isEditing, setIsEditing] = useState(false);
  const config = eventConfig[setting.event_type] || {
    icon: Link,
    title: setting.event_type,
    description: '',
  };
  const Icon = config.icon;
  const isUpdating = updating === setting.event_type;

  const handleSaveUrl = () => {
    onUrlChange(setting.event_type, localUrl);
    setIsEditing(false);
  };

  const getStatusBadge = () => {
    if (!setting.last_triggered_at) return null;
    
    if (setting.last_status_code && setting.last_status_code >= 200 && setting.last_status_code < 300) {
      return (
        <Badge variant="default" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          <CheckCircle className="h-3 w-3 mr-1" />
          {setting.last_status_code} OK
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive">
        <XCircle className="h-3 w-3 mr-1" />
        {setting.last_status_code || 'Erro'}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-lg">{config.title}</CardTitle>
              <CardDescription className="text-sm">{config.description}</CardDescription>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              checked={setting.active}
              onCheckedChange={() => onToggle(setting.event_type)}
              disabled={isUpdating}
            />
            <span className="text-sm text-muted-foreground">
              {setting.active ? 'Ativo' : 'Inativo'}
            </span>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Input
            placeholder="https://seu-sistema.com/webhook/evento"
            value={localUrl}
            onChange={(e) => {
              setLocalUrl(e.target.value);
              setIsEditing(true);
            }}
            disabled={isUpdating}
            className="flex-1"
          />
          {isEditing && (
            <Button 
              onClick={handleSaveUrl} 
              disabled={isUpdating}
              size="sm"
            >
              Salvar
            </Button>
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-4 text-muted-foreground">
            {setting.last_triggered_at && (
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Último: {format(new Date(setting.last_triggered_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
              </span>
            )}
            {getStatusBadge()}
            {setting.last_error_message && (
              <span className="text-red-500 text-xs max-w-[200px] truncate" title={setting.last_error_message}>
                {setting.last_error_message}
              </span>
            )}
          </div>
          
          <Button
            variant="outline"
            size="sm"
            onClick={() => onTest(setting.event_type)}
            disabled={isUpdating || !setting.webhook_url}
          >
            {isUpdating ? (
              <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-1" />
            )}
            Testar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

interface SecretTokenSectionProps {
  settings: WebhookSetting[];
  updating: string | null;
  onRegenerate: (eventType: string) => void;
}

const SecretTokenSection: React.FC<SecretTokenSectionProps> = ({
  settings,
  updating,
  onRegenerate,
}) => {
  const [showToken, setShowToken] = useState(false);
  const { toast } = useToast();
  
  // Usar o token do primeiro evento (todos usam o mesmo ou deveria ser global)
  const secretToken = settings[0]?.secret_token || '';

  const copyToken = () => {
    navigator.clipboard.writeText(secretToken);
    toast({
      title: 'Copiado!',
      description: 'Token copiado para a área de transferência',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link className="h-5 w-5" />
          Secret Token (HMAC-SHA256)
        </CardTitle>
        <CardDescription>
          Use este token para validar a assinatura dos webhooks recebidos
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Input
              type={showToken ? 'text' : 'password'}
              value={secretToken}
              readOnly
              className="pr-10 font-mono text-sm"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-full"
              onClick={() => setShowToken(!showToken)}
            >
              {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          </div>
          <Button variant="outline" size="icon" onClick={copyToken}>
            <Copy className="h-4 w-4" />
          </Button>
          <Button 
            variant="outline" 
            onClick={() => settings[0] && onRegenerate(settings[0].event_type)}
            disabled={!!updating}
          >
            <RefreshCw className={`h-4 w-4 mr-1 ${updating ? 'animate-spin' : ''}`} />
            Regenerar
          </Button>
        </div>

        <div className="bg-muted p-4 rounded-lg text-sm space-y-2">
          <p className="font-medium">Como validar a assinatura:</p>
          <pre className="text-xs overflow-x-auto p-2 bg-background rounded">
{`// Node.js
const crypto = require('crypto');
const signature = req.headers['x-webhook-signature'];
const payload = JSON.stringify(req.body);
const expectedSig = crypto
  .createHmac('sha256', 'SEU_SECRET_TOKEN')
  .update(payload)
  .digest('hex');
if (signature === expectedSig) {
  // Webhook válido
}`}
          </pre>
        </div>
      </CardContent>
    </Card>
  );
};

export const WebhooksSection: React.FC = () => {
  const {
    settings,
    loading,
    updating,
    updateWebhookUrl,
    toggleWebhookActive,
    testWebhook,
    regenerateSecret,
  } = useWebhookSettings();

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Webhooks</h2>
          <p className="text-muted-foreground">Carregando configurações...</p>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-4 w-72" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-10 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold mb-2">Webhooks</h2>
        <p className="text-muted-foreground">
          Configure URLs para receber eventos em tempo real da plataforma.
          Todos os eventos são enviados via POST com assinatura HMAC-SHA256.
        </p>
      </div>

      <Card className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
        <CardContent className="pt-4">
          <div className="flex gap-3">
            <ExternalLink className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
            <div className="text-sm text-blue-700 dark:text-blue-300">
              <p className="font-medium mb-1">Headers enviados em cada requisição:</p>
              <ul className="list-disc list-inside space-y-1 text-blue-600 dark:text-blue-400">
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">X-Webhook-Signature</code> - Assinatura HMAC-SHA256</li>
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">X-Webhook-Event</code> - Tipo do evento</li>
                <li><code className="bg-blue-100 dark:bg-blue-900/50 px-1 rounded">X-Webhook-Timestamp</code> - Data/hora do disparo</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {settings.map((setting) => (
          <WebhookCard
            key={setting.id}
            setting={setting}
            updating={updating}
            onUrlChange={updateWebhookUrl}
            onToggle={toggleWebhookActive}
            onTest={testWebhook}
          />
        ))}
      </div>

      <Separator />

      <SecretTokenSection
        settings={settings}
        updating={updating}
        onRegenerate={regenerateSecret}
      />
    </div>
  );
};
