import { useState, useEffect } from 'react';
import { Plan, PlanFormData } from '@/hooks/usePlans';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface PlanFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: PlanFormData) => void;
  plan?: Plan | null;
  isSaving: boolean;
}

const iconOptions = [
  { value: 'star', label: '⭐ Star' },
  { value: 'crown', label: '👑 Crown' },
  { value: 'gem', label: '💎 Gem' },
  { value: 'zap', label: '⚡ Zap' },
  { value: 'award', label: '🏆 Award' },
];

const colorOptions = [
  { value: '#6366f1', label: 'Índigo' },
  { value: '#8b5cf6', label: 'Violeta' },
  { value: '#f59e0b', label: 'Âmbar' },
  { value: '#10b981', label: 'Esmeralda' },
  { value: '#ef4444', label: 'Vermelho' },
  { value: '#3b82f6', label: 'Azul' },
  { value: '#ec4899', label: 'Rosa' },
];

function generateSlug(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

export function PlanFormModal({ isOpen, onClose, onSave, plan, isSaving }: PlanFormModalProps) {
  const [form, setForm] = useState<PlanFormData>({
    nome: '',
    slug: '',
    descricao: '',
    preco_mensal: 0,
    preco_anual: 0,
    preco_vitalicio: 0,
    cor: '#6366f1',
    icone: 'star',
    destaque: false,
    ativo: true,
    ordem: 0,
  });

  useEffect(() => {
    if (plan) {
      setForm({
        nome: plan.nome,
        slug: plan.slug,
        descricao: plan.descricao || '',
        preco_mensal: plan.preco_mensal,
        preco_anual: plan.preco_anual,
        preco_vitalicio: plan.preco_vitalicio,
        cor: plan.cor,
        icone: plan.icone,
        destaque: plan.destaque,
        ativo: plan.ativo,
        ordem: plan.ordem,
      });
    } else {
      setForm({
        nome: '',
        slug: '',
        descricao: '',
        preco_mensal: 0,
        preco_anual: 0,
        preco_vitalicio: 0,
        cor: '#6366f1',
        icone: 'star',
        destaque: false,
        ativo: true,
        ordem: 0,
      });
    }
  }, [plan, isOpen]);

  const handleNameChange = (name: string) => {
    setForm((prev) => ({
      ...prev,
      nome: name,
      slug: plan ? prev.slug : generateSlug(name),
    }));
  };

  const handleSubmit = () => {
    if (!form.nome || !form.slug) return;
    onSave(form);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{plan ? 'Editar Plano' : 'Criar Novo Plano'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.nome} onChange={(e) => handleNameChange(e.target.value)} placeholder="Premium" />
            </div>
            <div className="space-y-2">
              <Label>Slug *</Label>
              <Input value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="premium" />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea
              value={form.descricao}
              onChange={(e) => setForm((p) => ({ ...p, descricao: e.target.value }))}
              placeholder="Descrição do plano..."
              rows={2}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Mensal (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_mensal}
                onChange={(e) => setForm((p) => ({ ...p, preco_mensal: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Anual (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_anual}
                onChange={(e) => setForm((p) => ({ ...p, preco_anual: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div className="space-y-2">
              <Label>Vitalício (R$)</Label>
              <Input
                type="number"
                step="0.01"
                value={form.preco_vitalicio}
                onChange={(e) => setForm((p) => ({ ...p, preco_vitalicio: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cor</Label>
              <Select value={form.cor} onValueChange={(v) => setForm((p) => ({ ...p, cor: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {colorOptions.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: c.value }} />
                        {c.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Ícone</Label>
              <Select value={form.icone} onValueChange={(v) => setForm((p) => ({ ...p, icone: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((i) => (
                    <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <Switch checked={form.destaque} onCheckedChange={(v) => setForm((p) => ({ ...p, destaque: v }))} />
              <Label>Plano em destaque</Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.ativo} onCheckedChange={(v) => setForm((p) => ({ ...p, ativo: v }))} />
              <Label>Ativo</Label>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={isSaving || !form.nome || !form.slug}>
            {isSaving ? 'Salvando...' : plan ? 'Salvar Alterações' : 'Criar Plano'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
