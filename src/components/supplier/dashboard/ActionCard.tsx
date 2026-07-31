import { useNavigate } from 'react-router-dom';
import { ArrowRight, type LucideIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

interface ActionCardProps {
  title: string;
  value: number | string | null | undefined;
  icon: LucideIcon;
  to: string;
  tone?: 'default' | 'warning' | 'destructive';
  subtitle?: string;
}

/** Card de ação do dashboard: mostra o número e navega já filtrado. */
export const ActionCard = ({ title, value, icon: Icon, to, tone = 'default', subtitle }: ActionCardProps) => {
  const navigate = useNavigate();
  const toneClass =
    tone === 'destructive'
      ? 'border-destructive/50'
      : tone === 'warning'
        ? 'border-amber-400/60'
        : '';

  return (
    <Card
      className={`cursor-pointer transition-shadow hover:shadow-md ${toneClass}`}
      onClick={() => navigate(to)}
      role="button"
    >
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold">{value ?? '—'}</p>
            {subtitle && <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>}
          </div>
          <Icon className="h-5 w-5 text-muted-foreground" />
        </div>
        <div className="mt-2 flex items-center text-xs text-muted-foreground">
          Ver fila <ArrowRight className="ml-1 h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
};
