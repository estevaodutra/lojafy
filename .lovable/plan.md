

# Plano: Fluxo de Primeiro Acesso com Senha, Onboarding e PWA

## Resumo

Este plano implementa o fluxo completo de primeiro acesso para revendedores:

1. **Etapa 1 - Definir Senha**: Pop-up obrigatorio para criar uma senha pessoal
2. **Etapa 2 - Video de Onboarding**: Assistir ao video obrigatorio (ja implementado)
3. **Etapa 3 - Instalacao PWA**: Pop-up para instalar o app na tela inicial do dispositivo

---

## Arquitetura do Fluxo

```text
┌─────────────────────────────────────────────────────────────────────┐
│                    FLUXO DE PRIMEIRO ACESSO                         │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Usuario clica no link de acesso unico                          │
│     ↓                                                               │
│  2. verify-onetime-link valida e cria sessao                       │
│     ↓                                                               │
│  3. Redireciona para /reseller/first-access                        │
│     ↓                                                               │
│  4. [ETAPA 1] Pop-up para definir senha                            │
│     → Usuario cria senha com confirmacao                           │
│     → supabase.auth.updateUser({ password })                       │
│     ↓                                                               │
│  5. [ETAPA 2] Video de onboarding obrigatorio                      │
│     → Usuario assiste video ate o fim                              │
│     → Marca onboarding_completed = true                            │
│     ↓                                                               │
│  6. [ETAPA 3] Pop-up de instalacao PWA                             │
│     → Mostra botao "Instalar Lojafy"                               │
│     → Usuario pode instalar ou pular                               │
│     ↓                                                               │
│  7. Redireciona para /reseller/dashboard                           │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## 1. Configuracao PWA (Progressive Web App)

### Dependencia a instalar

```bash
npm install vite-plugin-pwa
```

### Alteracoes em `vite.config.ts`

Adicionar plugin VitePWA com manifest:

```typescript
import { VitePWA } from 'vite-plugin-pwa';

plugins: [
  react(),
  VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['favicon.ico', 'robots.txt'],
    manifest: {
      name: 'Lojafy - Sua Loja Descomplicada',
      short_name: 'Lojafy',
      description: 'Plataforma de revenda de produtos',
      theme_color: '#8B5CF6',
      background_color: '#ffffff',
      display: 'standalone',
      scope: '/',
      start_url: '/',
      icons: [
        { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
        { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
        { src: '/icons/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
      ]
    }
  })
]
```

### Icones PWA necessarios

Criar em `public/icons/`:
- `icon-192.png` (192x192 pixels)
- `icon-512.png` (512x512 pixels)
- `icon-maskable.png` (512x512 com safe area)

---

## 2. Pagina de Primeiro Acesso Unificada

### Novo arquivo: `src/pages/reseller/FirstAccess.tsx`

Esta pagina gerencia as tres etapas em sequencia:

```typescript
// Estados
const [currentStep, setCurrentStep] = useState<'password' | 'onboarding' | 'pwa'>('password');
const [passwordSet, setPasswordSet] = useState(false);
const [onboardingCompleted, setOnboardingCompleted] = useState(false);
const [pwaPrompt, setPwaPrompt] = useState<any>(null);

// Fluxo
1. Se usuario ja tem senha definida (verificar via profile), pular para onboarding
2. Se onboarding ja foi completado, pular para PWA
3. Mostrar etapa atual com stepper visual
```

### Componente de Stepper

```typescript
// Indicador visual das 3 etapas
<div className="flex items-center justify-center gap-4">
  <Step number={1} label="Definir Senha" active={step === 'password'} completed={passwordSet} />
  <Connector />
  <Step number={2} label="Treinamento" active={step === 'onboarding'} completed={onboardingCompleted} />
  <Connector />
  <Step number={3} label="Instalar App" active={step === 'pwa'} completed={false} />
</div>
```

---

## 3. Etapa 1: Definir Senha

### Componente: `src/components/reseller/SetPasswordStep.tsx`

Formulario para criar senha:

```typescript
interface Props {
  onComplete: () => void;
}

// Campos:
- Nova senha (minimo 6 caracteres)
- Confirmar senha

// Logica:
const handleSubmit = async () => {
  await supabase.auth.updateUser({ password: newPassword });
  // Marcar no profiles que senha foi definida
  await supabase.from('profiles')
    .update({ password_set: true })
    .eq('user_id', user.id);
  onComplete();
};
```

### Alteracao no banco de dados

Adicionar coluna na tabela `profiles`:
- `password_set` (boolean, default false)

---

## 4. Etapa 2: Video de Onboarding

### Componente: `src/components/reseller/OnboardingVideoStep.tsx`

Reutiliza a logica existente de `Onboarding.tsx`:

```typescript
interface Props {
  onComplete: () => void;
}

// Carrega config de reseller_onboarding_config
// Exibe video (YouTube/Vimeo/Google Drive)
// Detecta fim do video
// Chama onComplete() quando usuario clicar em Continuar
```

---

## 5. Etapa 3: Instalacao PWA

### Componente: `src/components/reseller/InstallPWAStep.tsx`

Pop-up para instalacao do app:

```typescript
interface Props {
  onComplete: () => void;
}

// Captura o evento beforeinstallprompt
useEffect(() => {
  const handler = (e: BeforeInstallPromptEvent) => {
    e.preventDefault();
    setDeferredPrompt(e);
  };
  window.addEventListener('beforeinstallprompt', handler);
  return () => window.removeEventListener('beforeinstallprompt', handler);
}, []);

// Botao de instalacao
const handleInstall = async () => {
  if (deferredPrompt) {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      toast.success('Lojafy instalado com sucesso!');
    }
  }
  onComplete();
};

