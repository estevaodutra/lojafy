import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Switch } from '@/components/ui/switch';
import { Brain, Plus, Edit, Trash2, Save, Settings, TestTube } from 'lucide-react';
import { useKnowledgeBase } from '@/hooks/useKnowledgeBase';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';

export default function AIKnowledgeBase() {
  const { knowledge, config, loading, createKnowledge, updateKnowledge, deleteKnowledge, updateConfig } = useKnowledgeBase();
  
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    category: 'faq' as 'faq' | 'policy' | 'product_info' | 'general',
    target_audience: 'all' as 'all' | 'customer' | 'reseller',
    title: '',
    content: '',
    keywords: '',
    priority: 5,
    active: true
  });

  const [configData, setConfigData] = useState({
    platform_context: '',
    ai_tone: '',
    max_response_length: 500,
    escalation_keywords: ''
  });

  const [testMessage, setTestMessage] = useState('');
  const [testResponse, setTestResponse] = useState('');

  // Carregar configuração ao carregar dados
  useState(() => {
    if (config) {
      setConfigData({
        platform_context: config.platform_context,
        ai_tone: config.ai_tone,
        max_response_length: config.max_response_length,
        escalation_keywords: config.escalation_keywords.join(', ')
      });
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const keywordsArray = formData.keywords
      .split(',')
      .map(k => k.trim())
      .filter(k => k);

    if (editingId) {
      await updateKnowledge(editingId, {
        ...formData,
        keywords: keywordsArray
      });
      setEditingId(null);
    } else {
      await createKnowledge({
        ...formData,
        keywords: keywordsArray
      });
    }

    setFormData({
      category: 'faq',
      target_audience: 'all',
      title: '',
      content: '',
      keywords: '',
      priority: 5,
      active: true
    });
  };

  const handleEdit = (item: any) => {
    setEditingId(item.id);
    setFormData({
      category: item.category,
      target_audience: item.target_audience || 'all',
      title: item.title,
      content: item.content,
      keywords: item.keywords.join(', '),
      priority: item.priority,
      active: item.active
    });
  };

  const handleDelete = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este item?')) {
      await deleteKnowledge(id);
    }
  };

  const handleSaveConfig = async () => {
    if (!config) return;

    await updateConfig({
      platform_context: configData.platform_context,
      ai_tone: configData.ai_tone,
      max_response_length: configData.max_response_length,
      escalation_keywords: configData.escalation_keywords
        .split(',')
        .map(k => k.trim())
        .filter(k => k)
    });
  };

  const getCategoryLabel = (category: string) => {
    const labels: Record<string, string> = {
      faq: 'FAQ',
      policy: 'Política',
      product_info: 'Produto',
      general: 'Geral'
    };
    return labels[category] || category;
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      faq: 'blue',
      policy: 'green',
      product_info: 'purple',
      general: 'gray'
    };
    return colors[category] || 'gray';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      <div className="flex items-center gap-3 mb-6">
        <Brain className="h-8 w-8 text-primary" />
        <div>
          <h1 className="text-3xl font-bold">Base de Conhecimento da IA</h1>
          <p className="text-muted-foreground">
            Gerencie as informações que a IA usa para responder clientes
          </p>
        </div>
      </div>

      <Tabs defaultValue="knowledge" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="knowledge">Base de Conhecimento</TabsTrigger>
          <TabsTrigger value="config">Configurações da IA</TabsTrigger>
        </TabsList>

        {/* Tab: Base de Conhecimento */}
        <TabsContent value="knowledge" className="space-y-6">
          {/* Formulário */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Plus className="h-5 w-5" />
                {editingId ? 'Editar Item' : 'Adicionar Novo Item'}
              </CardTitle>
              <CardDescription>
                Adicione FAQs, políticas e informações que a IA deve conhecer
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="category">Categoria</Label>
                    <Select
                      value={formData.category}
                      onValueChange={(value: any) => setFormData({ ...formData, category: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="faq">FAQ</SelectItem>
                        <SelectItem value="policy">Política</SelectItem>
                        <SelectItem value="product_info">Informação de Produto</SelectItem>
                        <SelectItem value="general">Geral</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="priority">Prioridade (0-10)</Label>
                    <Input
                      id="priority"
                      type="number"
                      min="0"
                      max="10"
                      value={formData.priority}
                      onChange={(e) => setFormData({ ...formData, priority: parseInt(e.target.value) })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="title">Título/Pergunta</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Qual o prazo de entrega?"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="content">Resposta/Conteúdo</Label>
                  <Textarea
                    id="content"
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    placeholder="Forneça a resposta completa..."
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="keywords">Palavras-chave (separadas por vírgula)</Label>
                  <Input
                    id="keywords"
                    value={formData.keywords}
                    onChange={(e) => setFormData({ ...formData, keywords: e.target.value })}
                    placeholder="entrega, prazo, envio"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Switch
                    id="active"
                    checked={formData.active}
                    onCheckedChange={(checked) => setFormData({ ...formData, active: checked })}
                  />
                  <Label htmlFor="active">Ativo</Label>
                </div>

                <div className="flex gap-2">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    {editingId ? 'Atualizar' : 'Adicionar'}
                  </Button>
                  {editingId && (
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setEditingId(null);
                        setFormData({
                          category: 'faq',
                          target_audience: 'all',
                          title: '',
                          content: '',
                          keywords: '',
                          priority: 5,
                          active: true
                        });
                      }}
                    >
                      Cancelar
                    </Button>
                  )}
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Tabela */}
          <Card>
            <CardHeader>
              <CardTitle>Itens da Base de Conhecimento ({knowledge.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Categoria</TableHead>
                    <TableHead>Título</TableHead>
                    <TableHead>Palavras-chave</TableHead>
                    <TableHead>Prioridade</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {knowledge.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Badge variant="outline" className={`bg-${getCategoryColor(item.category)}-50`}>
                          {getCategoryLabel(item.category)}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-medium">{item.title}</TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {item.keywords.slice(0, 3).map((keyword, i) => (
                            <Badge key={i} variant="secondary" className="text-xs">
                              {keyword}
                            </Badge>
                          ))}
                          {item.keywords.length > 3 && (
                            <Badge variant="secondary" className="text-xs">
                              +{item.keywords.length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{item.priority}</TableCell>
                      <TableCell>
                        <Badge variant={item.active ? 'default' : 'secondary'}>
                          {item.active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(item)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDelete(item.id)}
                          >
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
        </TabsContent>

        {/* Tab: Configurações */}
        <TabsContent value="config" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Configurações da IA
              </CardTitle>
              <CardDescription>
                Ajuste o comportamento e personalidade da IA
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="platform_context">Contexto da Plataforma</Label>
                <Textarea
                  id="platform_context"
                  value={configData.platform_context}
                  onChange={(e) => setConfigData({ ...configData, platform_context: e.target.value })}
                  placeholder="Descreva sua plataforma, produtos, diferenciais..."
                  rows={4}
                />
              </div>

              <div>
                <Label htmlFor="ai_tone">Tom de Voz da IA</Label>
                <Input
                  id="ai_tone"
                  value={configData.ai_tone}
                  onChange={(e) => setConfigData({ ...configData, ai_tone: e.target.value })}
                  placeholder="Ex: profissional e amigável, descontraído, formal"
                />
              </div>

              <div>
                <Label htmlFor="max_response_length">Tamanho Máximo da Resposta (caracteres)</Label>
                <Input
                  id="max_response_length"
                  type="number"
                  value={configData.max_response_length}
                  onChange={(e) => setConfigData({ ...configData, max_response_length: parseInt(e.target.value) })}
                />
              </div>

              <div>
                <Label htmlFor="escalation_keywords">Palavras de Escalação (separadas por vírgula)</Label>
                <Input
                  id="escalation_keywords"
                  value={configData.escalation_keywords}
                  onChange={(e) => setConfigData({ ...configData, escalation_keywords: e.target.value })}
                  placeholder="urgente, reclamação, não funciona"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  A IA transferirá para humano ao detectar essas palavras
                </p>
              </div>

              <Button onClick={handleSaveConfig}>
                <Save className="h-4 w-4 mr-2" />
                Salvar Configurações
              </Button>
            </CardContent>
          </Card>

          {/* Simulador de Teste */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TestTube className="h-5 w-5" />
                Teste a IA
              </CardTitle>
              <CardDescription>
                Envie uma mensagem e veja como a IA responderia
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="test_message">Mensagem de Teste</Label>
                <Textarea
                  id="test_message"
                  value={testMessage}
                  onChange={(e) => setTestMessage(e.target.value)}
                  placeholder="Digite uma pergunta que um cliente faria..."
                  rows={3}
                />
              </div>

              <Button
                onClick={async () => {
                  toast.info('Simulador em desenvolvimento');
                }}
                disabled={!testMessage.trim()}
              >
                Testar Resposta
              </Button>

              {testResponse && (
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Resposta da IA:</p>
                  <p className="text-sm">{testResponse}</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
