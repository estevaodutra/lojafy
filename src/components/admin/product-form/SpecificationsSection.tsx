import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, X, Search, Filter, ListChecks, CheckCircle2, Sparkles } from 'lucide-react';

export interface SpecificationItem {
  key: string;
  value: string;
}

interface SpecificationsSectionProps {
  specifications: SpecificationItem[];
  onAddSpecification: () => void;
  onUpdateSpecification: (index: number, field: 'key' | 'value', value: string) => void;
  onRemoveSpecification: (index: number) => void;
}

const DEFAULT_SPEC_KEYS = [
  'Voltagem',
  'Material',
  'Garantia',
  'Resolução',
  'Conectividade',
  'Potência',
  'Capacidade',
  'Peso líquido',
  'Origem',
  'Dimensões',
  'Cor Principal',
];

const LOCAL_STORAGE_KEY_SPECS = 'lojafy_custom_spec_keys';

export const SpecificationsSection: React.FC<SpecificationsSectionProps> = ({
  specifications,
  onAddSpecification,
  onUpdateSpecification,
  onRemoveSpecification,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'filled' | 'empty'>('all');
  const [showAll, setShowAll] = useState(false);

  // Atributos salvos pelo usuário (persistidos em localStorage)
  const [customSpecKeys, setCustomSpecKeys] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY_SPECS);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      return [];
    }
  });

  // Lista unificada de sugestões sem duplicatas
  const allSuggestedKeys = Array.from(new Set([...DEFAULT_SPEC_KEYS, ...customSpecKeys]));

  const handleSaveCustomKey = (keyName: string) => {
    const trimmed = keyName.trim();
    if (!trimmed) return;

    if (!allSuggestedKeys.some(k => k.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...customSpecKeys, trimmed];
      setCustomSpecKeys(updated);
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY_SPECS, JSON.stringify(updated));
      } catch (e) {
        console.warn('Erro ao salvar atributo no localStorage:', e);
      }
    }
  };

  const handleQuickAddSpec = (keyName: string) => {
    // 1. Salvar no localStorage se for novo
    handleSaveCustomKey(keyName);

    // 2. Verificar se já existe um campo com essa chave vazio
    const emptyIndex = specifications.findIndex(s => s.key === '' || s.key.toLowerCase() === keyName.toLowerCase());
    if (emptyIndex !== -1) {
      onUpdateSpecification(emptyIndex, 'key', keyName);
    } else {
      // Adicionar novo atributo e definir a chave
      onAddSpecification();
      setTimeout(() => {
        onUpdateSpecification(specifications.length, 'key', keyName);
      }, 50);
    }
  };

  // Filtragem
  const filteredSpecs = specifications.filter((spec) => {
    const matchesSearch = 
      spec.key.toLowerCase().includes(searchTerm.toLowerCase()) || 
      spec.value.toLowerCase().includes(searchTerm.toLowerCase());
    
    if (!matchesSearch) return false;

    if (filterType === 'filled') return spec.value.trim() !== '';
    if (filterType === 'empty') return spec.value.trim() === '';
    return true;
  });

  const filledCount = specifications.filter(s => s.value.trim() !== '').length;
  const emptyCount = specifications.length - filledCount;
  const visibleSpecs = showAll ? filteredSpecs : filteredSpecs.slice(0, 8);

  return (
    <div className="space-y-4">
      
      {/* Header Toolbar: Busca, Filtros e Adicionar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b pb-3">
        
        {/* Search Input */}
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Buscar atributo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-8 text-xs pl-8 bg-background"
          />
        </div>

        {/* Filter Pills */}
        <div className="flex items-center space-x-1.5 overflow-x-auto">
          <Button
            type="button"
            variant={filterType === 'all' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('all')}
            className="h-7 text-[11px] px-2.5"
          >
            Todos ({specifications.length})
          </Button>

          <Button
            type="button"
            variant={filterType === 'filled' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setFilterType('filled')}
            className="h-7 text-[11px] px-2.5"
          >
            Preenchidos ({filledCount})
          </Button>

          {emptyCount > 0 && (
            <Button
              type="button"
              variant={filterType === 'empty' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setFilterType('empty')}
              className="h-7 text-[11px] px-2.5"
            >
              Vazios ({emptyCount})
            </Button>
          )}

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAddSpecification}
            className="h-7 text-xs bg-primary/5 hover:bg-primary/10 text-primary border-primary/20 shrink-0 ml-1"
          >
            <Plus className="h-3.5 w-3.5 mr-1" />
            Adicionar Atributo
          </Button>
        </div>

      </div>

      {/* Sugestões de Atributos Frequentes & Salvos (Pílulas de 1-Clique) */}
      <div className="p-2.5 rounded-lg bg-muted/20 border space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold text-muted-foreground flex items-center gap-1.5">
            <Sparkles className="h-3 w-3 text-amber-500" />
            Atributos Frequentes e Salvos (Clique para adicionar rapidamente):
          </span>
        </div>
        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
          {allSuggestedKeys.map((keyName) => {
            const isAlreadyAdded = specifications.some(s => s.key.toLowerCase() === keyName.toLowerCase());
            return (
              <Badge
                key={keyName}
                variant={isAlreadyAdded ? "secondary" : "outline"}
                className={`text-[10px] cursor-pointer transition-all hover:bg-primary hover:text-primary-foreground ${
                  isAlreadyAdded ? 'opacity-60 cursor-default' : 'bg-background'
                }`}
                onClick={() => !isAlreadyAdded && handleQuickAddSpec(keyName)}
              >
                + {keyName}
              </Badge>
            );
          })}
        </div>
      </div>

      {/* Datalist para Autocomplete nos Inputs */}
      <datalist id="spec-keys-list">
        {allSuggestedKeys.map(k => (
          <option key={k} value={k} />
        ))}
      </datalist>

      {/* Tabela Compacta de Atributos */}
      {visibleSpecs.length > 0 ? (
        <div className="border rounded-lg overflow-hidden bg-background shadow-2xs">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow className="h-8">
                <TableHead className="text-[11px] font-bold h-8 py-1 w-1/3">Atributo / Característica</TableHead>
                <TableHead className="text-[11px] font-bold h-8 py-1">Valor / Especificação</TableHead>
                <TableHead className="text-[11px] font-bold h-8 py-1 text-right w-16">Ação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {visibleSpecs.map((spec, index) => {
                const realIndex = specifications.indexOf(spec);
                return (
                  <TableRow key={index} className="h-10 hover:bg-muted/20">
                    <TableCell className="py-1 px-3">
                      <Input
                        list="spec-keys-list"
                        placeholder="Ex: Voltagem, Material, Resolução"
                        value={spec.key}
                        onChange={(e) => onUpdateSpecification(realIndex, 'key', e.target.value)}
                        onBlur={(e) => handleSaveCustomKey(e.target.value)}
                        className="h-7 text-xs font-semibold bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
                      />
                    </TableCell>

                    <TableCell className="py-1 px-3">
                      <Input
                        placeholder="Ex: Bivolt, Aço Inox, 1080p"
                        value={spec.value}
                        onChange={(e) => onUpdateSpecification(realIndex, 'value', e.target.value)}
                        className="h-7 text-xs bg-transparent border-transparent hover:border-input focus:border-input transition-colors"
                      />
                    </TableCell>

                    <TableCell className="py-1 px-3 text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveSpecification(realIndex)}
                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                        title="Remover atributo"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      ) : (
        <div className="p-6 text-center border rounded-lg bg-muted/10 space-y-2">
          <ListChecks className="mx-auto h-8 w-8 text-muted-foreground/60" />
          <p className="text-xs text-muted-foreground">Nenhum atributo encontrado.</p>
        </div>
      )}

      {/* Ver Mais / Ver Menos */}
      {filteredSpecs.length > 8 && (
        <div className="text-center pt-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setShowAll(!showAll)}
            className="h-7 text-xs text-primary font-medium"
          >
            {showAll ? 'Mostrar menos' : `Ver todos os ${filteredSpecs.length} atributos`}
          </Button>
        </div>
      )}

    </div>
  );
};
