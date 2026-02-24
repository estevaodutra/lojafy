import { Plan } from '@/hooks/usePlans';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Edit, Settings, Copy, Power, Users, Star, Crown, Gem, Zap, Award } from 'lucide-react';

const iconMap: Record<string, React.ComponentType<any>> = {
  star: Star,
  crown: Crown,
  gem: Gem,
  zap: Zap,
  award: Award,
};

interface PlanCardProps {
  plan: Plan;
  onEdit: (plan: Plan) => void;
  onManageFeatures: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onToggleActive: (plan: Plan) => void;
}

export function PlanCard({ plan, onEdit, onManageFeatures, onDuplicate, onToggleActive }: PlanCardProps) {
  const IconComponent = iconMap[plan.icone] || Star;

  return (
    <Card className={`relative transition-all hover:shadow-md ${!plan.ativo ? 'opacity-60' : ''}`}>
      {plan.destaque && (
        <Badge className="absolute -top-2 right-4 bg-primary text-primary-foreground">
          Recomendado
        </Badge>
      )}
      <CardContent className="pt-6">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: plan.cor + '20', color: plan.cor }}
            >
              <IconComponent className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-semibold text-lg">{plan.nome}</h3>
              {plan.descricao && (
                <p className="text-sm text-muted-foreground line-clamp-1">{plan.descricao}</p>
              )}
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(plan)}>
                <Edit className="h-4 w-4 mr-2" /> Editar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onManageFeatures(plan)}>
                <Settings className="h-4 w-4 mr-2" /> Gerenciar Features
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onDuplicate(plan)}>
                <Copy className="h-4 w-4 mr-2" /> Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onToggleActive(plan)}>
                <Power className="h-4 w-4 mr-2" /> {plan.ativo ? 'Desativar' : 'Ativar'}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="mt-4">
          <p className="text-2xl font-bold">
            {plan.preco_mensal > 0 ? `R$ ${plan.preco_mensal.toFixed(2).replace('.', ',')}` : 'Grátis'}
            {plan.preco_mensal > 0 && <span className="text-sm font-normal text-muted-foreground">/mês</span>}
          </p>
        </div>

        <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Settings className="h-3.5 w-3.5" />
            <span>{plan.feature_count ?? 0} features</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            <span>{plan.user_count ?? 0} usuários</span>
          </div>
        </div>

        <div className="mt-3">
          <Badge variant={plan.ativo ? 'default' : 'secondary'}>
            {plan.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
      </CardContent>
    </Card>
  );
}
