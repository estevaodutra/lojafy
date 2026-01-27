import { cn } from '@/lib/utils';
import { Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { formatDistanceToNow, isPast, differenceInHours } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface TicketSLAIndicatorProps {
  slaDeadline: string | null;
  status: string;
  className?: string;
  showLabel?: boolean;
}

export const TicketSLAIndicator = ({ 
  slaDeadline, 
  status,
  className,
  showLabel = true 
}: TicketSLAIndicatorProps) => {
  // Resolved/cancelled tickets don't show SLA
  if (['resolvido', 'cancelado'].includes(status) || !slaDeadline) {
    return null;
  }

  const deadline = new Date(slaDeadline);
  const isExpired = isPast(deadline);
  const hoursRemaining = differenceInHours(deadline, new Date());
  const isWarning = hoursRemaining > 0 && hoursRemaining <= 2;

  let Icon = Clock;
  let colorClass = 'text-muted-foreground';
  let bgClass = 'bg-muted/50';

  if (isExpired) {
    Icon = AlertTriangle;
    colorClass = 'text-destructive';
    bgClass = 'bg-destructive/10';
  } else if (isWarning) {
    Icon = AlertTriangle;
    colorClass = 'text-amber-600';
    bgClass = 'bg-amber-100';
  }

  const timeText = isExpired
    ? `Atrasado há ${formatDistanceToNow(deadline, { locale: ptBR })}`
    : `Prazo: ${formatDistanceToNow(deadline, { locale: ptBR, addSuffix: true })}`;

  return (
    <div className={cn('flex items-center gap-1.5 text-xs px-2 py-1 rounded-full', bgClass, colorClass, className)}>
      <Icon className="h-3 w-3" />
      {showLabel && <span>{timeText}</span>}
    </div>
  );
};

// Simple SLA badge for list views
export const TicketSLABadge = ({ slaDeadline, status }: { slaDeadline: string | null; status: string }) => {
  if (['resolvido', 'cancelado'].includes(status) || !slaDeadline) {
    return <CheckCircle className="h-4 w-4 text-primary" />;
  }

  const deadline = new Date(slaDeadline);
  const isExpired = isPast(deadline);
  const hoursRemaining = differenceInHours(deadline, new Date());
  const isWarning = hoursRemaining > 0 && hoursRemaining <= 2;

  if (isExpired) {
    return <AlertTriangle className="h-4 w-4 text-destructive" />;
  }
  
  if (isWarning) {
    return <Clock className="h-4 w-4 text-accent-foreground" />;
  }

  return <Clock className="h-4 w-4 text-muted-foreground" />;
};
