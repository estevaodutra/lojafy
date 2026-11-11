import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Clock,
  Bell,
  Sparkles,
  RefreshCw,
  CheckCircle2,
  Calendar,
  AlertCircle,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import {
  executeWeeklyRankingUpdate,
  WeeklyUpdateConfig,
} from '@/services/topProductsService';
import { useToast } from '@/hooks/use-toast';
import { useQueryClient } from '@tanstack/react-query';
import { Feature } from '@/hooks/useFeatures';

interface TopProductsWeeklySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  feature: Feature;
}

export const TopProductsWeeklySettingsModal: React.FC<
  TopProductsWeeklySettingsModalProps
> = ({ isOpen, onClose, feature }) => {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [enabled, setEnabled] = useState<boolean>(true);
  const [limit, setLimit] = useState<number>(10);
  const [notify, setNotify] = useState<boolean>(true);
  const [lastUpdated, setLastUpdated] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isExecutingNow, setIsExecutingNow] = useState<boolean>(false);

  useEffect(() => {
    if (feature && isOpen) {
      const cfg: WeeklyUpdateConfig = feature.metadata?.top_ranking_config || {};
      setEnabled(cfg.auto_update_weekly ?? true);
      setLimit(cfg.limit ?? 10);
      setNotify(cfg.notify_on_update ?? true);
      setLastUpdated(cfg.last_updated_at || null);
    }
  }, [feature, isOpen]);

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const currentMeta = feature.metadata || {};
      const newConfig: WeeklyUpdateConfig = {
        auto_update_weekly: enabled,
        limit,
        notify_on_update: notify,
        last_updated_at: lastUpdated,
        updated_by: 'admin',
      };

      const { error } = await supabase
        .from('features')
        .update({
          metadata: {
            ...currentMeta,
            top_ranking_config: newConfig,
          },
        })
        .eq('id', feature.id);

      if (error) throw error;

      queryClient.invalidateQueries({ queryKey: ['features'] });
      toast({
        title: 'Configurações salvas!',
        description: 'Automação semanal de ranking atualizada com sucesso.',
      });
      onClose();
    } catch (error: any) {
      toast({
        title: 'Erro ao salvar',
        description: error.message || 'Não foi possível salvar as configurações.',
        variant: 'destructive',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunNow = async () => {
    setIsExecutingNow(true);
    try {
      const result = await executeWeeklyRankingUpdate({
        featureId: feature.id,
        limit,
        notify,
      });

      const nowIso = new Date().toISOString();
      setLastUpdated(nowIso);

      queryClient.invalidateQueries({ queryKey: ['feature-products', feature.id] });
      queryClient.invalidateQueries({ queryKey: ['features'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
      queryClient.invalidateQueries({ queryKey: ['top-products-real'] });

      toast({
        title: 'Atualização semanal concluída!',
        description: `${result.productsUpdated} produtos vinculados no ranking Top ${limit}.${
          result.notificationsSent
            ? ' Notificação enviada para todos os usuários!'
            : ''
        }`,
      });
    } catch (error: any) {
      toast({
        title: 'Erro na atualização',
        description: error.message || 'Falha ao processar atualização semanal.',
        variant: 'destructive',
      });
    } finally {
      setIsExecutingNow(false);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return 'Nunca executada';
    try {
      const d = new Date(iso);
      return new Intl.DateTimeFormat('pt-BR', {
        dateStyle: 'short',
        timeStyle: 'short',
      }).format(d);
    } catch {
      return iso;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md p-6">
        <DialogHeader className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-primary/10 text-primary">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-semibold">
                Atualização Semanal Automática
              </DialogTitle>
              <DialogDescription className="text-xs">
                Recálculo automático dos produtos mais vendidos e disparo de notificações.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* Switch de Ativação Geral */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <Label htmlFor="auto-switch" className="text-xs font-semibold cursor-pointer">
                Ativar Atualização Semanal
              </Label>
              <p className="text-[11px] text-muted-foreground">
                Atualiza os produtos mais vendidos a cada 7 dias automaticamente.
              </p>
            </div>
            <Switch
              id="auto-switch"
              checked={enabled}
              onCheckedChange={setEnabled}
            />
          </div>

          {/* Quantidade no Ranking */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider block">
              Tamanho do Ranking Automático
            </Label>
            <div className="grid grid-cols-3 gap-2">
              {[3, 10, 20].map((num) => (
                <Button
                  key={num}
                  type="button"
                  size="sm"
                  variant={limit === num ? 'default' : 'outline'}
                  onClick={() => setLimit(num)}
                  className="font-medium text-xs h-8"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Top {num}
                </Button>
              ))}
            </div>
          </div>

          {/* Notificar todos os usuários */}
          <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/20">
            <div className="space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Bell className="w-3.5 h-3.5 text-primary" />
                <Label htmlFor="notify-switch" className="text-xs font-semibold cursor-pointer">
                  Notificar todos os usuários
                </Label>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Envia uma notificação in-app para todos os usuários informando o novo ranking da semana.
              </p>
            </div>
            <Switch
              id="notify-switch"
              checked={notify}
              onCheckedChange={setNotify}
            />
          </div>

          {/* Status e Última Execução */}
          <div className="p-3 rounded-lg border bg-muted/40 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Clock className="w-3.5 h-3.5" /> Última execução:
              </span>
              <Badge variant="outline" className="text-[11px] font-mono">
                {formatDate(lastUpdated)}
              </Badge>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-muted-foreground flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Status do agendamento:
              </span>
              <Badge
                variant={enabled ? 'default' : 'secondary'}
                className="text-[11px]"
              >
                {enabled ? 'Ativo (Semanal)' : 'Desativado'}
              </Badge>
            </div>
          </div>

          {/* Botão de Disparo Manual Imediato */}
          <div className="pt-1">
            <Button
              type="button"
              variant="secondary"
              className="w-full text-xs h-9 gap-2 border"
              onClick={handleRunNow}
              disabled={isExecutingNow}
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isExecutingNow ? 'animate-spin' : ''}`}
              />
              {isExecutingNow
                ? 'Atualizando e Notificando Usuários...'
                : 'Executar Atualização Semanal Agora'}
            </Button>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t">
          <Button variant="outline" size="sm" onClick={onClose} disabled={isSaving}>
            Cancelar
          </Button>
          <Button
            size="sm"
            onClick={handleSaveSettings}
            disabled={isSaving || isExecutingNow}
            className="gap-1.5"
          >
            {isSaving ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Salvando...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                Salvar Configurações
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
