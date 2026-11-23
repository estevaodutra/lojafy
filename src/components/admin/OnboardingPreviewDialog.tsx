import { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Eye, Loader2, Monitor, Smartphone } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { formatCPF, cleanCPF, validateCPF } from '@/lib/cpf';
import { formatPhone, cleanPhone, validatePhone } from '@/lib/phone';
import { useToast } from '@/hooks/use-toast';
import { MercadoLivreConnectionCard } from '@/components/reseller/MercadoLivreConnectionCard';
import { OnboardingCommerceStep, type OnboardingProduct } from '@/components/reseller/OnboardingCommerceStep';
import { OnboardingGroupCard } from '@/components/reseller/OnboardingGroupCard';
import { OnboardingStockAddress } from '@/components/reseller/OnboardingStockAddress';

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
type QualifyDebug = { httpStatus: number; payload: unknown };
type PreviewDevice = 'desktop' | 'mobile';

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
  const [device, setDevice] = useState<PreviewDevice>('desktop');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [completed, setCompleted] = useState<string[]>([]);
  const [registered, setRegistered] = useState<PersonalData>(emptyPersonal);
  const [personal, setPersonal] = useState<PersonalData>(emptyPersonal);
  const [group, setGroup] = useState<GroupData>(emptyGroup);
  const [groupStatus, setGroupStatus] = useState<GroupStatus>('idle');
  const [groupSkipped, setGroupSkipped] = useState(false);
  const [groupError, setGroupError] = useState('');
  const [qualifyDebug, setQualifyDebug] = useState<QualifyDebug | null>(null);
  const [joinedGroup, setJoinedGroup] = useState(false);
  const [requestId, setRequestId] = useState('');
  const [partnerId, setPartnerId] = useState('');
  const [simulatedMlConnected, setSimulatedMlConnected] = useState(false);
  const [previewProducts, setPreviewProducts] = useState<OnboardingProduct[]>([]);
  const runToken = useRef(0);

  useEffect(() => {
    if (!open) return;
    runToken.current += 1;
    setSetupComplete(false);
    setDevice('desktop');
    setSelectedIndex(0);
    setCompleted([]);
    setRegistered({ ...emptyPersonal });
    setPersonal({ ...emptyPersonal });
    setGroup({ ...emptyGroup });
    setGroupStatus('idle');
    setGroupSkipped(false);
    setGroupError('');
    setQualifyDebug(null);
    setJoinedGroup(false);
    setRequestId(crypto.randomUUID());
    setPartnerId(crypto.randomUUID());
    setSimulatedMlConnected(false);
    setPreviewProducts([]);
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
    setQualifyDebug(null);
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
          if (details?.debug && typeof details.debug.httpStatus === 'number') setQualifyDebug(details.debug as QualifyDebug);
        }
        throw new Error(message);
      }
      if (response?.debug && typeof response.debug.httpStatus === 'number') {
        setQualifyDebug(response.debug as QualifyDebug);
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
    if (groupIndex >= 0) setSelectedIndex(groupIndex);
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
    if (step.id === 'join-group' && !groupSkipped && (groupStatus !== 'ready' || !joinedGroup)) {
      toast({ title: 'Entre no grupo e confirme para avançar', variant: 'destructive' });
      return;
    }
    if (step.id === 'qualify-group' && groupStatus !== 'ready' && !groupSkipped) return;
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
      <DialogContent className="max-h-[92vh] w-[96vw] max-w-6xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2"><Eye className="h-5 w-5" />Visualizar e testar onboarding</DialogTitle>
          <DialogDescription>Teste a jornada com dados de cadastro e acompanhe o convite do grupo.</DialogDescription>
        </DialogHeader>

        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3">
          <div><p className="text-sm font-medium">Visualização do parceiro</p><p className="text-xs text-muted-foreground">Alterne o formato sem reiniciar o teste.</p></div>
          <div role="group" aria-label="Formato de visualização" className="flex gap-1 rounded-md bg-muted p-1">
            <Button type="button" size="sm" variant={device === 'desktop' ? 'default' : 'ghost'} aria-pressed={device === 'desktop'} onClick={() => setDevice('desktop')}><Monitor className="mr-2 h-4 w-4" />Desktop</Button>
            <Button type="button" size="sm" variant={device === 'mobile' ? 'default' : 'ghost'} aria-pressed={device === 'mobile'} onClick={() => setDevice('mobile')}><Smartphone className="mr-2 h-4 w-4" />Mobile</Button>
          </div>
        </div>

        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-950 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
          A etapa da Qualify envia uma requisição real e pode criar um grupo. Use “Pular criação do grupo” para testar as próximas etapas sem criar outro. Este teste não cria conta nem publica anúncios na Lojafy.
        </div>

        <div className={`mx-auto rounded-xl border bg-muted/40 transition-[width] ${device === 'mobile' ? 'w-[390px] max-w-full p-2' : 'w-full p-4'}`}>
          <div className={`mx-auto min-w-0 rounded-xl border bg-background p-6 shadow-sm ${device === 'mobile' ? 'w-[96%]' : 'w-full max-w-4xl'}`}>
        {!setupComplete ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-semibold">Dados já preenchidos no cadastro de teste</h3>
              <p className="text-sm text-muted-foreground">Informe o que a pessoa já teria cadastrado. Deixe em branco os campos que deseja completar durante o onboarding.</p>
            </div>
            <div className={`grid gap-4 ${device === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
              <div className={`space-y-2 ${device === 'desktop' ? 'sm:col-span-2' : ''}`}><Label htmlFor="registered-name">Nome completo</Label><Input id="registered-name" value={registered.name} onChange={event => updateRegistered('name', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="registered-email">Email</Label><Input id="registered-email" type="email" value={registered.email} onChange={event => updateRegistered('email', event.target.value)} /></div>
              <div className="space-y-2"><Label htmlFor="registered-phone">WhatsApp</Label><Input id="registered-phone" type="tel" value={registered.phone} onChange={event => updateRegistered('phone', formatPhone(event.target.value))} /></div>
              <div className="space-y-2"><Label htmlFor="registered-cpf">CPF</Label><Input id="registered-cpf" value={registered.cpf} onChange={event => updateRegistered('cpf', formatCPF(event.target.value))} /></div>
            </div>
            <Button onClick={() => void startPreview()} disabled={steps.length === 0}>Iniciar teste</Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span>{device === 'mobile' ? 'Etapa atual' : 'Progresso da prévia'}</span><span>{device === 'mobile' ? `${Math.min(selectedIndex + 1, steps.length)} de ${steps.length}` : `${completed.length} de ${steps.length} etapas`}</span></div>
              <Progress value={device === 'mobile' && steps.length ? Math.min((selectedIndex + 1) / steps.length * 100, 100) : progress} />
            </div>

            {steps.length === 0 ? <p className="py-10 text-center text-muted-foreground">Adicione etapas ao roteiro para iniciar a prévia.</p> : (
              <div className={`grid gap-5 ${device === 'mobile' ? 'grid-cols-1' : 'md:grid-cols-[220px_minmax(0,1fr)]'}`}>
                <nav aria-label="Etapas do onboarding" className={`${device === 'mobile' ? 'hidden' : 'block'} space-y-1`}>
                  {steps.map((item, index) => (
                    <button key={item.id} type="button" onClick={() => { if (item.id !== 'qualify-group' || completed.includes('personal-data')) setSelectedIndex(index); }}
                      className={`${item.id === 'personal-data' ? device === 'mobile' ? 'hidden' : 'hidden md:flex' : 'flex'} w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm ${index === selectedIndex ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}>
                      {completed.includes(item.id) ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="flex h-4 w-4 shrink-0 items-center justify-center text-xs">{index + 1}</span>}
                      <span>{item.id === 'qualify-group' ? 'Criar Grupo' : item.title || `Etapa ${index + 1}`}</span>
                    </button>
                  ))}
                </nav>

                <section className="min-w-0 space-y-5 rounded-lg border p-4">
                  <div>
                    {device === 'desktop' && <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Etapa {selectedIndex + 1} de {steps.length}</p>}
                    <h3 className="mt-1 text-xl font-semibold">{step.id === 'qualify-group' ? 'Criar Grupo' : step.title || 'Nova etapa'}</h3>
                    {step.description && <p className="mt-2 text-sm text-muted-foreground">{step.description}</p>}
                  </div>

                  {step.id === 'personal-data' && (
                    <div className="space-y-4">
                      {Object.values(missing).every(value => !value) ? <p className="text-sm text-muted-foreground">Os dados cadastrais já estão completos.</p> : <p className="text-sm text-muted-foreground">Preencha somente os dados ausentes ou inválidos.</p>}
                      <div className={`grid gap-4 ${device === 'mobile' ? 'grid-cols-1' : 'sm:grid-cols-2'}`}>
                        {missing.name && <div className={`space-y-2 ${device === 'desktop' ? 'sm:col-span-2' : ''}`}><Label htmlFor="preview-name">Nome completo</Label><Input id="preview-name" value={personal.name} onChange={event => updatePersonal('name', event.target.value)} /></div>}
                        {missing.email && <div className="space-y-2"><Label htmlFor="preview-email">Email</Label><Input id="preview-email" type="email" value={personal.email} onChange={event => updatePersonal('email', event.target.value)} /></div>}
                        {missing.phone && <div className="space-y-2"><Label htmlFor="preview-phone">WhatsApp</Label><Input id="preview-phone" type="tel" value={personal.phone} onChange={event => updatePersonal('phone', formatPhone(event.target.value))} /></div>}
                        {missing.cpf && <div className="space-y-2"><Label htmlFor="preview-cpf">CPF</Label><Input id="preview-cpf" value={personal.cpf} onChange={event => updatePersonal('cpf', formatCPF(event.target.value))} /></div>}
                      </div>
                    </div>
                  )}

                  {step.id === 'qualify-group' && (
                    <div className="space-y-4">
                      {groupStatus === 'idle' && !groupSkipped && <Button onClick={() => void requestGroup(personal)}>Criar Grupo</Button>}
                      {groupStatus === 'loading' && <div className="flex flex-col items-center gap-3 py-8 text-center" role="status"><Loader2 className="h-9 w-9 animate-spin text-primary" /><p className="font-medium">Criando grupo...</p><p className="text-sm text-muted-foreground">Aguardando o link de convite.</p></div>}
                      {groupStatus === 'pending' && <p className="rounded-md bg-muted p-4 text-sm">Seu grupo ainda está sendo criado. O convite não chegou nesta resposta.</p>}
                      {groupStatus === 'error' && <p className="rounded-md border border-destructive/40 p-4 text-sm text-destructive" role="alert">{groupError}</p>}
                      {(groupStatus === 'pending' || groupStatus === 'error') && <Button variant="outline" onClick={() => void requestGroup(personal)}>Tentar novamente</Button>}
                      {groupStatus === 'ready' && <OnboardingGroupCard title={group.title} description={group.description} photoUrl={isHttpsUrl(group.photo_url) ? group.photo_url : null} inviteUrl={group.invite_url} created />}
                      {groupSkipped && <p className="text-sm text-muted-foreground">Criação do grupo ignorada somente nesta prévia.</p>}
                      {groupStatus !== 'ready' && !groupSkipped && groupStatus !== 'loading' && <Button variant="outline" onClick={() => { setGroupSkipped(true); setGroupStatus('idle'); setCompleted(current => current.includes('qualify-group') ? current : [...current, 'qualify-group']); setSelectedIndex(joinIndex >= 0 ? joinIndex : Math.min(groupIndex + 1, steps.length - 1)); }}>Pular criação do grupo</Button>}
                      <QualifyPayloadViewer debug={qualifyDebug} />
                    </div>
                  )}

                  {step.id === 'join-group' && (
                    <div className="space-y-4">
                      {groupSkipped ? <p className="text-sm text-muted-foreground">Convite ignorado somente nesta prévia.</p> : groupStatus === 'ready' ? <OnboardingGroupCard title={group.title} description={group.description} photoUrl={isHttpsUrl(group.photo_url) ? group.photo_url : null} inviteUrl={group.invite_url} /> : <p className="text-sm text-muted-foreground">Aguarde a criação do grupo na etapa anterior.</p>}
                      {groupStatus === 'ready' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={joinedGroup} onChange={event => setJoinedGroup(event.target.checked)} />Confirmo que entrei no grupo</label>}
                      <QualifyPayloadViewer debug={qualifyDebug} />
                    </div>
                  )}

                  {step.id === 'connect-ml' && <div className="space-y-3"><p className="text-sm text-muted-foreground">Simulação da integração do Mercado Livre. Nenhuma conta será conectada.</p><MercadoLivreConnectionCard accountId={simulatedMlConnected ? 'teste' : null} onConnect={() => setSimulatedMlConnected(true)} /></div>}
                  {(step.id === 'import-top10' || step.id === 'publish-ml') && <OnboardingCommerceStep key={step.id} stage={step.id} preview previewProducts={previewProducts} onPreviewProducts={setPreviewProducts} onComplete={completeStep} />}
                  {step.id === 'ml-address-lesson' && <OnboardingStockAddress />}

                  {step.reference_url && isHttpsUrl(step.reference_url) && <Button variant="outline" size="sm" asChild><a href={step.reference_url} target="_blank" rel="noopener noreferrer">{step.id === 'ml-address-lesson' ? 'Assistir à aula' : 'Abrir referência'}<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                  {step.completion_criteria && <p className="rounded-md bg-muted p-3 text-sm"><strong>Critério de conclusão:</strong> {step.completion_criteria}</p>}

                  {step.id !== 'import-top10' && step.id !== 'publish-ml' && <div className="flex items-center justify-between gap-2 border-t pt-4">
                    <Button variant="outline" disabled={selectedIndex === 0 || groupStatus === 'loading'} onClick={() => setSelectedIndex(selectedIndex - 1)}>Anterior</Button>
                    {step.id === 'personal-data' ? (
                      <Button onClick={() => void finishPersonalData(personal)} disabled={groupStatus === 'loading'}>Continuar</Button>
                    ) : step.id === 'qualify-group' ? (
                      <Button disabled={groupStatus !== 'ready' && !groupSkipped} onClick={completeStep}>Continuar</Button>
                    ) : (
                      <Button onClick={completeStep} disabled={step.id === 'connect-ml' && !simulatedMlConnected}>{selectedIndex === steps.length - 1 ? 'Concluir prévia' : 'Concluir e avançar'}</Button>
                    )}
                  </div>}
                </section>
              </div>
            )}
          </>
        )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function QualifyPayloadViewer({ debug }: { debug: QualifyDebug | null }) {
  if (!debug) return null;
  return (
    <details className="rounded-md border p-3 text-sm">
      <summary className="cursor-pointer font-medium">Ver payload recebido da Qualify</summary>
      <p className="mt-3 text-xs text-muted-foreground">HTTP {debug.httpStatus} · Visível somente neste teste</p>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-md bg-muted p-3 text-xs">{typeof debug.payload === 'string' ? debug.payload : JSON.stringify(debug.payload, null, 2)}</pre>
    </details>
  );
}
