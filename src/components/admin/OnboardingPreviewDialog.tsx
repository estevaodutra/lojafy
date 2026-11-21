import { useEffect, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { formatCPF, validateCPF } from '@/lib/cpf';
import { formatPhone, validatePhone } from '@/lib/phone';
import { useToast } from '@/hooks/use-toast';

export type OnboardingPreviewStep = {
  id: string;
  title: string;
  description: string;
  owner: string;
  completion_criteria: string;
  reference_url: string;
};

type PersonalData = { name: string; email: string; phone: string; cpf: string };
type GroupData = { id: string; title: string; description: string; photo_url: string; invite_url: string };

const emptyPersonalData: PersonalData = { name: '', email: '', phone: '', cpf: '' };
const emptyGroupData: GroupData = { id: '', title: '', description: '', photo_url: '', invite_url: '' };

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

export function OnboardingPreviewDialog({
  open,
  onOpenChange,
  steps,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: OnboardingPreviewStep[];
}) {
  const { toast } = useToast();
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonalData);
  const [group, setGroup] = useState<GroupData>(emptyGroupData);
  const [joinedGroup, setJoinedGroup] = useState(false);

  useEffect(() => {
    if (!open) return;
    setSelectedIndex(0);
    setCompleted([]);
    setPersonal({ ...emptyPersonalData });
    setGroup({ ...emptyGroupData });
    setJoinedGroup(false);
  }, [open]);

  const step = steps[selectedIndex];
  const progress = steps.length ? Math.round((completed.length / steps.length) * 100) : 0;

  const completeStep = () => {
    if (!step) return;
    if (step.id === 'personal-data') {
      if (personal.name.trim().split(/\s+/).length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(personal.email.trim()) || !validatePhone(personal.phone) || !validateCPF(personal.cpf)) {
        toast({ title: 'Confira os dados pessoais', description: 'Informe nome completo, email, telefone e CPF válidos.', variant: 'destructive' });
        return;
      }
    }
    if (step.id === 'qualify-group') {
      if (!completed.includes('personal-data')) {
        toast({ title: 'Complete os dados pessoais primeiro', variant: 'destructive' });
        return;
      }
      if (!group.id.trim() || !group.title.trim() || !isHttpsUrl(group.invite_url) || (group.photo_url.trim() && !isHttpsUrl(group.photo_url))) {
        toast({ title: 'Confira a resposta do grupo', description: 'Informe ID, título e URL HTTPS do convite. A foto, se informada, também deve ser HTTPS.', variant: 'destructive' });
        return;
      }
    }
    if (step.id === 'join-group' && (!completed.includes('qualify-group') || !joinedGroup)) {
      toast({ title: 'Confirme a entrada no grupo para avançar', variant: 'destructive' });
      return;
    }

    setCompleted(current => current.includes(step.id) ? current : [...current, step.id]);
    if (selectedIndex < steps.length - 1) setSelectedIndex(selectedIndex + 1);
    else toast({ title: 'Prévia concluída', description: 'O teste não alterou dados reais.' });
  };

  const updatePersonal = (field: keyof PersonalData, value: string) => {
    setPersonal(current => ({ ...current, [field]: value }));
  };
  const updateGroup = (field: keyof GroupData, value: string) => {
    setGroup(current => ({ ...current, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Visualizar e testar onboarding</DialogTitle>
          <DialogDescription>Prévia da jornada do parceiro. Os dados preenchidos aqui ficam apenas neste teste.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border bg-muted/40 p-3 text-sm">
          <div className="flex items-center gap-2 font-medium"><ShieldCheck className="h-4 w-4" />Simulação</div>
          <p className="mt-1 text-muted-foreground">Nenhuma conta, grupo ou anúncio será criado. Na etapa da Qualify, informe a resposta que deseja visualizar.</p>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between text-sm"><span>Progresso da prévia</span><span>{completed.length} de {steps.length} etapas</span></div>
          <Progress value={progress} />
        </div>

        {steps.length === 0 ? <p className="py-10 text-center text-muted-foreground">Adicione etapas ao roteiro para iniciar a prévia.</p> : (
          <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
            <nav aria-label="Etapas do onboarding" className="space-y-1">
              {steps.map((item, index) => (
                <button key={item.id} type="button" onClick={() => setSelectedIndex(index)}
                  className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${index === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                  {completed.includes(item.id) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">{index + 1}</span>}
                  <span>{item.title || `Etapa ${index + 1}`}</span>
                </button>
              ))}
            </nav>

            <section className="min-w-0 space-y-5 rounded-lg border p-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa {selectedIndex + 1} de {steps.length}</p>
                <h3 className="mt-1 text-xl font-semibold">{step.title || 'Nova etapa'}</h3>
                {step.description && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
              </div>

              {step.id === 'personal-data' && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 sm:col-span-2"><Label htmlFor="preview-name">Nome completo</Label><Input id="preview-name" value={personal.name} onChange={event => updatePersonal('name', event.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="preview-email">Email</Label><Input id="preview-email" type="email" value={personal.email} onChange={event => updatePersonal('email', event.target.value)} /></div>
                  <div className="space-y-2"><Label htmlFor="preview-phone">Telefone</Label><Input id="preview-phone" type="tel" value={personal.phone} onChange={event => updatePersonal('phone', formatPhone(event.target.value))} /></div>
                  <div className="space-y-2"><Label htmlFor="preview-cpf">CPF</Label><Input id="preview-cpf" value={personal.cpf} onChange={event => updatePersonal('cpf', formatCPF(event.target.value))} /></div>
                </div>
              )}

              {step.id === 'qualify-group' && (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">Resposta da Qualify para esta simulação</p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="preview-group-id">ID do grupo</Label><Input id="preview-group-id" value={group.id} onChange={event => updateGroup('id', event.target.value)} /></div>
                    <div className="space-y-2"><Label htmlFor="preview-group-title">Título</Label><Input id="preview-group-title" value={group.title} onChange={event => updateGroup('title', event.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="preview-group-description">Descrição</Label><Textarea id="preview-group-description" value={group.description} onChange={event => updateGroup('description', event.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="preview-group-photo">URL da foto</Label><Input id="preview-group-photo" type="url" value={group.photo_url} onChange={event => updateGroup('photo_url', event.target.value)} /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="preview-group-invite">URL de convite</Label><Input id="preview-group-invite" type="url" value={group.invite_url} onChange={event => updateGroup('invite_url', event.target.value)} /></div>
                  </div>
                </div>
              )}

              {step.id === 'join-group' && (
                <div className="space-y-4">
                  <div className="rounded-lg border p-4">
                    {group.photo_url && isHttpsUrl(group.photo_url) && <img src={group.photo_url} alt="Foto do grupo" className="mb-3 h-16 w-16 rounded-full object-cover" />}
                    <h4 className="font-medium">{group.title || 'Grupo sem título'}</h4>
                    <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>
                    {group.invite_url && isHttpsUrl(group.invite_url) && <Button variant="outline" size="sm" className="mt-3" asChild><a href={group.invite_url} target="_blank" rel="noopener noreferrer">Entrar no grupo<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                  </div>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={joinedGroup} onChange={event => setJoinedGroup(event.target.checked)} />Confirmo que entrei no grupo nesta simulação</label>
                </div>
              )}

              {step.reference_url && isHttpsUrl(step.reference_url) && <Button variant="outline" size="sm" asChild><a href={step.reference_url} target="_blank" rel="noopener noreferrer">Abrir referência ou aula<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
              {step.completion_criteria && <p className="rounded-md bg-muted p-3 text-sm"><strong>Critério de conclusão:</strong> {step.completion_criteria}</p>}

              <div className="flex items-center justify-between gap-2 border-t pt-4">
                <Button variant="outline" disabled={selectedIndex === 0} onClick={() => setSelectedIndex(selectedIndex - 1)}>Anterior</Button>
                <Button onClick={completeStep}>{selectedIndex === steps.length - 1 ? 'Concluir prévia' : 'Concluir e avançar'}</Button>
              </div>
            </section>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
