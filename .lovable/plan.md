

# Plano: Ocultar Pop-up de Onboarding no Primeiro Acesso

## Problema Identificado

O pop-up "Bem-vindo ao Programa de Revenda!" (`OnboardingWizard`) está aparecendo para usuários que ainda não completaram o fluxo de primeiro acesso. Isso cria uma experiência confusa, pois o usuário está passando pelo fluxo de configuração inicial (senha → vídeo → PWA) e ao mesmo tempo vê outro pop-up de onboarding.

## Solução

O `OnboardingWizard` só deve aparecer para usuários que **já completaram** o fluxo de primeiro acesso. A verificação será feita usando os campos `password_set` e `onboarding_completed` da tabela `profiles`.

## Lógica de Exibição

```text
┌─────────────────────────────────────────────────────────────────┐
│                  QUANDO EXIBIR CADA POP-UP                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  PRIMEIRO ACESSO (/reseller/first-access)                       │
│  ─────────────────────────────────────────                      │
│  • Exibe: Fluxo de 3 etapas (senha, video, PWA)                │
│  • Quando: password_set = false OU onboarding_completed = false │
│                                                                 │
│  ONBOARDING WIZARD (Pop-up de configuracao da loja)            │
│  ──────────────────────────────────────────────────            │
│  • Exibe: Checklist de configuracao da loja                    │
│  • Quando: password_set = true E onboarding_completed = true    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Alteracoes Necessarias

### Arquivo: `src/hooks/useResellerOnboarding.ts`

Adicionar verificacao do estado de primeiro acesso antes de abrir o modal:

```typescript
// Dentro do useEffect, antes de setIsOpen(true):

// Verificar se o usuario ja completou o primeiro acesso
const { data: profileData } = await supabase
  .from('profiles')
  .select('password_set, onboarding_completed')
  .eq('user_id', user.id)
  .single();

// So mostrar o wizard se o primeiro acesso foi concluido
const firstAccessCompleted = profileData?.password_set && profileData?.onboarding_completed;

if (progress < 100 && firstAccessCompleted) {
  setIsOpen(true);
}
```

## Fluxo Atualizado

```text
Usuario novo acessa → Vai para /reseller/first-access
                     ↓
              1. Define senha (password_set = true)
                     ↓
              2. Assiste video (onboarding_completed = true)
                     ↓
              3. Instala PWA
                     ↓
              Redireciona para /reseller/dashboard
                     ↓
              OnboardingWizard agora pode aparecer
              (porque password_set E onboarding_completed sao true)
```

## Resumo das Alteracoes

| Arquivo | Alteracao |
|---------|-----------|
| `src/hooks/useResellerOnboarding.ts` | Adicionar verificacao de `password_set` e `onboarding_completed` antes de exibir o modal |

## Beneficios

- Experiencia de usuario mais limpa e sem confusao
- Fluxos separados e sequenciais
- Usuario completa o primeiro acesso antes de ver outras tarefas
- Evita sobrecarga de informacoes no primeiro momento

