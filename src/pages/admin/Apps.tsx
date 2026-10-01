import React from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Webhook, 
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Zap,
  History
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

export const Apps: React.FC = () => {
  const navigate = useNavigate();

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="border-b pb-6">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Recursos</h1>
        <p className="text-muted-foreground mt-1 text-base">
          Gerencie recursos, histórico de edições da plataforma e integrações de webhooks.
        </p>
      </div>

      {/* Grid de Recursos */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card
          onClick={() => navigate('/super-admin/recursos/webhooks')}
          className="group relative cursor-pointer border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-card hover:bg-accent/5 rounded-2xl"
        >
          <CardContent className="h-48 p-6 flex flex-col items-center justify-center text-center">
            {/* Status Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </div>

            {/* Logo & Name */}
            <div className="my-auto flex items-center justify-center gap-3 transition-transform duration-200 group-hover:scale-105">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
                <Webhook className="h-8 w-8 stroke-[2.2]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Webhooks</span>
            </div>

            {/* Action Hint */}
            <div className="absolute bottom-4 text-xs text-muted-foreground opacity-90 group-hover:text-primary transition-colors flex items-center gap-1">
              <span className="font-medium">Configurar Webhooks</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>

        <Card
          onClick={() => navigate('/super-admin/recursos/logs-alteracoes')}
          className="group relative cursor-pointer border border-border/80 hover:border-primary/50 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden bg-card hover:bg-accent/5 rounded-2xl"
        >
          <CardContent className="h-48 p-6 flex flex-col items-center justify-center text-center">
            {/* Status Badge */}
            <div className="absolute top-4 right-4 flex items-center gap-1.5">
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 text-xs font-medium">
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Ativo
              </Badge>
            </div>

            {/* Logo & Name */}
            <div className="my-auto flex items-center justify-center gap-3 transition-transform duration-200 group-hover:scale-105">
              <div className="p-2.5 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm">
                <History className="h-8 w-8 stroke-[2.2]" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Log de Alterações</span>
            </div>

            {/* Action Hint */}
            <div className="absolute bottom-4 text-xs text-muted-foreground opacity-90 group-hover:text-primary transition-colors flex items-center gap-1">
              <span className="font-medium">Ver Histórico de Edições</span>
              <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Apps;
