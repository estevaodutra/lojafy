import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Video, Trash2, Edit, BarChart3, Eye, MousePointerClick, PlayCircle, X } from 'lucide-react';
import { useAdminMandatoryNotifications } from '@/hooks/useMandatoryNotifications';
import { isGoogleDriveUrl, isYouTubeUrl } from '@/lib/videoUtils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import type { MandatoryNotification, MandatoryNotificationMetrics } from '@/types/notifications';

const schema = z.object({
  title: z.string().min(1, 'Título obrigatório').max(100),
  message: z.string().min(1, 'Mensagem obrigatória').max(500),
  video_url: z.string().url('URL inválida').optional().or(z.literal('')),
  video_provider: z.enum(['youtube', 'vimeo', 'google_drive', 'direct']).optional(),
  target_audience: z.enum(['all', 'customer', 'reseller', 'supplier']),
  action_url: z.string().optional(),
  action_label: z.string().default('Entendido'),
  priority: z.number().min(0).max(100),
  expires_at: z.string().optional(),
});

export const MandatoryNotificationsTab = () => {
  const { notifications, loading, createNotification, updateNotification, deleteNotification, getMetrics } = useAdminMandatoryNotifications();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [metricsModal, setMetricsModal] = useState<{ notification: MandatoryNotification; metrics: MandatoryNotificationMetrics } | null>(null);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      message: '',
      video_url: '',
      video_provider: undefined as any,
      target_audience: 'all' as 'all' | 'customer' | 'reseller' | 'supplier',
      action_url: '',
      action_label: 'Entendido',
      priority: 5,
      expires_at: '',
    },
  });

  // Auto-detect video provider
  const videoUrlValue = form.watch('video_url');

  useEffect(() => {
    if (videoUrlValue && !editingId) {
      if (isGoogleDriveUrl(videoUrlValue)) {
        form.setValue('video_provider', 'google_drive');
      } else if (isYouTubeUrl(videoUrlValue)) {
        form.setValue('video_provider', 'youtube');
      } else if (videoUrlValue.includes('vimeo.com')) {
        form.setValue('video_provider', 'vimeo');
      }
    }
  }, [videoUrlValue, editingId]);

  const onSubmit = async (data: any) => {
    const submitData: any = {
      title: data.title,
      message: data.message,
      target_audience: data.target_audience,
      action_label: data.action_label,
      priority: data.priority,
    };

    // Only add video fields if video_url is provided
    if (data.video_url && data.video_url.trim() !== '') {
      submitData.video_url = data.video_url;
      submitData.video_provider = data.video_provider;
    }

    // Only add action_url if provided
    if (data.action_url && data.action_url.trim() !== '') {
      submitData.action_url = data.action_url;
    }

    // Only add expires_at if provided
    if (data.expires_at && data.expires_at.trim() !== '') {
      submitData.expires_at = data.expires_at;
    }

    if (editingId) {
      await updateNotification(editingId, submitData);
      setEditingId(null);
    } else {
      await createNotification(submitData);
    }
    form.reset();
  };

  const handleEdit = (notification: MandatoryNotification) => {
    setEditingId(notification.id);
    form.reset({
      title: notification.title,
      message: notification.message,
      video_url: notification.video_url || '',
      video_provider: notification.video_provider,
      target_audience: notification.target_audience,
      action_url: notification.action_url || '',
      action_label: notification.action_label,
      priority: notification.priority,
      expires_at: notification.expires_at || '',
    });
  };

  const handleViewMetrics = async (notification: MandatoryNotification) => {
    const metrics = await getMetrics(notification.id);
    if (metrics) {
      setMetricsModal({ notification, metrics });
    }
  };

  const getAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      all: 'Todos',
      customer: 'Clientes',
      reseller: 'Revendedores',
      supplier: 'Fornecedores',
    };
    return labels[audience] || audience;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            {editingId ? 'Editar' : 'Nova'} Notificação Obrigatória
          </CardTitle>
          <CardDescription>
            Crie notificações com vídeos que os usuários precisam assistir antes de continuar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Título</FormLabel>
                      <FormControl>
                        <Input placeholder="Ex: Novo recurso importante" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="target_audience"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Público-Alvo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="all">Todos os usuários</SelectItem>
                          <SelectItem value="customer">Apenas clientes</SelectItem>
                          <SelectItem value="reseller">Apenas revendedores</SelectItem>
                          <SelectItem value="supplier">Apenas fornecedores</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <FormField
                control={form.control}
                name="message"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mensagem</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Descreva a notificação..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="video_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>URL do Vídeo (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="YouTube, Google Drive, Vimeo ou link direto" {...field} />
                      </FormControl>
                      <FormDescription>YouTube, Vimeo, Google Drive ou link direto</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="video_provider"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Provedor de Vídeo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione..." />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="youtube">YouTube</SelectItem>
                          <SelectItem value="vimeo">Vimeo</SelectItem>
                          <SelectItem value="google_drive">Google Drive</SelectItem>
                          <SelectItem value="direct">Link Direto</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <FormField
                  control={form.control}
                  name="action_url"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Link de Ação (Opcional)</FormLabel>
                      <FormControl>
                        <Input placeholder="/produtos" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="action_label"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Texto do Botão</FormLabel>
                      <FormControl>
                        <Input placeholder="Entendido" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="priority"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Prioridade</FormLabel>
                      <FormControl>
                        <Input type="number" min={0} max={100} {...field} onChange={(e) => field.onChange(parseInt(e.target.value))} />
                      </FormControl>
                      <FormDescription>0-100 (maior = mais importante)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-2">
                <Button type="submit" disabled={loading}>
                  {editingId ? 'Atualizar' : 'Criar'} Notificação
                </Button>
                {editingId && (
                  <Button type="button" variant="outline" onClick={() => { setEditingId(null); form.reset(); }}>
                    Cancelar
                  </Button>
                )}
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Obrigatórias Cadastradas</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Título</TableHead>
                <TableHead>Público</TableHead>
                <TableHead>Vídeo</TableHead>
                <TableHead>Prioridade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {notifications.map((notification) => (
                <TableRow key={notification.id}>
                  <TableCell className="font-medium">{notification.title}</TableCell>
                  <TableCell>{getAudienceLabel(notification.target_audience)}</TableCell>
                  <TableCell>
                    {notification.video_url ? (
                      <Badge variant="secondary">
                        <PlayCircle className="h-3 w-3 mr-1" />
                        {notification.video_provider === 'google_drive' ? 'Google Drive' : notification.video_provider}
                      </Badge>
                    ) : (
                      <Badge variant="outline">Sem vídeo</Badge>
                    )}
                  </TableCell>
                  <TableCell>{notification.priority}</TableCell>
                  <TableCell>
                    {notification.is_active ? (
                      <Badge variant="default">Ativa</Badge>
                    ) : (
                      <Badge variant="secondary">Inativa</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => handleViewMetrics(notification)}>
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => handleEdit(notification)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => deleteNotification(notification.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {metricsModal && (
        <Dialog open={true} onOpenChange={() => setMetricsModal(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center justify-between">
                <span>Métricas: {metricsModal.notification.title}</span>
                <Button variant="ghost" size="sm" onClick={() => setMetricsModal(null)}>
                  <X className="h-4 w-4" />
                </Button>
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-6">
              <div className="grid gap-4 md:grid-cols-2">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <Eye className="h-4 w-4" />
                      Total de Visualizações
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{metricsModal.metrics.total_views}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium flex items-center gap-2">
                      <PlayCircle className="h-4 w-4" />
                      Vídeos Completos
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-3xl font-bold">{metricsModal.metrics.video_completed_count}</div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">CTR: Conclusão do Vídeo</span>
                    <span className="text-sm font-bold">{metricsModal.metrics.ctr_video_completion}%</span>
                  </div>
                  <Progress value={metricsModal.metrics.ctr_video_completion} />
                </div>

                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm font-medium">CTR: Clique no Botão "Entendido"</span>
                    <span className="text-sm font-bold">{metricsModal.metrics.ctr_button_click}%</span>
                  </div>
                  <Progress value={metricsModal.metrics.ctr_button_click} />
                </div>

                {metricsModal.notification.action_url && (
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">CTR: Clique na Ação</span>
                      <span className="text-sm font-bold">{metricsModal.metrics.ctr_action_click}%</span>
                    </div>
                    <Progress value={metricsModal.metrics.ctr_action_click} />
                  </div>
                )}
              </div>

              <div className="grid gap-2 p-4 bg-muted rounded-lg text-sm">
                <div className="flex justify-between">
                  <span>Usuários que completaram o vídeo:</span>
                  <span className="font-medium">{metricsModal.metrics.video_completed_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usuários que clicaram "Entendido":</span>
                  <span className="font-medium">{metricsModal.metrics.button_clicked_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Usuários que clicaram na ação:</span>
                  <span className="font-medium">{metricsModal.metrics.action_clicked_count}</span>
                </div>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
};
