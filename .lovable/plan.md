
# Plano: Corrigir Layout da Tabela de Logs

## Problema Identificado

Na imagem, a tabela continua com espaço em branco excessivo entre as colunas. O cabeçalho mostra "Data/Hora" à esquerda, depois um grande espaço vazio, e só então aparecem "Origem", "Evento/Função", etc.

## Causa Raiz

A tabela usa `w-full` (largura 100%), mas sem `table-fixed`, o navegador distribui o espaço automaticamente entre as colunas, ignorando as larguras definidas.

## Solução

Aplicar `table-fixed` na tabela para forçar o respeito às larguras das colunas, e ajustar as larguras para ocupar 100% do espaço de forma proporcional.

---

## Alterações

### Arquivo: `src/components/admin/ApiLogsSection.tsx`

**1. Adicionar `table-fixed` à tabela:**

```tsx
<Table className="table-fixed">
```

**2. Ajustar larguras das colunas para somar ~100%:**

| Coluna | Nova Largura |
|--------|--------------|
| Data/Hora | `w-[15%]` |
| Origem | `w-[10%]` |
| Evento/Função | `w-[35%]` |
| Status | `w-[15%]` |
| Duração | `w-[15%]` |
| Expandir | `w-[10%]` |

**Código do TableHeader:**

```tsx
<Table className="table-fixed">
  <TableHeader>
    <TableRow>
      <TableHead className="w-[15%]">Data/Hora</TableHead>
      <TableHead className="w-[10%]">Origem</TableHead>
      <TableHead className="w-[35%]">Evento/Função</TableHead>
      <TableHead className="w-[15%]">Status</TableHead>
      <TableHead className="w-[15%]">Duração</TableHead>
      <TableHead className="w-[10%]"></TableHead>
    </TableRow>
  </TableHeader>
```

**Código das TableCell no LogRow:**

```tsx
<TableRow className="cursor-pointer hover:bg-muted/50" onClick={() => setIsExpanded(!isExpanded)}>
  <TableCell className="w-[15%] font-mono text-xs text-muted-foreground">
    {formattedDate}
  </TableCell>
  <TableCell className="w-[10%]">
    {getSourceBadge(log.source)}
  </TableCell>
  <TableCell className="w-[35%]">
    ...
  </TableCell>
  <TableCell className="w-[15%]">
    {getStatusBadge(log.status_code)}
  </TableCell>
  <TableCell className="w-[15%] text-xs text-muted-foreground font-mono">
    {log.duration_ms...}
  </TableCell>
  <TableCell className="w-[10%] text-right">
    ...
  </TableCell>
</TableRow>
```

---

## Layout Visual Esperado

```
┌────────────┬────────┬─────────────────────┬─────────┬─────────┬──────┐
│ Data/Hora  │ Origem │ Evento/Função       │ Status  │ Duração │      │
│ 15%        │ 10%    │ 35%                 │ 15%     │ 15%     │ 10%  │
├────────────┼────────┼─────────────────────┼─────────┼─────────┼──────┤
│ 01/02/26   │ ↗ OUT  │ order.paid          │ ✅ 200  │   -     │  >   │
│ 21:41:02   │        │                     │         │         │      │
└────────────┴────────┴─────────────────────┴─────────┴─────────┴──────┘
```

---

## Resumo

| Arquivo | Linha | Alteração |
|---------|-------|-----------|
| `ApiLogsSection.tsx` | 387 | Adicionar `className="table-fixed"` à Table |
| `ApiLogsSection.tsx` | 390-395 | Mudar larguras do TableHeader para porcentagens |
| `ApiLogsSection.tsx` | 115-137 | Mudar larguras das TableCell para porcentagens |
