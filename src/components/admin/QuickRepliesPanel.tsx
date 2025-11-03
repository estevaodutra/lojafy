import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Zap, Star } from 'lucide-react';
import { useStandardAnswers, StandardAnswer } from '@/hooks/useStandardAnswers';

interface QuickRepliesPanelProps {
  onSelectReply: (answer: StandardAnswer) => void;
}

export const QuickRepliesPanel = ({ onSelectReply }: QuickRepliesPanelProps) => {
  const [searchTerm, setSearchTerm] = useState('');
  const { standardAnswers, loading } = useStandardAnswers();

  const activeAnswers = standardAnswers.filter(a => a.active);

  const filteredAnswers = activeAnswers.filter(answer => {
    const search = searchTerm.toLowerCase();
    return (
      answer.name.toLowerCase().includes(search) ||
      answer.answer.toLowerCase().includes(search) ||
      answer.keywords.some(k => k.toLowerCase().includes(search))
    );
  });

  const sortedAnswers = [...filteredAnswers].sort((a, b) => 
    b.usage_count - a.usage_count
  );

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center gap-2 mb-3">
          <Zap className="h-5 w-5 text-primary" />
          <h3 className="font-semibold">Respostas Rápidas</h3>
          <Badge variant="secondary">{activeAnswers.length}</Badge>
        </div>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome, conteúdo ou palavra-chave..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {/* List */}
      <ScrollArea className="flex-1 p-4">
        {loading ? (
          <div className="text-center text-muted-foreground py-8">
            Carregando...
          </div>
        ) : sortedAnswers.length === 0 ? (
          <div className="text-center text-muted-foreground py-8">
            {searchTerm ? 'Nenhuma resposta encontrada' : 'Nenhuma resposta padrão ativa'}
          </div>
        ) : (
          <div className="space-y-3">
            {sortedAnswers.map((answer) => (
              <div
                key={answer.id}
                className="p-3 border rounded-lg hover:bg-accent transition-colors cursor-pointer group"
                onClick={() => onSelectReply(answer)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{answer.name}</h4>
                  </div>
                  <Badge variant="secondary" className="text-xs">
                    {answer.usage_count}x
                  </Badge>
                </div>

                <p className="text-xs text-muted-foreground line-clamp-2 mb-2">
                  {answer.answer}
                </p>

                {answer.keywords.length > 0 && (
                  <div className="flex flex-wrap gap-1 mb-2">
                    {answer.keywords.slice(0, 3).map((keyword, i) => (
                      <Badge key={i} variant="outline" className="text-xs">
                        {keyword}
                      </Badge>
                    ))}
                    {answer.keywords.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{answer.keywords.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <Button 
                  size="sm" 
                  variant="ghost"
                  className="w-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  Usar esta resposta
                </Button>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};
