import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Circle, ExternalLink, X } from 'lucide-react';
import { useResellerOnboarding } from '@/hooks/useResellerOnboarding';
import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';

export const OnboardingWizard = () => {
  const { steps, progress, isOpen, setIsOpen, loading, markStepCompleted } = useResellerOnboarding();

  if (loading) {
    return null;
  }

  if (!isOpen || progress === 100) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto p-4 sm:p-6 w-[95vw] sm:w-auto">
        <DialogHeader>
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-lg sm:text-2xl">
              🚀 Bem-vindo ao Programa de Revenda!
            </DialogTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-6 w-6"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <DialogDescription>
            Complete estas etapas para configurar sua loja e começar a vender
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Progresso Geral</span>
              <span className="text-muted-foreground">{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-muted-foreground">
              {steps.filter(s => s.completed).length} de {steps.length} etapas concluídas
            </p>
          </div>

          {/* Steps */}
          <div className="space-y-3">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`border rounded-lg p-3 sm:p-4 transition-all ${
                  step.completed
                    ? 'bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-800'
                    : 'bg-card hover:bg-muted'
                }`}
              >
                <div className="flex items-start gap-2 sm:gap-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {step.completed ? (
                      <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-500" />
                    ) : (
                      <Circle className="h-6 w-6 text-muted-foreground" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className={`font-semibold text-sm sm:text-base ${step.completed ? 'text-green-700 dark:text-green-400' : ''}`}>
                        {step.order}. {step.title}
                      </h3>
                      {step.completed && (
                        <span className="text-xs text-green-600 dark:text-green-500 font-medium">
                          ✓ Concluído
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {step.description}
                    </p>

                    {!step.completed && (
                      <div className="flex flex-col sm:flex-row gap-2 mt-3">
                        <Button
                          asChild
                          size="sm"
                          variant="default"
                        >
                          <Link to={step.url}>
                            Começar <ExternalLink className="ml-2 h-3 w-3" />
                          </Link>
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => markStepCompleted(step.id)}
                          className="text-xs sm:text-sm"
                        >
                          Marcar como Concluído
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Footer */}
          <div className="border-t pt-4 space-y-3">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
              <p className="text-xs sm:text-sm text-muted-foreground text-center sm:text-left">
                Você pode reabrir este guia a qualquer momento
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsOpen(false)}
              >
                Fechar
              </Button>
            </div>

            {progress === 100 && (
              <div className="text-center p-4 bg-green-50 dark:bg-green-950/20 rounded-lg">
                <CheckCircle2 className="h-12 w-12 text-green-600 dark:text-green-500 mx-auto mb-2" />
                <h3 className="font-bold text-green-700 dark:text-green-400">
                  Parabéns! 🎉
                </h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Você completou todas as etapas de configuração!
                </p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
