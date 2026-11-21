import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { formatPhone, cleanPhone, validatePhone } from '@/lib/phone';
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
type GroupStatus = 'idle' | 'loading' | 'ready' | 'pending' | 'error';

const emptyPersonal: PersonalData = { name: '', email: '', phone: '', cpf: '' };
const emptyGroup: GroupData = { id: '', title: '', description: '', photo_url: '', invite_url: '' };

function isHttpsUrl(value: string) {
  try { return new URL(value).protocol === 'https:'; } catch { return false; }
}

function personalComplete(data: PersonalData) {
  return data.name.trim().split(/\s+/).length >= 2 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()) &&
    validatePhone(data.phone) && validateCPF(data.cpf);
}

function missingFields(data: PersonalData) {
  return {
    name: data.name.trim().split(/\s+/).length < 2,
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email.trim()),
    phone: !validatePhone(data.phone),
    cpf: !validateCPF(data.cpf),
  };
}

export function OnboardingPreviewDialog({ open, onOpenChange, steps }: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  steps: OnboardingPreviewStep[];
}) {
  const { toast } = useToast();
  const [setupComplete, setSetupComplete] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [registered, setRegistered] = useState<PersonalData>(emptyPersonal);
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal);
  const [group, setGroup] = useState<GroupData>(emptyGroup);
  const [groupStatus, setGroupStatus] = useState<GroupStatus>('idle');
  const [groupError, setGroupError] = useState('');
  const [joinedGroup, setJoinedGroup] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const runToken = useRef(0);

  useEffect(() => {
    if (!open) return;
    runToken.current += 1;
    setSetupComplete(false);
    setSelectedIndex(0);
    setCompleted([]);
    setRegistered({ ...emptyPersonal });
    setPersonal({ ...emptyPersonal });
    setGroup({ ...emptyGroup });
    setGroupStatus('idle');
    setGroupError('');
    setJoinedGroup(false);
    setRequestId(crypto.randomUUID());
    setPartnerId(crypto.randomUUID());
    return () => { runToken.current += 1; };
  }, [open]);

  const step = steps[selectedIndex];
  const progress = steps.length ? Math.round((completed.length / steps.length) * 100) : 0;
  const missing = missingFields(registered);
  const groupIndex = steps.findIndex(item => item.id === 'qualify-group');
  const joinIndex = steps.findIndex(item => item.id === 'join-group');

  const requestGroup = async (data: PersonalData) => {
    if (groupIndex < 0) return;
    if (groupStatus === 'loading') return;
    if (groupStatus === 'ready') {
      setSelectedIndex(joinIndex >= 0 ? joinIndex : groupIndex);
      return;
    }
    const currentRun = runToken.current;
    setSelectedIndex(groupIndex);
    setGroupStatus('loading');
    setGroupError('');
    try {
      const { data: response, error } = await supabase.functions.invoke('onboarding-test-qualify', {
        body: {
          request_id: requestId,
          partner_id: partnerId,
          name: data.name.trim(),
          email: data.email.trim(),
          phone: `+55${cleanPhone(data.phone).replace(/^55/, '')}`,
          cpf: cleanCPF(data.cpf),
        },
      });
      if (currentRun !== runToken.current) return;
      if (error) {
        let message = error.message;
        if ('context' in error && error.context instanceof Response) {
          const details = await error.context.clone().json().catch(() => null);
          if (typeof details?.error === 'string') message = details.error;
        }
        throw new Error(message);
      }
      if (response?.status === 'pending') {
        setGroupStatus('pending');
        return;
      }
      if (response?.status !== 'ready' || !response.group?.invite_url) {
        throw new Error('A Qualify não retornou o link de convite.');
      }
      setGroup(response.group as GroupData);
      setGroupStatus('ready');
      setCompleted(current => current.includes('qualify-group') ? current : [...current, 'qualify-group']);
      if (joinIndex >= 0) setSelectedIndex(joinIndex);
    } catch (error) {
      if (currentRun !== runToken.current) return;
      setGroupError(error instanceof Error ? error.message : 'Não foi possível criar o grupo.');
      setGroupStatus('error');
    }
  };

  const finishPersonalData = async (data: PersonalData) => {
    if (!personalComplete(data)) {
      toast({ title: 'Confira os dados cadastrais', description: 'Nome completo, email, WhatsApp e CPF precisam estar válidos.', variant: 'destructive' });
      return;
    }
    setPersonal(data);
    setCompleted(current => current.includes('personal-data') ? current : [...current, 'personal-data']);
    if (groupIndex >= 0) await requestGroup(data);
    else setSelectedIndex(Math.min(selectedIndex + 1, steps.length - 1));
  };

  const startPreview = async () => {
    setPersonal(registered);
    setSetupComplete(true);
    if (personalComplete(registered) && steps[0]?.id === 'personal-data') {
      await finishPersonalData(registered);
    }
  };

  const completeStep = () => {
    if (!step) return;
    if (step.id === 'join-group' && (groupStatus !== 'ready' || !joinedGroup)) {
      toast({ title: 'Entre no grupo e confirme para avançar', variant: 'destructive' });
      return;
    }
    if (step.id === 'qualify-group' && groupStatus !== 'ready') return;
    setCompleted(current => current.includes(step.id) ? current : [...current, step.id]);
    if (selectedIndex < steps.length - 1) setSelectedIndex(selectedIndex + 1);
    else toast({ title: 'Prévia concluída', description: 'Os dados da Lojafy não foram alterados.' });
  };

  const updateRegistered = (field: keyof PersonalData, value: string) => {
    setRegistered(current => ({ ...current, [field]: value }));
  };
  const updatePersonal = (field: keyof PersonalData, value: string) => {
    setPersonal(current => ({ ...current, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Visualizar e testar onboarding</DialogTitle>
          <DialogDescription>Teste a jornada com dados de cadastro e acompanhe o convite do grupo.</DialogDescription>
        </DialogHeader>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          A etapa da Qualify envia uma requisição real e pode criar um grupo. Este teste não cria conta nem publica anúncios na Lojafy.
        </div>

        {!setupComplete ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">Dados já preenchidos no cadastro de teste</h3>
              <p className="text-sm text-muted-foreground">Informe o que a pessoa já teria cadastrado. Deixe em branco os campos que deseja completar durante o onboarding.</p>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2"><Label htmlFor="registered-name">Nome completo</Label><Input id="registered-name" value={registered.name} onChange={event => updateRegistered('name', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="registered-email">Email</Label><Input id="registered-email" type="email" value={registered.email} onChange={event => updateRegistered('email', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="registered-phone">WhatsApp</Label><Input id="registered-phone" type="tel" value={registered.phone} onChange={event => updateRegistered('phone', formatPhone(event.target.value))} /></div>
              <div className="space-y-2"><Label htmlFor="registered-cpf">CPF</Label><Input id="registered-cpf" value={registered.cpf} onChange={event => updateRegistered('cpf', formatCPF(event.target.value))} /></div>
            </div>
            <Button onClick={() => void startPreview()} disabled={steps.length === 0}>Iniciar teste</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>Progresso da prévia</span><span>{completed.length} de {steps.length} etapas</span></div>
              <Progress value={progress} />
            </div>

            {steps.length === 0 ? <p className="py-10 text-center text-muted-foreground">Adicione etapas ao roteiro para iniciar a prévia.</p> : (
              <div className="grid gap-5 md:grid-cols-[220px_minmax(0,1fr)]">
                <nav aria-label="Etapas do onboarding" className="space-y-1">
                  {steps.map((item, index) => (
                    <button key={item.id} type="button" onClick={() => { if (item.id !== 'qualify-group' || completed.includes('personal-data')) setSelectedIndex(index); }}
                      className={`${item.id === 'personal-data' ? 'hidden md:flex' : 'flex'} w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${index === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
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
                    <div className="space-y-4">
                      {Object.values(missing).every(value => !value) ? <p className="text-sm text-muted-foreground">Os dados cadastrais já estão completos.</p> : <p className="text-sm text-muted-foreground">Preencha somente os dados ausentes ou inválidos.</p>}
                      <div className="grid gap-4 sm:grid-cols-2">
                        {missing.name && <div className="space-y-2 sm:col-span-2"><Label htmlFor="preview-name">Nome completo</Label><Input id="preview-name" value={personal.name} onChange={event => updatePersonal('name', event.target.value)} /></div>}
                        {missing.email && <div className="space-y-2"><Label htmlFor="preview-email">Email</Label><Input id="preview-email" type="email" value={personal.email} onChange={event => updatePersonal('email', event.target.value)} /></div>}
                        {missing.phone && <div className="space-y-2"><Label htmlFor="preview-phone">WhatsApp</Label><Input id="preview-phone" type="tel" value={personal.phone} onChange={event => updatePersonal('phone', formatPhone(event.target.value))} /></div>}
                        {missing.cpf && <div className="space-y-2"><Label htmlFor="preview-cpf">CPF</Label><Input id="preview-cpf" value={personal.cpf} onChange={event => updatePersonal('cpf', formatCPF(event.target.value))} /></div>}
                      </div>
                    </div>
                  )}

                  {step.id === 'qualify-group' && (
                    <div className="space-y-4">
                      {groupStatus === 'loading' && <div className="flex flex-col items-center gap-3 py-8 text-center" role="status"><Loader2 className="h-9 w-9 animate-spin text-primary" /><p className="font-medium">Criando grupo na Qualify...</p><p className="text-sm text-muted-foreground">Aguardando o link de convite.</p></div>}
                      {groupStatus === 'pending' && <p className="rounded-md bg-muted p-4 text-sm">A Qualify ainda está criando o grupo. O convite não chegou nesta resposta.</p>}
                      {groupStatus === 'error' && <p className="rounded-md border border-destructive/40 p-4 text-sm text-destructive" role="alert">{groupError}</p>}
                      {(groupStatus === 'pending' || groupStatus === 'error') && <Button variant="outline" onClick={() => void requestGroup(personal)}>Tentar novamente</Button>}
                      {groupStatus === 'ready' && <GroupCard group={group} />}
                    </div>
                  )}

                  {step.id === 'join-group' && (
                    <div className="space-y-4">
                      {groupStatus === 'ready' ? <GroupCard group={group} /> : <p className="text-sm text-muted-foreground">Aguarde a criação do grupo na etapa anterior.</p>}
                      {groupStatus === 'ready' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={joinedGroup} onChange={event => setJoinedGroup(event.target.checked)} />Confirmo que entrei no grupo</label>}
                    </div>
                  )}

                  {step.reference_url && isHttpsUrl(step.reference_url) && <Button variant="outline" size="sm" asChild><a href={step.reference_url} target="_blank" rel="noopener noreferrer">Abrir referência ou aula<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                  {step.completion_criteria && <p className="rounded-md bg-muted p-3 text-sm"><strong>Critério de conclusão:</strong> {step.completion_criteria}</p>}

                  <div className="flex items-center justify-between gap-2 border-t pt-4">
                    <Button variant="outline" disabled={selectedIndex === 0 || groupStatus === 'loading'} onClick={() => setSelectedIndex(selectedIndex - 1)}>Anterior</Button>
                    {step.id === 'personal-data' ? (
                      <Button onClick={() => void finishPersonalData(personal)} disabled={groupStatus === 'loading'}>Continuar</Button>
                    ) : step.id === 'qualify-group' ? (
                      <Button disabled={groupStatus !== 'ready'} onClick={completeStep}>Continuar</Button>
                    ) : (
                      <Button onClick={completeStep}>{selectedIndex === steps.length - 1 ? 'Concluir prévia' : 'Concluir e avançar'}</Button>
                    )}
                  </div>
                </section>
              </div>
            )}
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function GroupCard({ group }: { group: GroupData }) {
  return (
    <div className="rounded-lg border p-4">
      {group.photo_url && isHttpsUrl(group.photo_url) && <img src={group.photo_url} alt="Foto do grupo" className="mb-3 h-16 w-16 rounded-full object-cover" />}
      <h4 className="font-medium">{group.title}</h4>
      {group.description && <p className="mt-1 text-sm text-muted-foreground">{group.description}</p>}
      <Button variant="outline" size="sm" className="mt-3" asChild><a href={group.invite_url} target="_blank" rel="noopener noreferrer">Entrar no grupo<ExternalLink className="ml-2 h-4 w-4" /></a></Button>
    </div>
  );
}
