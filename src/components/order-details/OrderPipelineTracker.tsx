import React from 'react';
import { 
  FileText, 
  Coins, 
  PackageOpen, 
  Truck, 
  AlertTriangle, 
  XCircle, 
  Clock, 
  Ticket, 
  Check, 
  ArrowRight,
  HelpCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// Mapping of internal database statuses to our 4 Processo Primário stages
// 1. Pedido Gerado > Aguardando Pagamento
// 2. Pedido Pago > Aguardando Recebimento da Expedição
// 3. Pedido Recebido > Aguardando Envio
// 4. Enviado > Fim

interface OrderPipelineTrackerProps {
  status: string;
  paymentStatus?: string;
  orderNumber?: string;
  motivoAtraso?: string;
  previsaoEnvio?: string;
  cancelamentoMotivo?: string;
  cancelamentoObservacao?: string;
  activeTicketsCount?: number;
}

export const OrderPipelineTracker = ({
  status,
  paymentStatus,
  orderNumber,
  motivoAtraso,
  previsaoEnvio,
  cancelamentoMotivo,
  cancelamentoObservacao,
  activeTicketsCount = 0,
}: OrderPipelineTrackerProps) => {
  
  // Resolve current active stage index (1 to 4)
  const getActiveStage = (status: string, paymentStatus?: string): { stage: number; isCompleted: boolean } => {
    // If order is finished, all steps are completed
    if (status === 'finalizado') {
      return { stage: 4, isCompleted: true };
    }
    if (status === 'enviado') {
      return { stage: 4, isCompleted: false };
    }
    if (status === 'recebido' || status === 'embalado' || status === 'em_reposicao') {
      return { stage: 3, isCompleted: false };
    }
    if (status === 'pago' || paymentStatus === 'paid') {
      return { stage: 2, isCompleted: false };
    }
    // Default is generated / pending payment
    return { stage: 1, isCompleted: false };
  };

  const { stage: activeStage, isCompleted: isAllCompleted } = getActiveStage(status, paymentStatus);

  const isCancelled = ['cancelado', 'em_falta', 'reembolsado'].includes(status);
  const isDevolucao = ['devolucao_andamento', 'devolucao_recebida', 'devolucao_analise', 'devolucao_aprovada'].includes(status);

  // Setup the 4 primary pipeline steps
  const steps = [
    {
      id: 1,
      title: 'Pedido Gerado',
      description: 'Aguardando Pagamento',
      icon: FileText,
      color: 'from-blue-500 to-indigo-600',
    },
    {
      id: 2,
      title: 'Pedido Pago',
      description: 'Aguardando Expedição',
      icon: Coins,
      color: 'from-emerald-500 to-teal-600',
    },
    {
      id: 3,
      title: 'Pedido Recebido',
      description: 'Aguardando Envio',
      icon: PackageOpen,
      color: 'from-amber-500 to-orange-600',
    },
    {
      id: 4,
      title: 'Enviado',
      description: 'Entrega Realizada',
      icon: Truck,
      color: 'from-purple-500 to-pink-600',
    },
  ];

  return (
    <div className="w-full space-y-6">
      {/* Primary Pipeline Header */}
      <div className="flex items-center justify-between border-b pb-4">
        <div>
          <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Processo Primário: Acompanhamento do Pedido
          </h3>
          <p className="text-sm text-muted-foreground">
            Acompanhe o progresso natural do seu pedido etapa por etapa.
          </p>
        </div>
        {isCancelled && (
          <Badge variant="destructive" className="text-xs px-3 py-1">
            Pedido Cancelado / Desviado
          </Badge>
        )}
        {isDevolucao && (
          <Badge variant="outline" className="text-xs px-3 py-1 border-rose-300 text-rose-700 bg-rose-50">
            Processo de Devolução Ativo
          </Badge>
        )}
      </div>

      {/* Stepper Pipeline Container */}
      <Card className="border border-border/60 shadow-md bg-gradient-to-br from-background via-background to-muted/20 backdrop-blur-sm overflow-hidden">
        <CardContent className="p-6 md:p-8">
          <div className="relative flex flex-col md:flex-row justify-between items-start md:items-center gap-8 md:gap-4">
            
            {/* Horizontal Line Connector (MD+) */}
            <div className="absolute left-[36px] right-[36px] top-[32px] hidden md:block h-1 bg-muted -translate-y-1/2 z-0">
              <div 
                className={cn(
                  "h-full bg-gradient-to-r from-blue-500 via-emerald-500 to-amber-500 transition-all duration-700 ease-in-out",
                  activeStage === 1 && "w-0",
                  activeStage === 2 && "w-1/3",
                  activeStage === 3 && "w-2/3",
                  activeStage >= 4 && "w-full"
                )}
              />
            </div>

            {/* Steps Rendering */}
            {steps.map((step, idx) => {
              const StepIcon = step.icon;
              const isStepCompleted = isAllCompleted || step.id < activeStage;
              const isStepActive = !isAllCompleted && step.id === activeStage;
              const isStepFuture = step.id > activeStage;

              return (
                <div 
                  key={step.id} 
                  className={cn(
                    "relative flex md:flex-col items-center md:text-center gap-4 md:gap-3 z-10 flex-1 w-full md:w-auto transition-all duration-300",
                    isStepActive && "scale-105 md:scale-105",
                    isStepFuture && "opacity-60"
                  )}
                >
                  {/* Step Bubble Indicator */}
                  <div 
                    className={cn(
                      "flex items-center justify-center w-14 h-14 rounded-full border-4 shadow-sm transition-all duration-500",
                      isStepCompleted && "bg-gradient-to-br from-primary to-primary-foreground border-primary text-primary-foreground scale-100",
                      isStepActive && "bg-background border-primary text-primary shadow-md ring-4 ring-primary/20",
                      isStepFuture && "bg-muted border-muted-foreground/20 text-muted-foreground",
                      isCancelled && !isStepCompleted && "border-destructive/30 text-destructive/50"
                    )}
                  >
                    {isStepCompleted ? (
                      <Check className="w-6 h-6 stroke-[3]" />
                    ) : (
                      <StepIcon className="w-6 h-6" />
                    )}
                  </div>

                  {/* Step Label Information */}
                  <div className="flex flex-col md:items-center text-left md:text-center">
                    <span className={cn(
                      "text-sm font-semibold tracking-tight transition-colors",
                      isStepActive ? "text-primary text-base font-bold" : "text-foreground",
                      isStepCompleted && "text-muted-foreground font-medium"
                    )}>
                      {step.title}
                    </span>
                    <span className="text-xs text-muted-foreground/80 font-normal">
                      {step.description}
                    </span>
                  </div>

                  {/* Vertical Line Connector (Mobile Only) */}
                  {idx < steps.length - 1 && (
                    <div className="absolute left-[26px] top-14 w-0.5 h-8 bg-muted md:hidden z-0">
                      <div 
                        className={cn(
                          "w-full bg-primary transition-all duration-500",
                          isStepCompleted ? "h-full" : "h-0"
                        )}
                      />
                    </div>
                  )}
                </div>
              );
            })}

          </div>
        </CardContent>
      </Card>

      {/* Alerts for Processo Secundário (Tickets) and Processo Terciário (Manifestations/Exceptions) */}
      {(status === 'em_reposicao' || status === 'cancelamento_solicitado' || isCancelled || isDevolucao || activeTicketsCount > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          
          {/* Processo Terciário (Client Action & Deviations) */}
          {(status === 'em_reposicao' || status === 'cancelamento_solicitado' || isCancelled || isDevolucao) && (
            <div className={cn(
              "flex gap-3 p-4 rounded-xl border backdrop-blur-sm shadow-sm",
              status === 'em_reposicao' && "bg-amber-500/5 border-amber-500/25 text-amber-900 dark:text-amber-300",
              status === 'cancelamento_solicitado' && "bg-rose-500/5 border-rose-500/25 text-rose-900 dark:text-rose-300",
              isCancelled && "bg-red-500/5 border-red-500/25 text-red-900 dark:text-red-300",
              isDevolucao && "bg-rose-500/5 border-rose-500/25 text-rose-900 dark:text-rose-300"
            )}>
              {status === 'em_reposicao' && (
                <>
                  <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Processo Terciário Ativo: Atraso / Em Reposição</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      O produto está temporariamente em reposição no fornecedor.
                      {motivoAtraso && <span className="block mt-1 italic font-medium">Motivo: "{motivoAtraso}"</span>}
                      {previsaoEnvio && (
                        <span className="block mt-1 font-semibold text-amber-600">
                          Previsão de Envio: {new Date(previsaoEnvio).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </p>
                  </div>
                </>
              )}

              {status === 'cancelamento_solicitado' && (
                <>
                  <Clock className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Processo Terciário Ativo: Cancelamento Solicitado</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Foi solicitada a interrupção e o cancelamento do pedido. Aguardando análise da expedição.
                    </p>
                  </div>
                </>
              )}

              {isCancelled && (
                <>
                  <XCircle className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Desvio de Fluxo: Pedido Cancelado</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      Este pedido foi cancelado e saiu da pipeline principal.
                      {cancelamentoMotivo && <span className="block mt-1 font-semibold text-red-600">Motivo: {cancelamentoMotivo}</span>}
                      {cancelamentoObservacao && <span className="block mt-1 italic font-medium">"{cancelamentoObservacao}"</span>}
                    </p>
                  </div>
                </>
              )}

              {isDevolucao && (
                <>
                  <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-sm">Processo Terciário Ativo: Devolução em Andamento</h4>
                    <p className="text-xs text-muted-foreground mt-1">
                      O cliente iniciou um processo de devolução do produto.
                    </p>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Processo Secundário (Support Tickets Active) */}
          {activeTicketsCount > 0 && (
            <div className="flex gap-3 p-4 rounded-xl border border-primary/20 bg-primary/5 text-primary-foreground backdrop-blur-sm shadow-sm">
              <Ticket className="h-5 w-5 text-primary shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-sm text-primary">Processo Secundário Ativo: Ticket de Suporte</h4>
                <p className="text-xs text-muted-foreground mt-1">
                  Há {activeTicketsCount} ticket(s) de suporte aberto(s) para tratar informações ou solicitações após o pagamento deste pedido.
                </p>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
};
