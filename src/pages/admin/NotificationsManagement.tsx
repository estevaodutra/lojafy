import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Bell, Send, History, TrendingUp, AlertCircle, BookOpen } from 'lucide-react';
import { toast } from 'sonner';
import { useAdminNotifications } from '@/hooks/useAdminNotifications';
import { useNotificationTemplates } from '@/hooks/useNotificationTemplates';
import { useAllLessons } from '@/hooks/useAllLessons';
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
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

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
  const [selectedDispatchTemplate, setSelectedDispatchTemplate] = useState<string | null>(null);
  const [selectedLesson, setSelectedLesson] = useState<string | null>(null);
  const [customAudience, setCustomAudience] = useState<string | null>(null);
  const [history, setHistory] = useState<NotificationCampaign[]>([]);
  const [stats, setStats] = useState<NotificationStats>({
    total_sent: 0,
    average_read_rate: 0,
    total_unread: 0,
    sent_today: 0,
  });

  const selectedTemplateData = templates.find(t => t.id === selectedDispatchTemplate);
  const { data: allLessons, isLoading: lessonsLoading } = useAllLessons();

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

  const handleDispatch = async () => {
    if (!selectedTemplateData) return;
    
    // Validate lesson selection for new_lesson notifications
    if (selectedTemplateData.trigger_type === 'new_lesson' && !selectedLesson) {
      toast.error('Selecione uma aula para enviar a notificação');
      return;
    }
    
    const targetAudience = customAudience || selectedTemplateData.target_audience;
    
    const confirmed = window.confirm(
      `Confirma o envio da notificação "${selectedTemplateData.title_template}" para ${getAudienceLabel(targetAudience)}?`
    );
    
    if (confirmed) {
      // Prepare lesson data if new_lesson type
      let lessonData = null;
      if (selectedTemplateData.trigger_type === 'new_lesson' && selectedLesson) {
        const lesson = allLessons?.find(l => l.lesson_id === selectedLesson);
        if (lesson) {
          lessonData = {
            LESSON_ID: lesson.lesson_id,
            LESSON_TITLE: lesson.lesson_title,
            COURSE_ID: lesson.course_id,
            COURSE_NAME: lesson.course_title,
            MODULE_ID: lesson.module_id,
          };
        }
      }
      
      await triggerManualNotification(selectedTemplateData, lessonData, targetAudience);
      setSelectedDispatchTemplate(null);
      setSelectedLesson(null);
      setCustomAudience(null);
      loadData();
    }
  };

  const getAudienceLabel = (audience: string) => {
    const labels: Record<string, string> = {
      'all': '👥 Todos os usuários',
      'customers': '👤 Apenas clientes',
      'resellers': '🏪 Apenas revendedores',
      'suppliers': '📦 Apenas fornecedores',
      'favorites_only': '⭐ Usuários com produto favoritado',
      'enrolled_only': '🎓 Alunos matriculados',
      'customer_only': '👤 Cliente específico',
    };
    return labels[audience] || audience;
  };

  const TRIGGER_LABELS: Record<string, string> = {
    price_decrease: 'Produto mais barato',
    price_increase: 'Produto mais caro',
    back_in_stock: 'Voltou ao estoque',
    low_stock: 'Estoque baixo',
    order_confirmed: 'Pedido confirmado',
    order_shipped: 'Pedido enviado',
    order_delivered: 'Pedido entregue',
    new_lesson: 'Nova aula',
    course_completed: 'Curso concluído',
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
          <TabsTrigger value="dispatcher">Disparador de Notificações</TabsTrigger>
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

        {/* Tab: Disparador de Notificações */}
        <TabsContent value="dispatcher" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>🚀 Disparador de Notificações</CardTitle>
              <CardDescription>
                Selecione um template automático e dispare manualmente para os usuários
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Step 1: Selecionar Template */}
              <div className="space-y-2">
                <Label>Selecione o Template</Label>
                <Select onValueChange={(value) => setSelectedDispatchTemplate(value)} value={selectedDispatchTemplate || ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Escolha um template..." />
                  </SelectTrigger>
                  <SelectContent>
                    {templates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {TRIGGER_LABELS[template.trigger_type]} - {template.title_template}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Step 1b: Selecionar Público-Alvo (Override) */}
              {selectedTemplateData && (
                <div className="space-y-2">
                  <Label className="flex items-center justify-between">
                    <span>Público-Alvo</span>
                    {customAudience && (
                      <Badge variant="secondary" className="text-xs">
                        Sobrescrevendo padrão
                      </Badge>
                    )}
                  </Label>
                  <Select 
                    value={customAudience || selectedTemplateData.target_audience} 
                    onValueChange={(value) => {
                      if (value === selectedTemplateData.target_audience) {
                        setCustomAudience(null);
                      } else {
                        setCustomAudience(value);
                      }
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">👥 Todos os usuários</SelectItem>
                      <SelectItem value="customers">👤 Apenas clientes</SelectItem>
                      <SelectItem value="resellers">🏪 Apenas revendedores</SelectItem>
                      <SelectItem value="suppliers">📦 Apenas fornecedores</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    {customAudience 
                      ? '✏️ Você alterou o público-alvo padrão deste template'
                      : `📋 Usando público-alvo padrão: ${getAudienceLabel(selectedTemplateData.target_audience)}`
                    }
                  </p>
                </div>
              )}

              {/* Lesson Selection - Only for new_lesson */}
              {selectedTemplateData?.trigger_type === 'new_lesson' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Selecione a Aula *
                  </Label>
                  <Select 
                    value={selectedLesson || undefined} 
                    onValueChange={setSelectedLesson}
                    disabled={lessonsLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={lessonsLoading ? "Carregando aulas..." : "Escolha a aula..."} />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px]">
                      {allLessons?.map((lesson) => (
                        <SelectItem key={lesson.lesson_id} value={lesson.lesson_id}>
                          <div className="flex flex-col">
                            <span className="font-medium">{lesson.lesson_title}</span>
                            <span className="text-xs text-muted-foreground">
                              {lesson.course_title} → {lesson.module_title}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    Ao clicar na notificação, o usuário será redirecionado para esta aula
                  </p>
                </div>
              )}

              {/* Step 2: Preview da Notificação */}
              {selectedTemplateData && (
                <Alert>
                  <Bell className="h-4 w-4" />
                  <AlertTitle>{selectedTemplateData.title_template}</AlertTitle>
                  <AlertDescription>{selectedTemplateData.message_template}</AlertDescription>
                </Alert>
              )}

              {/* Step 3: Informações de Destinatários */}
              {selectedTemplateData && (
                <div className="grid gap-4 p-4 border rounded-lg bg-muted/50">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Destinatários:</span>
                    <Badge>{getAudienceLabel(selectedTemplateData.target_audience)}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Última vez enviado:</span>
                    <span className="text-sm text-muted-foreground">
                      {selectedTemplateData.last_sent_at 
                        ? formatDistanceToNow(new Date(selectedTemplateData.last_sent_at), { addSuffix: true, locale: ptBR })
                        : 'Nunca'
                      }
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total enviado:</span>
                    <span className="text-sm font-bold">{selectedTemplateData.total_sent}</span>
                  </div>
                </div>
              )}

              {/* Step 4: Botão de Disparo */}
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setSelectedDispatchTemplate(null)}
                  disabled={!selectedDispatchTemplate}
                >
                  Cancelar
                </Button>
                <Button
                  onClick={handleDispatch}
                  disabled={!selectedDispatchTemplate || loading}
                >
                  <Send className="h-4 w-4 mr-2" />
                  {loading ? 'Enviando...' : 'Disparar Notificação'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Alerta de Aviso */}
          <Alert variant="default" className="bg-amber-50 border-amber-200 dark:bg-amber-950/20 dark:border-amber-900">
            <AlertCircle className="h-4 w-4 text-amber-600 dark:text-amber-500" />
            <AlertTitle className="text-amber-900 dark:text-amber-400">Atenção</AlertTitle>
            <AlertDescription className="text-amber-800 dark:text-amber-300">
              O disparo manual usará <strong>variáveis de exemplo</strong> definidas no sistema. 
              Esta notificação será enviada para todos os usuários conforme o público-alvo configurado no template.
            </AlertDescription>
          </Alert>
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
