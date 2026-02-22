
## Ajuste de Layout do OnboardingWizard para Mobile

### Problema
No mobile (390px), o modal do onboarding apresenta problemas de layout:
- Titulo "Bem-vindo ao Programa de Revenda!" cortado/overflow
- Botoes "Comecar" e "Marcar como Concluido" ficam apertados na mesma linha
- Padding excessivo dentro dos cards de step
- O dialog ocupa muito espaco sem scroll adequado

### Solucao
Ajustar o componente `OnboardingWizard.tsx` para melhor responsividade:

1. **Titulo**: Reduzir tamanho no mobile (`text-lg sm:text-2xl`)
2. **DialogContent**: Ajustar padding e margens para mobile (`p-4 sm:p-6`)
3. **Step cards**: Reduzir padding no mobile (`p-3 sm:p-4`)
4. **Botoes de acao**: Empilhar verticalmente no mobile (`flex-col sm:flex-row`)
5. **Botao "Marcar como Concluido"**: Texto menor no mobile para caber melhor
6. **Footer**: Empilhar texto e botao no mobile (`flex-col sm:flex-row`)

### Detalhes Tecnicos

**Arquivo**: `src/components/reseller/OnboardingWizard.tsx`

Principais alteracoes de classes Tailwind:
- Linha 22: `DialogContent` - adicionar `p-4 sm:p-6` e `w-[95vw] sm:w-auto`
- Linha 25: `DialogTitle` - `text-lg sm:text-2xl`
- Linha 60: Step card - `p-3 sm:p-4`
- Linha 66: Flex container - `gap-2 sm:gap-3`
- Linha 77: Step title - `text-sm sm:text-base`
- Linha 91: Botoes container - `flex-col sm:flex-row`
- Linha 101-107: Botao outline - adicionar `text-xs sm:text-sm` e texto abreviado
- Linha 117-129: Footer - `flex-col sm:flex-row gap-2`
