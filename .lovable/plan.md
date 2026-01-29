
# Plano: Notificação Obrigatória de WhatsApp

## Contexto

- **419 de 541 usuários** (77%) estão sem número de telefone cadastrado
- É necessário criar um modal bloqueante que force o usuário a cadastrar seu WhatsApp para usar a plataforma
- Esta notificação é **permanente** enquanto o usuário não tiver telefone cadastrado

---

## Arquitetura da Solução

Diferente das notificações obrigatórias existentes (tabela `mandatory_notifications`), esta será uma verificação **client-side** baseada no perfil do usuário:

```text
Usuário logado
      │
      ▼
┌─────────────────────┐
│ profile.phone vazio?│
│  (null ou '')       │
└─────────┬───────────┘
          │ SIM
          ▼
┌─────────────────────────────┐
│ Exibe WhatsAppRequiredModal │
│ - Modal bloqueante          │
│ - Campo com máscara BR      │
│ - Validação de celular      │
│ - Salva no profile + refetch│
└─────────────────────────────┘
          │ Após salvar
          ▼
    Usuário libera acesso
```

---

## Alterações Técnicas

### 1. Novo Componente: `WhatsAppRequiredModal.tsx`

Criar um modal que:
- Aparece quando `profile.phone` está vazio ou nulo
- **Não pode ser fechado** (sem botão de fechar, ESC e click-outside desabilitados)
- Campo de telefone com máscara brasileira `+55 (XX) 99999-9999`
- Validação: mínimo 10 dígitos (fixo) ou 11 dígitos (celular)
- Ao salvar: atualiza `profiles.phone` no Supabase
- Após sucesso: atualiza o contexto de autenticação

```typescript
// src/components/WhatsAppRequiredModal.tsx
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MessageCircle, Phone } from 'lucide-react';
import { formatPhone, cleanPhone, validatePhone } from '@/lib/phone';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Props {
  userId: string;
  onComplete: () => void;
}

export const WhatsAppRequiredModal = ({ userId, onComplete }: Props) => {
  const [phone, setPhone] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!validatePhone(phone)) {
      toast.error('Número inválido. Informe um telefone com DDD.');
      return;
    }

    setSaving(true);
    const { error } = await supabase
      .from('profiles')
      .update({ phone: cleanPhone(phone) })
      .eq('user_id', userId);

    if (error) {
      toast.error('Erro ao salvar o número.');
      setSaving(false);
      return;
    }

    toast.success('WhatsApp cadastrado com sucesso!');
    onComplete();
  };

  return (
    <Dialog open={true} onOpenChange={() => {}}>
      <DialogContent 
        className="max-w-md"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-6 w-6 text-green-500" />
            Cadastre seu WhatsApp
          </DialogTitle>
          <DialogDescription>
            Para continuar usando a plataforma, é necessário cadastrar seu número de WhatsApp.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="whatsapp">Número do WhatsApp</Label>
            <div className="relative">
              <Phone className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                id="whatsapp"
                value={phone}
                onChange={(e) => setPhone(formatPhone(e.target.value))}
                placeholder="+55 (11) 99999-9999"
                className="pl-10"
                maxLength={19}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Informe seu número com DDD para receber notificações importantes.
            </p>
          </div>

          <Button 
            onClick={handleSave} 
            disabled={saving || !validatePhone(phone)}
            className="w-full"
          >
            {saving ? 'Salvando...' : 'Salvar e Continuar'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
```

### 2. Novo Hook: `useWhatsAppRequired.ts`

Hook para verificar se o usuário precisa cadastrar WhatsApp:

```typescript
// src/hooks/useWhatsAppRequired.ts
import { useAuth } from '@/contexts/AuthContext';
import { cleanPhone } from '@/lib/phone';

export const useWhatsAppRequired = () => {
  const { user, profile, loading } = useAuth();

  // Usuário não logado ou carregando = não mostra modal
  if (loading || !user || !profile) {
    return { requiresWhatsApp: false, userId: null };
  }

  // Verificar se tem telefone válido cadastrado
  const phone = profile.phone ? cleanPhone(profile.phone) : '';
  const requiresWhatsApp = phone.length < 10;

  return { 
    requiresWhatsApp, 
    userId: user.id 
  };
};
```

### 3. Atualizar `App.tsx`

Integrar o novo modal no fluxo de renderização, exibindo **antes** das outras notificações obrigatórias:

```typescript
// No AppWithNotifications:
import { WhatsAppRequiredModal } from '@/components/WhatsAppRequiredModal';
import { useWhatsAppRequired } from '@/hooks/useWhatsAppRequired';

const AppWithNotifications = () => {
  const { pendingNotification, loading } = useMandatoryNotifications();
  const { requiresWhatsApp, userId } = useWhatsAppRequired();
  const { refetch: refetchProfile } = useAuth(); // Novo método

  // Prioridade: WhatsApp > Notificações obrigatórias
  return (
    <>
      <AppContent />
      <ImpersonationBanner />
      <ChatWidget />
      
      {/* WhatsApp tem prioridade máxima */}
      {requiresWhatsApp && userId && (
        <WhatsAppRequiredModal 
          userId={userId} 
          onComplete={() => window.location.reload()} 
        />
      )}
      
      {/* Só mostra outras notificações se WhatsApp OK */}
      {!requiresWhatsApp && !loading && pendingNotification && (
        <MandatoryNotificationModal notification={pendingNotification} />
      )}
    </>
  );
};
```

---

## Arquivos a Criar/Modificar

| Arquivo | Ação |
|---------|------|
| `src/components/WhatsAppRequiredModal.tsx` | **Criar** - Modal bloqueante com campo de telefone |
| `src/hooks/useWhatsAppRequired.ts` | **Criar** - Hook para verificar necessidade de WhatsApp |
| `src/App.tsx` | **Modificar** - Integrar o modal no AppWithNotifications |

---

## Comportamento Esperado

| Situação | Resultado |
|----------|-----------|
| Usuário sem telefone | Modal bloqueante aparece, não pode fechar |
| Usuário preenche e salva | Modal fecha, plataforma liberada |
| Usuário com telefone | Modal não aparece |
| Usuário desloga e loga de novo sem telefone | Modal aparece novamente |

---

## Detalhes de UX

- **Ícone**: WhatsApp verde para identificar visualmente
- **Máscara**: `+55 (XX) 99999-9999` aplicada automaticamente
- **Validação**: Mínimo 10 dígitos (fixo/celular brasileiro)
- **Feedback**: Toast de sucesso/erro ao salvar
- **Bloqueio**: Impossível fechar sem preencher (sem X, ESC desabilitado)
