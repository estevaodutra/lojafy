import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { usePlans, Plan, PlanFormData } from '@/hooks/usePlans';
import { PlanCard } from '@/components/admin/PlanCard';
import { PlanFormModal } from '@/components/admin/PlanFormModal';
import { PlanFeaturesModal } from '@/components/admin/PlanFeaturesModal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';

const Planos = () => {
  useDocumentTitle('Planos da Plataforma');
  const { plans, isLoading, createPlan, updatePlan, duplicatePlan } = usePlans();

  const [formModal, setFormModal] = useState<{ open: boolean; plan: Plan | null }>({ open: false, plan: null });
  const [featuresModal, setFeaturesModal] = useState<Plan | null>(null);

  const handleSavePlan = (data: PlanFormData) => {
    if (formModal.plan) {
      updatePlan.mutate({ id: formModal.plan.id, data }, { onSuccess: () => setFormModal({ open: false, plan: null }) });
    } else {
      createPlan.mutate(data, { onSuccess: () => setFormModal({ open: false, plan: null }) });
    }
  };

  const handleToggleActive = (plan: Plan) => {
    updatePlan.mutate({ id: plan.id, data: { ativo: !plan.ativo } });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Planos</h1>
          <p className="text-muted-foreground">Configure os planos disponíveis para os usuários</p>
        </div>
        <Button onClick={() => setFormModal({ open: true, plan: null })}>
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground">Carregando planos...</p>
      ) : plans.length === 0 ? (
        <p className="text-muted-foreground">Nenhum plano cadastrado.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={(p) => setFormModal({ open: true, plan: p })}
              onManageFeatures={(p) => setFeaturesModal(p)}
              onDuplicate={(p) => duplicatePlan.mutate(p)}
              onToggleActive={handleToggleActive}
            />
          ))}
        </div>
      )}

      <PlanFormModal
        isOpen={formModal.open}
        onClose={() => setFormModal({ open: false, plan: null })}
        onSave={handleSavePlan}
        plan={formModal.plan}
        isSaving={createPlan.isPending || updatePlan.isPending}
      />

      <PlanFeaturesModal
        isOpen={!!featuresModal}
        onClose={() => setFeaturesModal(null)}
        plan={featuresModal}
      />
    </div>
  );
};

export default Planos;
