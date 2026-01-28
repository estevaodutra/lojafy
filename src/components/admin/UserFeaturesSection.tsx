import React, { useState } from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Store,
  Globe,
  Palette,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Mail,
  Code,
  ShoppingCart,
  Headphones,
  GraduationCap,
  Award,
  Sparkles,
  Plus,
  X,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useUserFeatures, UserFeature } from '@/hooks/useUserFeatures';
import { AssignFeatureModal } from './AssignFeatureModal';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

const iconMap: Record<string, React.ElementType> = {
  Store,
  Globe,
  Palette,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Mail,
  Code,
  ShoppingCart,
  HeadphonesIcon: Headphones,
  GraduationCap,
  Award,
  Sparkles,
};

interface UserFeaturesSectionProps {
  userId: string;
}

const periodLabels: Record<string, string> = {
  mensal: 'Mensal',
  anual: 'Anual',
  vitalicio: 'Vitalício',
  trial: 'Trial',
  cortesia: 'Cortesia',
};

export const UserFeaturesSection: React.FC<UserFeaturesSectionProps> = ({
  userId,
}) => {
  const { features, isLoading, refetch } = useUserFeatures(userId);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [revokeDialogOpen, setRevokeDialogOpen] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState<UserFeature | null>(null);
  const [revoking, setRevoking] = useState(false);
  const { toast } = useToast();

  const handleRevoke = async () => {
    if (!selectedFeature) return;

    setRevoking(true);
    try {
      const { error } = await supabase.functions.invoke('revogar-feature', {
        body: {
          user_id: userId,
          feature_slug: selectedFeature.feature_slug,
          motivo: 'Revogado pelo administrador',
        },
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Feature revogada com sucesso!',
      });
      refetch();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao revogar feature',
        variant: 'destructive',
      });
    } finally {
      setRevoking(false);
      setRevokeDialogOpen(false);
      setSelectedFeature(null);
    }
  };

  const getIcon = (iconName: string) => {
    return iconMap[iconName] || Sparkles;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-6">
          <div className="text-center text-muted-foreground">Carregando...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4" />
              Features do Usuário ({features.length})
            </CardTitle>
            <Button
              size="sm"
              onClick={() => setAssignModalOpen(true)}
            >
              <Plus className="w-4 h-4 mr-1" />
              Atribuir
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {features.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Nenhuma feature atribuída
            </p>
          ) : (
            <div className="space-y-3">
              {features.map((feature) => {
                const Icon = getIcon(feature.feature_icone);
                return (
                  <div
                    key={feature.feature_id}
                    className="p-3 border rounded-lg"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Icon className="w-4 h-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium text-sm">
                            {feature.feature_nome}
                          </p>
                          <div className="flex items-center gap-2 mt-1 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {periodLabels[feature.tipo_periodo]}
                            </Badge>
                            <Badge
                              variant={
                                feature.status === 'ativo'
                                  ? 'default'
                                  : 'secondary'
                              }
                              className="text-xs"
                            >
                              {feature.status}
                            </Badge>
                          </div>
                          {feature.data_expiracao && (
                            <div className="flex items-center gap-1 mt-2 text-xs text-muted-foreground">
                              <Clock className="w-3 h-3" />
                              {feature.dias_restantes !== null &&
                              feature.dias_restantes <= 7 ? (
                                <span className="text-destructive flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  Expira em {feature.dias_restantes} dias
                                </span>
                              ) : (
                                <span>
                                  Expira em{' '}
                                  {format(
                                    new Date(feature.data_expiracao),
                                    "dd/MM/yyyy",
                                    { locale: ptBR }
                                  )}
                                </span>
                              )}
                            </div>
                          )}
                          {feature.motivo && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Motivo: {feature.motivo}
                            </p>
                          )}
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                        onClick={() => {
                          setSelectedFeature(feature);
                          setRevokeDialogOpen(true);
                        }}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <AssignFeatureModal
        isOpen={assignModalOpen}
        onClose={() => setAssignModalOpen(false)}
        userId={userId}
        existingFeatures={features.map((f) => f.feature_slug)}
        onSuccess={refetch}
      />

      <AlertDialog open={revokeDialogOpen} onOpenChange={setRevokeDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revogar Feature</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja revogar a feature "
              {selectedFeature?.feature_nome}"? O usuário perderá acesso
              imediatamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRevoke}
              disabled={revoking}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {revoking ? 'Revogando...' : 'Revogar'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