// UI
<Card>
  <CardHeader>
    <CardTitle>Instale a Lojafy</CardTitle>
    <CardDescription>
      Adicione a Lojafy na tela inicial do seu dispositivo para acesso rapido
    </CardDescription>
  </CardHeader>
  <CardContent>
    <div className="flex flex-col items-center gap-6">
      <Smartphone className="h-24 w-24 text-primary" />
      <Button onClick={handleInstall} size="lg">
        <Download className="mr-2" />
        Instalar Lojafy
      </Button>
      <Button variant="ghost" onClick={onComplete}>
        Continuar sem instalar
      </Button>
    </div>
  </CardContent>
</Card>
```

---

## 6. Atualizacoes nos Arquivos Existentes

### `src/App.tsx`

```typescript
// Alterar rota de onboarding
<Route path="/reseller/first-access" element={<FirstAccess />} />
// Manter /reseller/onboarding para compatibilidade (redireciona para first-access)
```

### `supabase/functions/verify-onetime-link/index.ts`

```typescript
// Alterar redirect_url padrao
redirectTo: `https://lojafy.lovable.app${tokenRecord.redirect_url || '/reseller/first-access'}`,
```

### `supabase/functions/api-usuarios-cadastrar/index.ts`

```typescript
// Alterar redirect_url padrao
redirect_url: '/reseller/first-access'
```

---

## Arquivos a Criar

| Arquivo | Descricao |
|---------|-----------|
| `src/pages/reseller/FirstAccess.tsx` | Pagina principal com 3 etapas |
| `src/components/reseller/SetPasswordStep.tsx` | Formulario de definir senha |
| `src/components/reseller/OnboardingVideoStep.tsx` | Video de treinamento |
| `src/components/reseller/InstallPWAStep.tsx` | Pop-up de instalacao PWA |
| `public/icons/icon-192.png` | Icone PWA 192x192 |
| `public/icons/icon-512.png` | Icone PWA 512x512 |
| `public/icons/icon-maskable.png` | Icone maskable para Android |

---

## Arquivos a Modificar

| Arquivo | Alteracao |
|---------|-----------|
| `vite.config.ts` | Adicionar plugin VitePWA |
| `src/App.tsx` | Adicionar rota /reseller/first-access |
| `supabase/functions/verify-onetime-link/index.ts` | Mudar redirect para /reseller/first-access |
| `supabase/functions/api-usuarios-cadastrar/index.ts` | Mudar redirect para /reseller/first-access |
| `index.html` | Adicionar meta tags PWA |

---

## Migracao de Banco de Dados

```sql
-- Adicionar coluna para rastrear se senha foi definida
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_set BOOLEAN DEFAULT false;
```

---

## Consideracoes de Experiencia do Usuario

| Aspecto | Implementacao |
|---------|---------------|
| Mobile-first | Layout responsivo, botoes grandes |
| Feedback visual | Stepper mostrando progresso |
| Flexibilidade | Usuario pode pular instalacao PWA |
| Persistencia | Se sair no meio, retoma de onde parou |
| iOS Safari | Instrucoes manuais para "Adicionar a Tela de Inicio" |

---

## Detecao de Plataforma para PWA

iOS nao suporta `beforeinstallprompt`. Para esses dispositivos:

```typescript
const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
const isInStandaloneMode = window.matchMedia('(display-mode: standalone)').matches;

if (isIOS && !isInStandaloneMode) {
  // Mostrar instrucoes manuais:
  // "Toque em Compartilhar > Adicionar a Tela de Inicio"
}
```

---

## Fluxo Visual das Etapas

```text
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│    ● ─────────── ○ ─────────── ○                               │
│    1             2             3                                │
│  Senha       Treinamento    Instalar                           │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                                                         │   │
│  │              🔒 Crie sua Senha                          │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────┐      │   │
│  │   │ Nova senha                                  │      │   │
│  │   └─────────────────────────────────────────────┘      │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────┐      │   │
│  │   │ Confirmar senha                             │      │   │
│  │   └─────────────────────────────────────────────┘      │   │
│  │                                                         │   │
│  │   ┌─────────────────────────────────────────────┐      │   │
│  │   │            Continuar →                      │      │   │
│  │   └─────────────────────────────────────────────┘      │   │
│  │                                                         │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

