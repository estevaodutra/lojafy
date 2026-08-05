import { Badge } from '@/components/ui/badge';

const GTIN_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending_confirmation: { label: 'GTIN a confirmar', variant: 'secondary' },
  requires_review: { label: 'GTIN em revisão', variant: 'destructive' },
  legitimately_absent: { label: 'Sem GTIN (legítimo)', variant: 'outline' },
  required_missing: { label: 'GTIN obrigatório ausente', variant: 'destructive' },
  confirmed: { label: 'GTIN confirmado', variant: 'default' },
};

export const GtinStatusBadge = ({ status, gtin }: { status: string | null; gtin?: string | null }) => {
  let effectiveStatus = status;
  if (gtin && typeof gtin === 'string' && gtin.trim().length >= 10) {
    effectiveStatus = 'confirmed';
  }
  if (!effectiveStatus) return null;
  const config = GTIN_STATUS_CONFIG[effectiveStatus] || GTIN_STATUS_CONFIG.confirmed;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const STAGE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  stage_1_basic: { label: 'Estágio 1', variant: 'secondary' },
  stage_2_enriching: { label: 'Estágio 2', variant: 'default' },
  stage_2_requires_review: { label: 'Estágio 2', variant: 'default' },
  stage_2_enabled: { label: 'Estágio 2', variant: 'default' },
  stage_2_blocked: { label: 'Bloqueado', variant: 'destructive' },
};

export const StageBadge = ({ stage }: { stage: string | null }) => {
  if (!stage) return <Badge variant="outline">Legado</Badge>;

  if (stage === 'stage_1_basic') {
    return (
      <Badge className="bg-amber-500 hover:bg-amber-500 text-white border-none">
        Estágio 1
      </Badge>
    );
  }

  if (stage === 'stage_2_blocked') {
    return (
      <Badge variant="destructive">
        Bloqueado
      </Badge>
    );
  }

  return (
    <Badge className="bg-green-600 hover:bg-green-600 text-white border-none">
      Estágio 2
    </Badge>
  );
};
