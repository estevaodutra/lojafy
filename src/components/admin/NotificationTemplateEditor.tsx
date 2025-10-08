import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye } from 'lucide-react';
import type { NotificationTemplate } from '@/types/notifications';
import { TemplateVariableHelper } from './TemplateVariableHelper';

interface NotificationTemplateEditorProps {
  template: NotificationTemplate | null;
  open: boolean;
  onClose: () => void;
  onSave: (id: string, updates: Partial<NotificationTemplate>) => void;
}

export const NotificationTemplateEditor = ({ template, open, onClose, onSave }: NotificationTemplateEditorProps) => {
  const [titleTemplate, setTitleTemplate] = useState(template?.title_template || '');
  const [messageTemplate, setMessageTemplate] = useState(template?.message_template || '');
  const [actionUrl, setActionUrl] = useState(template?.action_url_template || '');
  const [actionLabel, setActionLabel] = useState(template?.action_label || '');
  const [conditions, setConditions] = useState(JSON.stringify(template?.conditions || {}, null, 2));

  const handleSave = () => {
    if (!template) return;

    try {
      const parsedConditions = JSON.parse(conditions);
      onSave(template.id, {
        title_template: titleTemplate,
        message_template: messageTemplate,
        action_url_template: actionUrl,
        action_label: actionLabel,
        conditions: parsedConditions,
      });
      onClose();
    } catch (error) {
      console.error('Invalid JSON in conditions:', error);
    }
  };

  if (!template) return null;

  const previewTitle = titleTemplate.replace(/\{(\w+)\}/g, (_, key) => `[${key}]`);
  const previewMessage = messageTemplate.replace(/\{(\w+)\}/g, (_, key) => `[${key}]`);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Template de Notificação</DialogTitle>
          <DialogDescription>
            Personalize o template de notificação automática
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="content" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Conteúdo</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
            <TabsTrigger value="conditions">Condições</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="title">Título do Template</Label>
                  <Input
                    id="title"
                    value={titleTemplate}
                    onChange={(e) => setTitleTemplate(e.target.value)}
                    placeholder="Digite o título..."
                  />
                </div>

                <div>
                  <Label htmlFor="message">Mensagem do Template</Label>
                  <Textarea
                    id="message"
                    value={messageTemplate}
                    onChange={(e) => setMessageTemplate(e.target.value)}
                    placeholder="Digite a mensagem..."
                    rows={4}
                  />
                </div>

                <div>
                  <Label htmlFor="actionUrl">URL da Ação (opcional)</Label>
                  <Input
                    id="actionUrl"
                    value={actionUrl}
                    onChange={(e) => setActionUrl(e.target.value)}
                    placeholder="/produto/{PRODUCT_ID}"
                  />
                </div>

                <div>
                  <Label htmlFor="actionLabel">Texto do Botão (opcional)</Label>
                  <Input
                    id="actionLabel"
                    value={actionLabel}
                    onChange={(e) => setActionLabel(e.target.value)}
                    placeholder="Ver Produto"
                  />
                </div>
              </div>

              <TemplateVariableHelper triggerType={template.trigger_type} />
            </div>
          </TabsContent>

          <TabsContent value="preview">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  <CardTitle>Preview da Notificação</CardTitle>
                </div>
                <CardDescription>
                  Visualize como a notificação ficará para os usuários
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="p-4 border rounded-lg bg-card space-y-3">
                  <div className="font-semibold text-lg">{previewTitle}</div>
                  <div className="text-muted-foreground">{previewMessage}</div>
                  {actionLabel && (
                    <Button variant="outline" size="sm" className="mt-2">
                      {actionLabel}
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-3">
                  * As variáveis entre {`{}`} serão substituídas pelos valores reais quando a notificação for enviada
                </p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="conditions">
            <Card>
              <CardHeader>
                <CardTitle>Condições de Disparo</CardTitle>
                <CardDescription>
                  Configure as condições para que a notificação seja enviada (formato JSON)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={conditions}
                  onChange={(e) => setConditions(e.target.value)}
                  placeholder='{"min_discount_percentage": 5}'
                  rows={8}
                  className="font-mono text-sm"
                />
                <div className="mt-3 text-xs text-muted-foreground space-y-1">
                  <p><strong>Exemplos de condições:</strong></p>
                  <p>• price_decrease: {`{"min_discount_percentage": 5}`}</p>
                  <p>• low_stock: {`{"low_stock_threshold": 5}`}</p>
                  <p>• price_increase: {`{"notify_threshold_percentage": 10}`}</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave}>
            Salvar Template
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
