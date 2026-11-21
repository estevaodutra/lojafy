import { useEffect, useState } from 'react';
import { ArrowDown, ArrowLeft, ArrowUp, Plus, Save, Trash2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

type JourneyStep = {
  id: string;
  title: string;
  description: string;
  owner: string;
  completion_criteria: string;
  reference_url: string;
};

function isJourneyStep(value: unknown): value is JourneyStep {
  if (!value || typeof value !== 'object') return false;
  const step = value as Record<string, unknown>;
  return ['id', 'title', 'description', 'owner', 'completion_criteria', 'reference_url']
    .every(key => typeof step[key] === 'string');
}

export default function OnboardingResource() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [qualifyUrl, setQualifyUrl] = useState('');
  const [steps, setSteps] = useState<JourneyStep[]>([]);

  useEffect(() => {
    let active = true;
    async function load() {
      const { data, error } = await supabase
        .from('onboarding_journey_config')
        .select('qualify_trigger_url, steps')
        .eq('id', 1)
        .single();

      if (!active) return;
      if (error) {
        setLoadError(error.message);
        toast({ title: 'Não foi possível carregar o roteiro', description: error.message, variant: 'destructive' });
      } else {
        setQualifyUrl(data.qualify_trigger_url);
        setSteps(Array.isArray(data.steps) ? data.steps.filter(isJourneyStep) : []);
      }
      setLoading(false);
    }
    void load();
    return () => { active = false; };
  }, [toast]);

  const updateStep = (id: string, field: keyof JourneyStep, value: string) => {
    setSteps(current => current.map(step => step.id === id ? { ...step, [field]: value } : step));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= steps.length) return;
    setSteps(current => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const save = async () => {
    try {
      const url = new URL(qualifyUrl.trim());
      if (url.protocol !== 'https:') throw new Error('Use uma URL HTTPS para a Qualify.');
      if (steps.some(step => !step.title.trim())) throw new Error('Todas as etapas precisam de um título.');
      if (steps.some(step => step.reference_url.trim() && !/^https:\/\//i.test(step.reference_url.trim()))) {
        throw new Error('Os links de referência devem começar com https://.');
      }

      setSaving(true);
      const normalized = steps.map(step => ({
        ...step,
        title: step.title.trim(),
        description: step.description.trim(),
        owner: step.owner.trim(),
        completion_criteria: step.completion_criteria.trim(),
        reference_url: step.reference_url.trim(),
      }));
      const { error } = await supabase.from('onboarding_journey_config').upsert({
        id: 1,
        qualify_trigger_url: url.toString(),
        steps: normalized,
      });
      if (error) throw error;
      setQualifyUrl(url.toString());
      setSteps(normalized);
      toast({ title: 'Roteiro de onboarding salvo' });
    } catch (error) {
      toast({
        title: 'Não foi possível salvar',
        description: error instanceof Error ? error.message : 'Tente novamente.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-6 text-sm text-muted-foreground">Carregando roteiro...</div>;
  if (loadError) return (
    <div className="mx-auto max-w-4xl p-6 space-y-3">
      <h1 className="text-2xl font-semibold">Roteiro de onboarding</h1>
      <p className="text-sm text-destructive">Não foi possível carregar a configuração: {loadError}</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6 p-3 md:p-6">
      <Button variant="ghost" size="sm" asChild>
        <Link to="/super-admin/recursos"><ArrowLeft className="mr-2 h-4 w-4" />Recursos</Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Roteiro de onboarding</h1>
          <p className="mt-1 text-sm text-muted-foreground">Defina a ordem e o conteúdo de cada etapa da ativação.</p>
        </div>
        <Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />{saving ? 'Salvando...' : 'Salvar roteiro'}</Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Integração com a Qualify</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <Label htmlFor="qualify-url">URL da requisição HTTP</Label>
          <Input id="qualify-url" type="url" value={qualifyUrl} onChange={event => setQualifyUrl(event.target.value)} placeholder="https://..." className="font-mono text-xs" />
          <p className="text-sm text-muted-foreground">
            O envio será iniciado depois da validação dos dados pessoais. A Qualify deverá responder com ID, título, descrição, foto e link de convite do grupo.
          </p>
        </CardContent>
      </Card>

      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold">Etapas da jornada</h2>
          <p className="text-sm text-muted-foreground">{steps.length} etapas no roteiro</p>
        </div>
        <Button variant="outline" onClick={() => setSteps(current => [...current, {
          id: crypto.randomUUID(), title: '', description: '', owner: '', completion_criteria: '', reference_url: '',
        }])}><Plus className="mr-2 h-4 w-4" />Adicionar etapa</Button>
      </div>

      <div className="space-y-4">
        {steps.map((step, index) => (
          <Card key={step.id}>
            <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
              <CardTitle className="text-base">Etapa {index + 1}</CardTitle>
              <div className="flex gap-1">
                <Button variant="ghost" size="icon" aria-label={`Mover etapa ${index + 1} para cima`} disabled={index === 0} onClick={() => moveStep(index, -1)}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Mover etapa ${index + 1} para baixo`} disabled={index === steps.length - 1} onClick={() => moveStep(index, 1)}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" aria-label={`Remover etapa ${index + 1}`} onClick={() => setSteps(current => current.filter(item => item.id !== step.id))}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2"><Label htmlFor={`title-${step.id}`}>Título</Label><Input id={`title-${step.id}`} value={step.title} onChange={event => updateStep(step.id, 'title', event.target.value)} /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor={`description-${step.id}`}>O que será feito</Label><Textarea id={`description-${step.id}`} value={step.description} onChange={event => updateStep(step.id, 'description', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor={`owner-${step.id}`}>Responsável</Label><Input id={`owner-${step.id}`} value={step.owner} onChange={event => updateStep(step.id, 'owner', event.target.value)} placeholder="Parceiro, equipe ou sistema" /></div>
              <div className="space-y-2"><Label htmlFor={`reference-${step.id}`}>Link de referência ou aula</Label><Input id={`reference-${step.id}`} type="url" value={step.reference_url} onChange={event => updateStep(step.id, 'reference_url', event.target.value)} placeholder="https://..." /></div>
              <div className="space-y-2 md:col-span-2"><Label htmlFor={`criteria-${step.id}`}>Critério de conclusão</Label><Textarea id={`criteria-${step.id}`} value={step.completion_criteria} onChange={event => updateStep(step.id, 'completion_criteria', event.target.value)} /></div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="flex justify-end"><Button onClick={save} disabled={saving}><Save className="mr-2 h-4 w-4" />Salvar roteiro</Button></div>
    </div>
  );
}
