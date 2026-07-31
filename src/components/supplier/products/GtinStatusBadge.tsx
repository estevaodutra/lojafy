import { Badge } from '@/components/ui/badge';

const GTIN_STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  pending_confirmation: { label: 'GTIN a confirmar', variant: 'secondary' },
  requires_review: { label: 'GTIN em revisão', variant: 'destructive' },
  legitimately_absent: { label: 'Sem GTIN (legítimo)', variant: 'outline' },
  required_missing: { label: 'GTIN obrigatório ausente', variant: 'destructive' },
  confirmed: { label: 'GTIN confirmado', variant: 'default' },
};

export const GtinStatusBadge = ({ status }: { status: string | null }) => {
  if (!status) return null;
  const config = GTIN_STATUS_CONFIG[status];
  if (!config) return null;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};

export const STAGE_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' | 'destructive' }> = {
  stage_1_basic: { label: 'Estágio 1 — Básico', variant: 'secondary' },
  stage_2_enriching: { label: 'Estágio 2 — Enriquecendo', variant: 'secondary' },
  stage_2_requires_review: { label: 'Estágio 2 — Requer revisão', variant: 'destructive' },
  stage_2_enabled: { label: 'Habilitado', variant: 'default' },
  stage_2_blocked: { label: 'Bloqueado', variant: 'destructive' },
};

export const StageBadge = ({ stage }: { stage: string | null }) => {
  const config = stage ? STAGE_CONFIG[stage] : null;
  if (!config) return <Badge variant="outline">Legado</Badge>;
  return <Badge variant={config.variant}>{config.label}</Badge>;
};
