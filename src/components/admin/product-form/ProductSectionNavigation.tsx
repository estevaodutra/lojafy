import React from 'react';
import { 
  Info, 
  DollarSign, 
  Package, 
  Image as ImageIcon, 
  Ruler, 
  ListChecks, 
  Layers, 
  Settings, 
  ChevronDown, 
  ChevronUp,
  Check,
  AlertTriangle
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface SectionStatus {
  id: string;
  label: string;
  isComplete: boolean;
  hasError: boolean;
  isOptional?: boolean;
  summaryText?: string;
}

interface ProductSectionNavigationProps {
  activeSection: string;
  onSelectSection: (sectionId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
  sectionsStatus: Record<string, SectionStatus>;
}

export const SECTIONS = [
  { id: 'basic', label: 'Básico', icon: Info, macro: 'Geral' },
  { id: 'pricing', label: 'Preços', icon: DollarSign, macro: 'Comercial' },
  { id: 'stock', label: 'Estoque', icon: Package, macro: 'Comercial' },
  { id: 'images', label: 'Imagens', icon: ImageIcon, macro: 'Conteúdo' },
  { id: 'dimensions', label: 'Dimensões', icon: Ruler, macro: 'Logística' },
  { id: 'specs', label: 'Especificações', icon: ListChecks, macro: 'Conteúdo' },
  { id: 'variants', label: 'Variações', icon: Layers, macro: 'Variações' },
  { id: 'settings', label: 'Configurações', icon: Settings, macro: 'Sistema' },
];

export const ProductSectionNavigation: React.FC<ProductSectionNavigationProps> = ({
  activeSection,
  onSelectSection,
  onExpandAll,
  onCollapseAll,
  sectionsStatus,
}) => {
  return (
    <div className="sticky top-[57px] z-20 w-full border-b bg-background/90 backdrop-blur-sm py-2 px-4 shadow-2xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
        
        {/* Anchor Buttons */}
        <div className="flex items-center space-x-1.5 overflow-x-auto py-1 scrollbar-none max-w-full">
          {SECTIONS.map((sec) => {
            const Icon = sec.icon;
            const status = sectionsStatus[sec.id] || { isComplete: true, hasError: false };
            const isActive = activeSection === sec.id;

            return (
              <button
                key={sec.id}
                type="button"
                onClick={() => onSelectSection(sec.id)}
                className={`
                  flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all shrink-0 cursor-pointer
                  ${isActive 
                    ? 'bg-primary text-primary-foreground shadow-xs font-semibold' 
                    : 'bg-muted/50 hover:bg-muted text-muted-foreground hover:text-foreground'
                  }
                  ${status.hasError ? 'border border-destructive/50 text-destructive bg-destructive/10' : ''}
                `}
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{sec.label}</span>

                {status.hasError ? (
                  <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold">
                    !
                  </span>
                ) : status.isComplete ? (
                  <Check className={`h-3 w-3 ${isActive ? 'text-primary-foreground' : 'text-emerald-500'}`} />
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Global Expand / Collapse Controls */}
        <div className="flex items-center space-x-1 shrink-0 ml-auto">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onExpandAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            title="Expandir todas as seções"
          >
            <ChevronDown className="h-3 w-3 mr-1" />
            Expandir tudo
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCollapseAll}
            className="h-7 text-[11px] px-2 text-muted-foreground hover:text-foreground"
            title="Recolher todas as seções"
          >
            <ChevronUp className="h-3 w-3 mr-1" />
            Recolher tudo
          </Button>
        </div>

      </div>
    </div>
  );
};
