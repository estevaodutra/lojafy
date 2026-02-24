import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface PlanFeatureLimitsModalProps {
  isOpen: boolean;
  onClose: () => void;
  featureName: string;
  currentLimites: Record<string, any>;
  onSave: (limites: Record<string, any>) => void;
}

export function PlanFeatureLimitsModal({
  isOpen,
  onClose,
  featureName,
  currentLimites,
  onSave,
}: PlanFeatureLimitsModalProps) {
  const [jsonText, setJsonText] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    setJsonText(JSON.stringify(currentLimites, null, 2));
    setError('');
  }, [currentLimites, isOpen]);

  const handleSave = () => {
    try {
      const parsed = JSON.parse(jsonText || '{}');
      onSave(parsed);
    } catch {
      setError('JSON inválido');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Limites: {featureName}</DialogTitle>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div className="space-y-2">
            <Label>Configuração de limites (JSON)</Label>
            <Textarea
              value={jsonText}
              onChange={(e) => {
                setJsonText(e.target.value);
                setError('');
              }}
              rows={8}
              className="font-mono text-sm"
              placeholder='{"max_produtos": 50}'
            />
            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>

          <div className="text-xs text-muted-foreground space-y-1">
            <p><strong>Exemplos:</strong></p>
            <p>Loja: {`{"max_produtos": 100, "max_categorias": 10}`}</p>
            <p>Academy: {`{"cursos_ilimitados": true}`}</p>
            <p>Integra: {`{"max_integracoes": 2}`}</p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Limites</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
