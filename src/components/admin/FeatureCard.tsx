import React from 'react';
import {
  Store,
  Globe,
  Palette,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Mail,
  Code,
  ShoppingCart,
  Headphones,
  GraduationCap,
  Award,
  Sparkles,
  MoreVertical,
  Users,
  Edit,
  Power,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Feature } from '@/hooks/useFeatures';

const iconMap: Record<string, React.ElementType> = {
  Store,
  Globe,
  Palette,
  BarChart2,
  TrendingUp,
  MessageCircle,
  Mail,
  Code,
  ShoppingCart,
  HeadphonesIcon: Headphones,
  GraduationCap,
  Award,
  Sparkles,
};

interface FeatureCardProps {
  feature: Feature;
  onEdit: (feature: Feature) => void;
  onToggleActive: (id: string, ativo: boolean) => void;
}

export const FeatureCard: React.FC<FeatureCardProps> = ({
  feature,
  onEdit,
  onToggleActive,
}) => {
  const Icon = iconMap[feature.icone] || Sparkles;

  const formatPrice = (price: number | null) => {
    if (!price || price === 0) return 'Grátis';
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(price);
  };

  return (
    <Card className={`relative ${!feature.ativo ? 'opacity-60' : ''}`}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="font-medium text-sm">{feature.nome}</h3>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {feature.descricao}
              </p>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(feature)}>
                <Edit className="w-4 h-4 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleActive(feature.id, !feature.ativo)}
              >
                <Power className="w-4 h-4 mr-2" />
                {feature.ativo ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-3 flex items-center gap-2 flex-wrap">
          <Badge variant={feature.ativo ? 'default' : 'secondary'} className="text-xs">
            {feature.ativo ? 'Ativa' : 'Inativa'}
          </Badge>
          {feature.trial_dias > 0 && (
            <Badge variant="outline" className="text-xs">
              {feature.trial_dias}d trial
            </Badge>
          )}
        </div>

        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-1">
            <Users className="w-3 h-3" />
            <span>{feature.user_count || 0} usuários</span>
          </div>
          <span>{formatPrice(feature.preco_mensal)}/mês</span>
        </div>

        {feature.requer_features.length > 0 && (
          <div className="mt-2 text-xs text-muted-foreground">
            Requer: {feature.requer_features.join(', ')}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
