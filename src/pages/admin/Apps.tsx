import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Webhook, 
  Search, 
  CheckCircle2, 
  ArrowRight,
  Zap
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';

interface AppItem {
  id: string;
  name: string;
  category: 'developer' | 'crm' | 'fiscal' | 'members' | 'whatsapp';
  description: string;
  status: 'active' | 'available' | 'coming_soon';
  customRoute?: string;
  renderLogo: () => React.ReactNode;
}

export const Apps: React.FC = () => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedApp, setSelectedApp] = useState<AppItem | null>(null);

  const apps: AppItem[] = [
    {
      id: 'webhooks',
      name: 'Webhooks',
      category: 'developer',
      description: 'Envie notificações em tempo real para URLs externas quando eventos ocorrerem na plataforma.',
      status: 'active',
      customRoute: '/super-admin/apps/webhooks',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
            <Webhook className="h-8 w-8 stroke-[2.2]" />
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Webhooks</span>
        </div>
      ),
    },
    {
      id: 'api',
      name: 'API',
      category: 'developer',
      description: 'Documentação completa e chaves de acesso para integração direta com a API REST da Lojafy.',
      status: 'active',
      customRoute: '/super-admin/api-docs',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-3">
          <div className="w-12 h-10 rounded-lg bg-black text-white flex items-center justify-center font-mono font-bold text-lg shadow-sm">
            <span>&gt;_</span>
          </div>
          <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">API</span>
        </div>
      ),
    },
    {
      id: 'hotzapp',
      name: 'Hotzapp',
      category: 'whatsapp',
      description: 'Automação de WhatsApp para recuperação de carrinhos abandonados, boletos e atualizações de pedidos.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-2">
          <div className="text-[#FF5722] font-black text-3xl flex items-center gap-1.5 font-sans">
            <svg className="w-7 h-7" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM9.5 16.5L5 12L6.41 10.59L9.5 13.67L17.59 5.58L19 7L9.5 16.5Z"/>
            </svg>
            <span>hotzapp</span>
          </div>
        </div>
      ),
    },
    {
      id: 'activecampaign',
      name: 'ActiveCampaign',
      category: 'crm',
      description: 'Plataforma líder em automação de marketing por e-mail, nutrição de leads e fluxos de vendas.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center">
          <div className="bg-[#004CFF] text-white px-4 py-2 rounded font-bold text-lg tracking-wide flex items-center gap-1.5 shadow-sm">
            <span>ActiveCampaign</span>
            <span className="text-sm opacity-90">&gt;</span>
          </div>
        </div>
      ),
    },
    {
      id: 'enotas',
      name: 'eNotas',
      category: 'fiscal',
      description: 'Emissão automática de notas fiscais eletrônicas de produto e serviço sincronizadas com suas vendas.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-1.5">
          <span className="text-[#FF007A] font-bold text-3xl">▼</span>
          <span className="text-[#2B3674] dark:text-blue-400 font-bold text-3xl tracking-tight">enotas</span>
        </div>
      ),
    },
    {
      id: 'notazz',
      name: 'Notazz',
      category: 'fiscal',
      description: 'Gestão fiscal automatizada para e-commerce e afiliados, integração simplificada com SEFAZ.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center">
          <div className="border-2 border-[#0099FF] rounded px-3 py-1 text-[#0099FF] font-bold text-2xl tracking-tighter">
            notazz
          </div>
        </div>
      ),
    },
    {
      id: 'leadlovers',
      name: 'Leadlovers',
      category: 'crm',
      description: 'Automação de e-mail marketing, funis de vendas completos e captura de leads qualificados.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-7 h-7 rounded-full border-2 border-[#E91E63] flex items-center justify-center">
            <div className="w-3.5 h-3.5 bg-[#E91E63] rounded-full" />
          </div>
          <span className="text-[#E91E63] font-bold text-2xl">leadlovers</span>
        </div>
      ),
    },
    {
      id: 'mailchimp',
      name: 'Mailchimp',
      category: 'crm',
      description: 'Envio de campanhas de e-mail marketing, newsletters promocionais e segmentação avançada.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-2 text-slate-900 dark:text-white">
          <span className="text-3xl">🐵</span>
          <span className="font-extrabold text-2xl tracking-tight">mailchimp</span>
        </div>
      ),
    },
    {
      id: 'memberkit',
      name: 'Memberkit',
      category: 'members',
      description: 'Área de membros externa para infoprodutos, cursos e treinamentos com liberação automática de alunos.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center">
          <span className="text-[#6C5CE7] font-extrabold text-3xl tracking-tight">memberkit</span>
        </div>
      ),
    },
    {
      id: 'mailingboss',
      name: 'MailingBoss',
      category: 'crm',
      description: 'Ferramenta de e-mail marketing da Builderall com fluxos ilimitados e automações inteligentes.',
      status: 'available',
      renderLogo: () => (
        <div className="flex flex-col items-center justify-center">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🐙</span>
            <span className="text-[#2D9CDB] font-bold text-2xl">Mailing<span className="font-normal text-slate-700 dark:text-slate-300">Boss</span></span>
          </div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Builderall</span>
        </div>
      ),
    },
    {
      id: 'tiny',
      name: 'Tiny ERP',
      category: 'fiscal',
      description: 'ERP completo para pequenas e médias lojas, controle de estoque centralizado e emissão de notas.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center">
          <span className="text-[#1062FE] font-black text-3xl italic tracking-tight">tiny</span>
        </div>
      ),
    },
    {
      id: 'bling',
      name: 'Bling ERP',
      category: 'fiscal',
      description: 'Sistema de gestão integrado para e-commerce com faturamento rápido, estoque e logística.',
      status: 'available',
      renderLogo: () => (
        <div className="flex items-center justify-center gap-2">
          <div className="w-6 h-6 rounded-full bg-[#00A859] flex items-center justify-center text-white font-bold text-xs">B</div>
          <span className="text-[#00A859] font-bold text-2xl">Bling!</span>
        </div>
      ),
    },
  ];

  const categories = [
    { id: 'all', label: 'Todos' },
    { id: 'developer', label: 'Desenvolvedor & API' },
    { id: 'whatsapp', label: 'WhatsApp & Mensagens' },
    { id: 'crm', label: 'E-mail & CRM' },
    { id: 'fiscal', label: 'Fiscal & ERP' },
    { id: 'members', label: 'Área de Membros' },
  ];

  const filteredApps = apps.filter(app => {
    const matchesCategory = selectedCategory === 'all' || app.category === selectedCategory;
    const matchesSearch = app.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          app.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const handleCardClick = (app: AppItem) => {
    if (app.customRoute) {
      navigate(app.customRoute);
    } else {
      setSelectedApp(app);
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Apps</h1>
          <p className="text-muted-foreground mt-1 text-base">
            Conecte a Lojafy aos seus sistemas favoritos: webhooks, automações de marketing, ERPs e mensageria.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button 
            onClick={() => navigate('/super-admin/apps/webhooks')}
            className="gap-2 shadow-sm font-medium"
          >
            <Webhook className="h-4 w-4" />
            Configurar Webhooks
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                selectedCategory === cat.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'bg-muted/70 hover:bg-muted text-muted-foreground hover:text-foreground'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar aplicativo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 h-9 text-sm"
          />
        </div>
      </div>

      {/* Grid of Apps (matching user screenshot) */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {filteredApps.map((app) => (
          <Card
            key={app.id}
            onClick={() => handleCardClick(app)}
            className="group relative cursor-pointer border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-card hover:bg-accent/5 rounded-2xl"
          >
            <CardContent className="h-44 p-6 flex flex-col items-center justify-center text-center">
              {/* Status Badge */}
              <div className="absolute top-4 right-4 flex items-center gap-1.5">
                {app.status === 'active' && (
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Ativo
                  </Badge>
                )}
                {app.status === 'available' && (
                  <Badge variant="outline" className="text-xs text-muted-foreground border-border/60">
                    Disponível
                  </Badge>
                )}
              </div>

              {/* Logo / Brand Name */}
              <div className="my-auto transition-transform duration-200 group-hover:scale-105">
                {app.renderLogo()}
              </div>

              {/* Action Hint on Hover */}
              <div className="absolute bottom-3 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                <span>Clique para configurar</span>
                <ArrowRight className="h-3 w-3" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredApps.length === 0 && (
        <div className="text-center py-12 border rounded-2xl bg-card">
          <p className="text-muted-foreground">Nenhum aplicativo encontrado para os filtros selecionados.</p>
          <Button variant="ghost" onClick={() => { setSearchTerm(''); setSelectedCategory('all'); }} className="mt-2 text-sm">
            Limpar filtros
          </Button>
        </div>
      )}

      {/* Generic Modal for 3rd Party Integrations */}
      <Dialog open={!!selectedApp} onOpenChange={(open) => !open && setSelectedApp(null)}>
        {selectedApp && (
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <div className="py-4 flex justify-center">
                {selectedApp.renderLogo()}
              </div>
              <DialogTitle className="text-center text-xl">{selectedApp.name}</DialogTitle>
              <DialogDescription className="text-center text-sm pt-1">
                {selectedApp.description}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4 border-y text-sm">
              <div className="bg-muted/50 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-medium text-foreground">
                  <Zap className="h-4 w-4 text-primary" />
                  <span>Integração via Webhooks</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Você pode integrar o <strong>{selectedApp.name}</strong> instantaneamente apontando seus eventos de webhook (ex: <em>user.created</em>, <em>order.paid</em>) para a URL da sua automação no painel de Webhooks.
                </p>
              </div>

              <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                <span>Status da conexão:</span>
                <Badge variant="secondary">Pronto para conectar</Badge>
              </div>
            </div>

            <DialogFooter className="flex flex-col sm:flex-row gap-2">
              <Button
                variant="outline"
                onClick={() => setSelectedApp(null)}
                className="w-full sm:w-auto"
              >
                Fechar
              </Button>
              <Button
                onClick={() => {
                  setSelectedApp(null);
                  navigate('/super-admin/apps/webhooks');
                }}
                className="w-full sm:w-auto gap-2"
              >
                <Webhook className="h-4 w-4" />
                Ir para Webhooks
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
};

export default Apps;
