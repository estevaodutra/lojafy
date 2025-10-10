import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bell, Send, History, TrendingUp } from 'lucide-react';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { NotificationFormData, NotificationCampaign, NotificationStats, NotificationTemplate } from '@/types/notifications';
import { NotificationTemplateCard } from '@/components/admin/NotificationTemplateCard';
import { NotificationTemplateEditor } from '@/components/admin/NotificationTemplateEditor';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const notificationSchema = z.object({
  target_audience: z.enum(['all', 'customers', 'resellers', 'suppliers', 'specific']),
  type: z.enum(['new_product', 'product_removed', 'new_lesson', 'new_feature', 'promotion', 'system', 'custom']),
  title: z.string().min(1, 'Título é obrigatório').max(100, 'Título muito longo'),
  message: z.string().min(1, 'Mensagem é obrigatória').max(500, 'Mensagem muito longa'),
  action_url: z.string().optional(),
  action_label: z.string().optional(),
});

export default function NotificationsManagement() {
  const { sendNotification, fetchNotificationHistory, getNotificationStats, loading } = useAdminNotifications();
  const { templates, loading: templatesLoading, updateTemplate, toggleTemplate, triggerManualNotification } = useNotificationTemplates();
  const [editingTemplate, setEditingTemplate] = useState<NotificationTemplate | null>(null);
  const [confirmTemplate, setConfirmTemplate] = useState<NotificationTemplate | null>(null);
  const [history, setHistory] = useState<NotificationCampaign[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total_sent: 0,
    average_read_rate: 0,
    total_unread: 0,
    sent_today: 0,
  });

  const form = useForm<NotificationFormData>({
    resolver: zodResolver(notificationSchema),
    defaultValues: {
      target_audience: 'all',
      type: 'custom',
      title: '',
      message: '',
      action_url: '',
      action_label: '',
    },
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [historyData, statsData] = await Promise.all([
      fetchNotificationHistory(),
      getNotificationStats(),
    ]);
    setHistory(historyData);
    setStats(statsData);
  };

  const onSubmit = async (data: NotificationFormData) => {
    const result = await sendNotification(data);
    if (result.success) {
      form.reset();
      loadData();
    }
  };

  const handleManualTrigger = (template: NotificationTemplate) => {
    setConfirmTemplate(template);
  };

  const confirmTrigger = async () => {
    if (confirmTemplate) {
      await triggerManualNotification(confirmTemplate);
      setConfirmTemplate(null);
      loadData();
    }
  };

  return (
    <div className="container mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
          <Bell className="h-8 w-8" />
          Gerenciamento de Notificações
        </h1>
        <p className="text-muted-foreground">
          Envie notificações para usuários e acompanhe o histórico de envios
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas (30 dias)</CardTitle>
            <Send className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_sent}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Leitura</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.average_read_rate}%</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Não Lidas</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_unread}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Enviadas Hoje</CardTitle>
            <History className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.sent_today}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="send" className="space-y-6">
        <TabsList>
          <TabsTrigger value="send">Enviar Notificação</TabsTrigger>
          <TabsTrigger value="templates">Templates Automáticos</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
        </TabsList>

        {/* Send Notification Tab */}
        <TabsContent value="send" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nova Notificação</CardTitle>
              <CardDescription>
                Envie notificações personalizadas para usuários da plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="target_audience"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Destinatários</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="all">Todos os usuários</SelectItem>
                              <SelectItem value="customers">Apenas clientes</SelectItem>
                              <SelectItem value="resellers">Apenas revendedores</SelectItem>
                              <SelectItem value="suppliers">Apenas fornecedores</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="type"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Tipo</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="custom">Personalizado</SelectItem>
                              <SelectItem value="new_feature">Nova Funcionalidade</SelectItem>
                              <SelectItem value="promotion">Promoção</SelectItem>
                              <SelectItem value="system">Sistema</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={form.control}
                    name="title"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Título</FormLabel>
                        <FormControl>
                          <Input placeholder="Ex: Nova funcionalidade disponível!" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="message"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Mensagem</FormLabel>
                        <FormControl>
                          <Textarea 
                            placeholder="Descreva sua notificação aqui..."
                            className="min-h-[100px]"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <Separator />

                  <div className="grid gap-6 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="action_url"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Link de Ação (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="/produtos/novo" {...field} />
                          </FormControl>
                          <FormDescription>
                            URL para onde o usuário será direcionado
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="action_label"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Texto do Botão (Opcional)</FormLabel>
                          <FormControl>
                            <Input placeholder="Ver agora" {...field} />
                          </FormControl>
                          <FormDescription>
                            Texto exibido no botão de ação
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Button type="submit" disabled={loading} size="lg">
                    <Send className="h-4 w-4 mr-2" />
                    {loading ? 'Enviando...' : 'Enviar Notificação'}
                  </Button>
                </form>
              </Form>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="templates" className="space-y-6">
          {templatesLoading ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">Carregando templates...</p>
            </div>
          ) : (
            <>
              <Card className="bg-muted/50">
                <CardContent className="pt-6">
                  <h3 className="font-semibold mb-2">📋 Sobre Templates Automáticos</h3>
                  <p className="text-sm text-muted-foreground">
                    Templates automáticos são disparados por eventos do sistema (mudança de preço, estoque, pedidos, etc.).
                    Você pode personalizar o título, mensagem e condições de cada template.
                  </p>
                </CardContent>
              </Card>
              
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {templates.map((template) => (
                  <NotificationTemplateCard
                    key={template.id}
                    template={template}
                    onToggle={toggleTemplate}
                    onEdit={setEditingTemplate}
                    onManualTrigger={handleManualTrigger}
                  />
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de Envios</CardTitle>
              <CardDescription>
                Últimas notificações enviadas pela plataforma
              </CardDescription>
            </CardHeader>
            <CardContent>
              {history.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground">Nenhuma notificação enviada ainda</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Tipo</TableHead>
                      <TableHead>Título</TableHead>
                      <TableHead>Destinatários</TableHead>
                      <TableHead>Enviados</TableHead>
                      <TableHead>Data</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {history.map((campaign) => (
                      <TableRow key={campaign.id}>
                        <TableCell>
                          <Badge variant="outline">{campaign.type}</Badge>
                        </TableCell>
                        <TableCell className="font-medium">{campaign.title}</TableCell>
                        <TableCell>
                          <Badge>{campaign.target_audience}</Badge>
                        </TableCell>
                        <TableCell>{campaign.sent_count}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDistanceToNow(new Date(campaign.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <NotificationTemplateEditor
        template={editingTemplate}
        open={!!editingTemplate}
        onClose={() => setEditingTemplate(null)}
        onSave={updateTemplate}
      />

      <AlertDialog open={!!confirmTemplate} onOpenChange={() => setConfirmTemplate(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>🔄 Reenviar Notificação?</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <p>
                Você está prestes a disparar manualmente a notificação{' '}
                <strong>"{confirmTemplate?.title_template}"</strong>.
              </p>
              <div className="pt-2 space-y-1 text-sm">
                <p>
                  <strong>Última vez enviada:</strong>{' '}
                  {confirmTemplate?.last_sent_at
                    ? formatDistanceToNow(new Date(confirmTemplate.last_sent_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })
                    : 'Nunca'}
                </p>
                <p>
                  <strong>Destinatários:</strong> <Badge variant="outline">{confirmTemplate?.target_audience}</Badge>
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmTrigger}>Confirmar Envio</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
