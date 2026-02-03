
# Plano: Substituir Collapse por Sheet para Detalhes do Log

## Problema

O uso do componente `Collapsible` dentro do `TableBody` está quebrando a estrutura HTML da tabela, causando espaços em branco e problemas de formatação. Isso acontece porque o HTML não permite elementos não-tr diretamente dentro de tbody.

## Solucao

Substituir o `Collapsible` por um `Sheet` (painel lateral) que abre ao clicar no botao de detalhes. Isso:
1. Mantem a tabela com estrutura HTML valida
2. Elimina os espacos em branco
3. Melhora a experiencia do usuario com um painel dedicado

---

## Alteracoes

### Arquivo: `src/components/admin/ApiLogsSection.tsx`

**1. Atualizar imports (linha 7):**

Remover `Collapsible` e adicionar `Sheet`:

```tsx
// Remover:
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// Adicionar:
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Eye } from 'lucide-react';
```

**2. Refatorar o componente LogRow (linhas 107-214):**

Transformar em uma linha simples de tabela com botao que abre o Sheet:

```tsx
interface LogRowProps {
  log: { ... };
  onViewDetails: (log: LogRowProps['log']) => void;
}

const LogRow: React.FC<LogRowProps> = ({ log, onViewDetails }) => {
  const formattedDate = format(new Date(log.timestamp), "dd/MM/yy HH:mm:ss", { locale: ptBR });

  return (
    <TableRow className="hover:bg-muted/50">
      <TableCell className="w-[15%] font-mono text-xs text-muted-foreground">
        {formattedDate}
      </TableCell>
      <TableCell className="w-[12%]">
        {getSourceBadge(log.source)}
      </TableCell>
      <TableCell className="w-[33%]">
        <div className="flex flex-col gap-1">
          <Badge variant="outline" className="font-mono text-xs w-fit truncate max-w-full">
            {log.source === 'api_request' ? log.function_name : log.event_type}
          </Badge>
          {log.method && (
            <span className="text-xs text-muted-foreground">{log.method}</span>
          )}
        </div>
      </TableCell>
      <TableCell className="w-[15%]">
        {getStatusBadge(log.status_code)}
      </TableCell>
      <TableCell className="w-[15%] text-xs text-muted-foreground font-mono">
        {log.duration_ms !== undefined && log.duration_ms !== null ? `${log.duration_ms}ms` : '-'}
      </TableCell>
      <TableCell className="w-[10%] text-right">
        <Button 
          variant="ghost" 
          size="sm" 
          className="h-6 w-6 p-0"
          onClick={() => onViewDetails(log)}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </TableCell>
    </TableRow>
  );
};
```

**3. Adicionar estado e Sheet no componente principal (linhas 216-443):**

```tsx
export const ApiLogsSection: React.FC = () => {
  const [source, setSource] = useState<LogSource>('all');
  const [eventType, setEventType] = useState<LogEventType>('all');
  const [period, setPeriod] = useState<LogPeriod>('7d');
  const [status, setStatus] = useState<LogStatus>('all');
  const [selectedLog, setSelectedLog] = useState<LogRowProps['log'] | null>(null);

  // ... resto do codigo ...

  return (
    <div className="space-y-6">
      {/* ... cards de metricas e filtros ... */}

      {/* Logs Table */}
      <Card>
        {/* ... header ... */}
        <CardContent className="p-0">
          {/* ... loading e empty state ... */}
          <Table className="table-fixed w-full">
            <TableHeader>...</TableHeader>
            <TableBody>
              {logs.map((log) => (
                <LogRow 
                  key={log.id} 
                  log={log} 
                  onViewDetails={setSelectedLog}
                />
              ))}
            </TableBody>
          </Table>
        </CardContent>

        {/* Pagination inline dentro do Card */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between p-4 border-t">
            <span className="text-sm text-muted-foreground">
              Pagina {page} de {totalPages}
            </span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPage(page - 1)} disabled={page === 1}>
                Anterior
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                Proxima
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Sheet de Detalhes */}
      <Sheet open={!!selectedLog} onOpenChange={(open) => !open && setSelectedLog(null)}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Detalhes do Log</SheetTitle>
            <SheetDescription>
              {selectedLog?.source === 'webhook' ? 'Webhook enviado' : 'Requisicao de API recebida'}
            </SheetDescription>
          </SheetHeader>
          
          {selectedLog && (
            <div className="mt-6 space-y-4">
              {/* Conteudo dos detalhes */}
            </div>
          )}
        </SheetContent>
      </Sheet>

      {/* Retention Notice */}
      ...
    </div>
  );
};
```

---

## Layout Visual Esperado

**Tabela:**
```
┌────────────┬────────┬─────────────────┬────────┬─────────┬──────┐
│ Data/Hora  │ Origem │ Evento/Funcao   │ Status │ Duracao │      │
├────────────┼────────┼─────────────────┼────────┼─────────┼──────┤
│ 01/02/26   │ ↗ OUT  │ order.paid      │ ✓ 200  │   45ms  │  👁  │
│ 01/02/26   │ ↙ IN   │ api-produtos    │ ✓ 200  │  120ms  │  👁  │
├────────────┴────────┴─────────────────┴────────┴─────────┴──────┤
│ Pagina 1 de 5                          [Anterior] [Proxima]     │
└─────────────────────────────────────────────────────────────────┘
```

**Sheet (ao clicar no icone de olho):**
```
┌──────────────────────────────┐
│ Detalhes do Log          [X] │
│ Webhook enviado              │
├──────────────────────────────┤
│ URL de Destino               │
│ https://example.com/webhook  │
│                              │
│ Payload Enviado              │
│ ┌──────────────────────────┐ │
│ │ {                        │ │
│ │   "event": "order.paid", │ │
│ │   "data": {...}          │ │
│ │ }                        │ │
│ └──────────────────────────┘ │
│                              │
│ Resposta                     │
│ ┌──────────────────────────┐ │
│ │ {"success": true}        │ │
│ └──────────────────────────┘ │
└──────────────────────────────┘
```

---

## Resumo das Alteracoes

| Arquivo | Secao | Alteracao |
|---------|-------|-----------|
| `ApiLogsSection.tsx` | Imports | Trocar Collapsible por Sheet, adicionar Eye |
| `ApiLogsSection.tsx` | LogRow | Remover Collapsible, adicionar botao com Eye |
| `ApiLogsSection.tsx` | Estado | Adicionar selectedLog para controlar o Sheet |
| `ApiLogsSection.tsx` | Render | Adicionar Sheet com detalhes do log |
| `ApiLogsSection.tsx` | Paginacao | Mover para dentro do Card da tabela com border-t |

---

## Beneficios

1. **Estrutura HTML valida** - Tabela sem elementos invalidos
2. **Sem espacos em branco** - Layout correto e compacto
3. **Melhor UX** - Detalhes em painel lateral com scroll proprio
4. **Paginacao integrada** - Dentro do mesmo Card da tabela
