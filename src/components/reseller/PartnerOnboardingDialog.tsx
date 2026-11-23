import { useCallback, useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, ExternalLink, Loader2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { cleanCPF, formatCPF, validateCPF } from '@/lib/cpf';
import { cleanPhone, validatePhone } from '@/lib/phone';
import { useMarketplaceCredentials } from '@/hooks/useMarketplaceCredentials';
import { mercadoLivreAuthUrl } from '@/lib/mercadoLivreAuth';
import { BetaWarningDialog } from '@/components/integrations/BetaWarningDialog';
import { MercadoLivreConnectionCard } from '@/components/reseller/MercadoLivreConnectionCard';
import { OnboardingCommerceStep } from '@/components/reseller/OnboardingCommerceStep';

type Step = { id: string; title: string; description: string; reference_url: string };
type Journey = { steps: Step[]; step_index: number; group_status: 'idle' | 'requested' | 'ready'; group_title: string | null; group_description: string | null; group_photo_url: string | null; group_invite_url: string | null; completed_at: string | null };
type Profile = { name: string; email: string; phone: string; cpf: string };
type State = { available: true; journey: Journey; profile: Profile };
type StateResponse = State | { available: false };

function validUrl(value: string | null) {
  try { return !!value && new URL(value).protocol === 'https:'; } catch { return false; }
}

export function PartnerOnboardingDialog() {
  const { user, profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [state, setState] = useState<State | null>(null);
  const [available, setAvailable] = useState(false);
  const [form, setForm] = useState<Profile>({ name: '', email: '', phone: '', cpf: '' });
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [joined, setJoined] = useState(false);
  const [betaOpen, setBetaOpen] = useState(false);
  const { credentials } = useMarketplaceCredentials('mercadolivre');
  const { data: mlIntegration, refetch: refreshMl } = useQuery({
    queryKey: ['onboarding-ml-integration', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error: integrationError } = await supabase.from('mercadolivre_integrations')
        .select('ml_user_id, is_active').eq('user_id', user.id).eq('is_active', true).maybeSingle();
      if (integrationError) throw integrationError;
      return data;
    },
    enabled: !!user?.id && profile?.role === 'reseller' && available,
  });

  useEffect(() => {
    if (!open) return;
    const refreshOnFocus = () => { void refreshMl(); };
    window.addEventListener('focus', refreshOnFocus);
    return () => window.removeEventListener('focus', refreshOnFocus);
  }, [open, refreshMl]);

  const invoke = useCallback(async (action: string, extra: Record<string, unknown> = {}): Promise<StateResponse> => {
    const { data, error: functionError } = await supabase.functions.invoke('partner-onboarding', { body: { action, ...extra } });
    if (functionError) {
      let message = functionError.message;
      if ('context' in functionError && functionError.context instanceof Response) {
        const details = await functionError.context.clone().json().catch(() => null);
        if (typeof details?.error === 'string') message = details.error;
      }
      throw new Error(message);
    }
    if (data?.available === false) return { available: false };
    if (!data?.journey) throw new Error('O servidor não retornou o progresso do onboarding.');
    return { ...data, available: true } as State;
  }, []);

  const refresh = useCallback(async () => {
    if (!user || profile?.role !== 'reseller') return;
    setLoading(true);
    try {
      const result = await invoke('state');
      if (!result.available) {
        setAvailable(false);
        setState(null);
        setOpen(false);
        return;
      }
      setAvailable(true);
      setState(result);
      setForm(result.profile);
      if (!result.journey.completed_at) setOpen(true);
      setError('');
    } catch (reason) {
      setAvailable(true);
      setError(reason instanceof Error ? reason.message : 'Não foi possível carregar o onboarding.');
      setOpen(true);
    } finally { setLoading(false); }
  }, [invoke, profile?.role, user]);

  useEffect(() => { void refresh(); }, [refresh]);

  const run = async (action: string, extra: Record<string, unknown> = {}) => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const result = await invoke(action, extra);
      if (!result.available) { setAvailable(false); setOpen(false); return; }
      setState(result);
      if (result.journey.completed_at) setOpen(false);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível avançar.');
      const fresh = await invoke('state').catch(() => null);
      if (fresh?.available) setState(fresh);
      if (fresh && !fresh.available) { setAvailable(false); setOpen(false); }
    } finally { setBusy(false); }
  };

  const completePersonal = async () => {
    const name = form.name.trim();
    const phone = cleanPhone(form.phone);
    const cpf = cleanCPF(form.cpf);
    if (name.split(/\s+/).length < 2 || !validatePhone(phone) || !validateCPF(cpf)) {
      setError('Confira nome completo, WhatsApp e CPF.');
      return;
    }
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      const saved = await invoke('personal', { name, phone, cpf });
      if (!saved.available) { setAvailable(false); setOpen(false); return; }
      setState(saved);
      if (saved.journey.steps[saved.journey.step_index]?.id === 'qualify-group') {
        const groupResult = await invoke('group');
        if (groupResult.available) setState(groupResult);
        else { setAvailable(false); setOpen(false); }
      }
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Não foi possível avançar.');
      const fresh = await invoke('state').catch(() => null);
      if (fresh?.available) setState(fresh);
      if (fresh && !fresh.available) { setAvailable(false); setOpen(false); }
    } finally { setBusy(false); }
  };

  if (!user || profile?.role !== 'reseller' || !available) return null;
  const journey = state?.journey;
  const steps = journey?.steps ?? [];
  const index = journey?.step_index ?? 0;
  const step = steps[index];
  const missing = { name: (state?.profile.name.trim().split(/\s+/).length ?? 0) < 2,
    phone: !validatePhone(state?.profile.phone ?? ''), cpf: !validateCPF(state?.profile.cpf ?? '') };

  return <>
    <Button variant="outline" size="sm" onClick={() => { setOpen(true); void refresh(); }} className="fixed bottom-5 right-5 z-40 shadow-lg">Meu onboarding</Button>
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-h-[90vh] w-[96vw] max-w-4xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Seu onboarding</DialogTitle>
          <DialogDescription>Seu progresso é salvo automaticamente. Ao voltar, você continua na etapa atual.</DialogDescription>
        </DialogHeader>
        {loading && !journey ? <div className="flex justify-center py-12"><Loader2 className="h-7 w-7 animate-spin" /></div> :
          !journey ? <div className="space-y-3"><p role="alert" className="text-sm text-destructive">{error || 'Onboarding indisponível.'}</p><Button variant="outline" onClick={() => void refresh()}>Tentar novamente</Button></div> :
          <div className="space-y-5">
            <div className="space-y-2"><div className="flex justify-between text-sm"><span className="md:hidden">Etapa atual</span><span className="hidden md:inline">Progresso</span><span className="md:hidden">{Math.min(index + 1, steps.length)} de {steps.length}</span><span className="hidden md:inline">{Math.min(index, steps.length)} de {steps.length} etapas</span></div><Progress className="md:hidden" value={steps.length ? Math.min((index + 1) / steps.length * 100, 100) : 0} /><Progress className="hidden md:block" value={steps.length ? Math.min(index / steps.length * 100, 100) : 0} /></div>
            <div className="grid gap-5 md:grid-cols-[210px_minmax(0,1fr)]">
              <ol className="hidden space-y-1 md:block" aria-label="Etapas do onboarding">{steps.map((item, position) => <li key={item.id} className={`${item.id === 'personal-data' ? 'hidden md:flex' : 'flex'} items-center gap-2 rounded-md px-3 py-2 text-sm ${position === index ? 'bg-primary text-primary-foreground' : 'text-muted-foreground'}`}>
                {position < index ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <span className="w-4 text-center">{position + 1}</span>}<span>{item.id === 'qualify-group' ? 'Criar Grupo' : item.title}</span>
              </li>)}</ol>
              <section className="min-w-0 space-y-4 rounded-lg border p-4">
                {step ? <><div><p className="hidden text-xs text-muted-foreground md:block">ETAPA {index + 1} DE {steps.length}</p><h3 className="mt-1 text-xl font-semibold">{step.id === 'qualify-group' ? 'Criar Grupo' : step.title}</h3><p className="mt-2 text-sm text-muted-foreground">{step.description}</p></div>
                  {step.id === 'personal-data' && <div className="grid gap-4 sm:grid-cols-2">
                    {!missing.name && <p className="sm:col-span-2 text-sm">Nome: {state.profile.name}</p>}
                    {missing.name && <div className="space-y-2 sm:col-span-2"><Label>Nome completo</Label><Input value={form.name} onChange={event => setForm({ ...form, name: event.target.value })} /></div>}
                    {missing.phone && <div className="space-y-2"><Label>WhatsApp</Label><Input type="tel" inputMode="tel" value={form.phone} onChange={event => setForm({ ...form, phone: event.target.value })} placeholder="DDD e número" /></div>}
                    {missing.cpf && <div className="space-y-2"><Label>CPF</Label><Input value={form.cpf} onChange={event => setForm({ ...form, cpf: formatCPF(event.target.value) })} /></div>}
                    {!missing.phone && <p className="text-sm">WhatsApp: {state.profile.phone}</p>}
                    {!missing.cpf && <p className="text-sm">CPF: {formatCPF(state.profile.cpf)}</p>}
                    <p className="sm:col-span-2 text-sm text-muted-foreground">Email: {state.profile.email}</p>
                  </div>}
                  {step.id === 'qualify-group' && <div className="space-y-3">
                    {busy && <div role="status" className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Criando seu grupo...</div>}
                    {journey.group_status === 'requested' && !busy && <p className="rounded-md bg-muted p-3 text-sm">A criação do grupo já foi solicitada. Aguarde a confirmação ou contate o suporte. Uma nova solicitação não será enviada.</p>}
                    {journey.group_status === 'idle' && <p className="text-sm text-muted-foreground">Ao continuar, criaremos seu grupo uma única vez.</p>}
                  </div>}
                  {step.id === 'join-group' && <div className="space-y-4">
                    <div className="rounded-md border p-4">{validUrl(journey.group_photo_url) && <img src={journey.group_photo_url!} alt="Foto do grupo" className="mb-3 h-16 w-16 rounded-full object-cover" />}<h4 className="font-semibold">{journey.group_title}</h4>{journey.group_description && <p className="text-sm text-muted-foreground">{journey.group_description}</p>}{validUrl(journey.group_invite_url) && <Button asChild variant="outline" className="mt-3"><a href={journey.group_invite_url!} target="_blank" rel="noopener noreferrer">Entrar no grupo<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}</div>
                    <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={joined} onChange={event => setJoined(event.target.checked)} />Confirmo que entrei no grupo</label>
                  </div>}
                  {step.id === 'connect-ml' && <div className="space-y-3">
                    <MercadoLivreConnectionCard accountId={mlIntegration?.ml_user_id} onConnect={() => setBetaOpen(true)} onRefresh={() => void refreshMl()} />
                    <p className="text-sm text-muted-foreground">Depois de autorizar a conta, volte a esta janela e atualize a conexão.</p>
                  </div>}
                  {(step.id === 'import-top10' || step.id === 'publish-ml') && <OnboardingCommerceStep key={step.id} stage={step.id} onComplete={() => run('advance')} />}
                  {validUrl(step.reference_url) && <Button variant="outline" asChild><a href={step.reference_url} target="_blank" rel="noopener noreferrer">Abrir aula ou referência<ExternalLink className="ml-2 h-4 w-4" /></a></Button>}
                  {error && <p role="alert" className="rounded-md border border-destructive/40 p-3 text-sm text-destructive">{error}</p>}
                  {step.id !== 'import-top10' && step.id !== 'publish-ml' && <div className="border-t pt-4">{step.id === 'personal-data' ? <Button disabled={busy} onClick={() => void completePersonal()}>Salvar e continuar</Button> :
                    step.id === 'qualify-group' ? <Button disabled={busy || journey.group_status !== 'idle'} onClick={() => void run('group')}>Criar Grupo</Button> :
                    step.id === 'join-group' ? <Button disabled={busy || !joined} onClick={() => void run('join')}>Confirmar entrada e continuar</Button> :
                    <Button disabled={busy || (step.id === 'connect-ml' && !mlIntegration)} onClick={() => void run('advance')}>{index === steps.length - 1 ? 'Concluir onboarding' : 'Concluir e avançar'}</Button>}</div>}
                </> : <p>Onboarding concluído.</p>}
              </section>
            </div>
          </div>}
      </DialogContent>
    </Dialog>
    <BetaWarningDialog open={betaOpen} onOpenChange={setBetaOpen} onConfirm={() => {
      if (!user?.id) return;
      const clientId = credentials?.client_id || import.meta.env.VITE_ML_CLIENT_ID || '2003351424267574';
      window.open(mercadoLivreAuthUrl(user.id, clientId), '_blank', 'noopener,noreferrer');
    }} marketplaceName="Mercado Livre" authUrl={user?.id ? mercadoLivreAuthUrl(user.id, credentials?.client_id || import.meta.env.VITE_ML_CLIENT_ID || '2003351424267574') : undefined} />
  </>;
}
