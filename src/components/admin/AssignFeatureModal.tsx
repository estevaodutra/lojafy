import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useFeatures } from '@/hooks/useFeatures';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface AssignFeatureModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  existingFeatures: string[];
  onSuccess: () => void;
}

const periodOptions = [
  { value: 'mensal', label: 'Mensal (30 dias)' },
  { value: 'anual', label: 'Anual (365 dias)' },
  { value: 'vitalicio', label: 'Vitalício (sem expiração)' },
  { value: 'cortesia', label: 'Cortesia (vitalício)' },
];

export const AssignFeatureModal: React.FC<AssignFeatureModalProps> = ({
  isOpen,
  onClose,
  userId,
  existingFeatures,
  onSuccess,
}) => {
  const { features } = useFeatures();
  const { toast } = useToast();
  const [selectedFeature, setSelectedFeature] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('mensal');
  const [motivo, setMotivo] = useState('');
  const [loading, setLoading] = useState(false);

  // Filter out features the user already has
  const availableFeatures = features.filter(
    (f) => f.ativo && !existingFeatures.includes(f.slug)
  );

  const handleSubmit = async () => {
    if (!selectedFeature) {
      toast({
        title: 'Erro',
        description: 'Selecione uma feature',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.functions.invoke('atribuir-feature', {
        body: {
          user_id: userId,
          feature_slug: selectedFeature,
          tipo_periodo: selectedPeriod,
          motivo: motivo || undefined,
        },
      });

      if (error) throw error;

      toast({
        title: 'Sucesso',
        description: 'Feature atribuída com sucesso!',
      });
      onSuccess();
      handleClose();
    } catch (error: any) {
      toast({
        title: 'Erro',
        description: error.message || 'Falha ao atribuir feature',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setSelectedFeature('');
    setSelectedPeriod('mensal');
    setMotivo('');
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Atribuir Feature</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Feature</Label>
            <Select value={selectedFeature} onValueChange={setSelectedFeature}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione uma feature" />
              </SelectTrigger>
              <SelectContent>
                {availableFeatures.length === 0 ? (
                  <SelectItem value="none" disabled>
                    Nenhuma feature disponível
                  </SelectItem>
                ) : (
                  availableFeatures.map((feature) => (
                    <SelectItem key={feature.slug} value={feature.slug}>
                      {feature.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Período</Label>
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {periodOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo (opcional)</Label>
            <Textarea
              value={motivo}
              onChange={(e) => setMotivo(e.target.value)}
              placeholder="Ex: Cortesia, parceria, teste..."
              rows={2}
            />
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={handleClose}>
            Cancelar
          </Button>
          <Button onClick={handleSubmit} disabled={loading || !selectedFeature}>
            {loading ? 'Atribuindo...' : 'Atribuir'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
