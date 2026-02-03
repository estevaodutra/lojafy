

# Plano: Reorganizar Layout da Tabela de Logs (Estilo Compacto)

## Objetivo

Ajustar o layout da tabela de logs para ficar similar à imagem de referência, eliminando espaços em branco excessivos tanto na tabela quanto na paginacao.

---

## Analise da Imagem de Referencia

A tabela na imagem tem:
- Fundo escuro com linhas alternadas sutis
- Colunas bem distribuidas sem espacos vazios
- Layout `table-fixed` com larguras proporcionais
- Sem botao de expandir visivel na linha principal
- Badges compactos para status

---

## Alteracoes Propostas

### Arquivo: `src/components/admin/ApiLogsSection.tsx`

**1. Adicionar `table-fixed` a tabela (linha 387):**

Trocar de:
```tsx
<Table>
```

Para:
```tsx
<Table className="table-fixed w-full">
```

**2. Ajustar larguras das colunas no TableHeader (linhas 389-396):**

| Coluna | Largura Atual | Nova Largura |
|--------|---------------|--------------|
| Data/Hora | `w-[130px]` | `w-[15%]` |
| Origem | `w-[70px]` | `w-[12%]` |
| Evento/Funcao | `min-w-[150px]` | `w-[33%]` |
| Status | `w-[90px]` | `w-[15%]` |
| Duracao | `w-[70px]` | `w-[15%]` |
| Expandir | `w-[40px]` | `w-[10%]` |

**3. Ajustar larguras das TableCell no LogRow (linhas 115-147):**

Aplicar as mesmas larguras percentuais nas celulas para garantir alinhamento.

**4. Melhorar paginacao (linhas 408-431):**

Envolver em um container com background para evitar espacos visuais:

```tsx
{totalPages > 1 && (
  <Card className="p-4">
    <div className="flex items-center justify-between">
      <span className="text-sm text-muted-foreground">
        Pagina {page} de {totalPages}
      </span>
      <div className="flex gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page - 1)}
          disabled={page === 1}
        >
          Anterior
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage(page + 1)}
          disabled={page === totalPages}
        >
          Proxima
        </Button>
      </div>
    </div>
  </Card>
)}
```

---

## Codigo Final do TableHeader

```tsx
<Table className="table-fixed w-full">
  <TableHeader>
    <TableRow>
      <TableHead className="w-[15%]">Data/Hora</TableHead>
      <TableHead className="w-[12%]">Origem</TableHead>
      <TableHead className="w-[33%]">Evento/Funcao</TableHead>
      <TableHead className="w-[15%]">Status</TableHead>
      <TableHead className="w-[15%]">Duracao</TableHead>
      <TableHead className="w-[10%]"></TableHead>
    </TableRow>
  </TableHeader>
```

---

## Codigo Final das TableCell no LogRow

```tsx
<TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
  <TableCell className="w-[15%] font-mono text-xs text-muted-foreground">
    {formattedDate}
  </TableCell>
  <TableCell className="w-[12%]">
    {getSourceBadge(log.source)}
  </TableCell>
  <TableCell className="w-[33%]">
    <div className="flex flex-col gap-1">
      <Badge variant="outline" className="font-mono text-xs w-fit">
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
    <CollapsibleTrigger asChild>
      <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
        {isExpanded ? (
          <ChevronDown className="h-4 w-4" />
        ) : (
          <ChevronRight className="h-4 w-4" />
        )}
      </Button>
    </CollapsibleTrigger>
  </TableCell>
</TableRow>
```

---

## Resumo das Alteracoes

| Arquivo | Linhas | Alteracao |
|---------|--------|-----------|
| `ApiLogsSection.tsx` | 387 | Adicionar `className="table-fixed w-full"` |
| `ApiLogsSection.tsx` | 389-396 | Trocar larguras fixas por percentuais |
| `ApiLogsSection.tsx` | 115-147 | Trocar larguras fixas por percentuais |
| `ApiLogsSection.tsx` | 408-431 | Envolver paginacao em Card |

---

## Resultado Esperado

- Tabela ocupa 100% da largura sem espacos em branco
- Colunas distribuidas proporcionalmente
- Paginacao integrada visualmente com o resto da interface
- Layout similar a imagem de referencia fornecida

