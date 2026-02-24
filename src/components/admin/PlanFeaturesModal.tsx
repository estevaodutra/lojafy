import { useState, useEffect } from 'react';
import { Plan } from '@/hooks/usePlans';
import { usePlanFeatures } from '@/hooks/usePlanFeatures';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Settings } from 'lucide-react';
import { PlanFeatureLimitsModal } from './PlanFeatureLimitsModal';

interface PlanFeaturesModalProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
}

export function PlanFeaturesModal({ isOpen, onClose, plan }: PlanFeaturesModalProps) {
  const { planFeatures, allFeatures, isLoading, savePlanFeatures } = usePlanFeatures(plan?.id ?? null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [limites, setLimites] = useState<Record<string, Record<string, any>>>({});
  const [limitsFeature, setLimitsFeature] = useState<{ id: string; nome: string } | null>(null);

  useEffect(() => {
    if (planFeatures.length > 0) {
      setSelectedIds(planFeatures.map((pf: any) => pf.feature_id));
      const lim: Record<string, Record<string, any>> = {};
      planFeatures.forEach((pf: any) => {
        if (pf.limites && Object.keys(pf.limites).length > 0) {
          lim[pf.feature_id] = pf.limites;
        }
      });
      setLimites(lim);
    } else {
      setSelectedIds([]);
      setLimites({});
    }
  }, [planFeatures]);

  const toggleFeature = (featureId: string) => {
    setSelectedIds((prev) =>
      prev.includes(featureId) ? prev.filter((id) => id !== featureId) : [...prev, featureId]
    );
  };

  const handleSave = () => {
    if (!plan) return;
    savePlanFeatures.mutate(
      { planId: plan.id, featureIds: selectedIds, limites },
      { onSuccess: onClose }
    );
  };

  const handleSaveLimits = (featureId: string, newLimites: Record<string, any>) => {
    setLimites((prev) => ({ ...prev, [featureId]: newLimites }));
    setLimitsFeature(null);
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Features do Plano: {plan?.nome}</DialogTitle>
          </DialogHeader>

          {isLoading ? (
            <p className="text-sm text-muted-foreground py-4">Carregando...</p>
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto py-2">
              {allFeatures.map((feature) => {
                const isChecked = selectedIds.includes(feature.id);
                const featureLimites = limites[feature.id];
                const hasLimites = featureLimites && Object.keys(featureLimites).length > 0;

                return (
                  <div
                    key={feature.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={isChecked}
                        onCheckedChange={() => toggleFeature(feature.id)}
                      />
                      <div>
                        <Label className="font-medium">{feature.nome}</Label>
                        {feature.descricao && (
                          <p className="text-xs text-muted-foreground">{feature.descricao}</p>
                        )}
                        {hasLimites && (
                          <p className="text-xs text-primary mt-0.5">
                            Limites: {Object.entries(featureLimites!).map(([k, v]) => `${k}: ${v}`).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                    {isChecked && (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => setLimitsFeature({ id: feature.id, nome: feature.nome })}
                      >
                        <Settings className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          <p className="text-sm text-muted-foreground">
            {selectedIds.length} de {allFeatures.length} features selecionadas
          </p>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button onClick={handleSave} disabled={savePlanFeatures.isPending}>
              {savePlanFeatures.isPending ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanFeatureLimitsModal
        isOpen={!!limitsFeature}
        onClose={() => setLimitsFeature(null)}
        featureName={limitsFeature?.nome ?? ''}
        currentLimites={limitsFeature ? limites[limitsFeature.id] || {} : {}}
        onSave={(newLimites) => limitsFeature && handleSaveLimits(limitsFeature.id, newLimites)}
      />
    </>
  );
}
