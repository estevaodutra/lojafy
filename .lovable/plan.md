
# Plano: Reorganizar Layout da Tabela de Logs

## Problema Identificado

Na imagem, a tabela de logs apresenta um espaço em branco excessivo entre as colunas. Os cabeçalhos "Origem" e "Evento/Função" aparecem deslocados para a direita, criando uma área vazia no meio da tabela.

## Causa Raiz

A estrutura atual da tabela define larguras fixas para algumas colunas que podem estar causando o desalinhamento:

| Coluna | Largura Atual |
|--------|---------------|
| Data/Hora | `w-[140px]` |
| Origem | `w-[80px]` |
| Evento/Função | (sem limite) |
| Status | `w-[100px]` |
| Duração | `w-[80px]` |
| Expandir | `w-[50px]` |

O problema está no layout flexível da coluna "Evento/Função" que expande demais, empurrando as outras colunas.

---

## Solução Proposta

Reorganizar as larguras das colunas para uma distribuição mais equilibrada e eliminar o espaço em branco.

### Alterações no `ApiLogsSection.tsx`

**Cabeçalho da tabela (TableHeader):**

```tsx
<TableHeader>
  <TableRow>
    <TableHead className="w-[130px]">Data/Hora</TableHead>
    <TableHead className="w-[70px]">Origem</TableHead>
    <TableHead className="min-w-[150px]">Evento/Função</TableHead>
    <TableHead className="w-[90px]">Status</TableHead>
    <TableHead className="w-[70px]">Duração</TableHead>
    <TableHead className="w-[40px]"></TableHead>
  </TableRow>
</TableHeader>
```

**Células da linha (LogRow):**

Ajustar as classes das `TableCell` para corresponder aos novos tamanhos.

---

## Detalhes Técnicos

### Arquivo: `src/components/admin/ApiLogsSection.tsx`

**Alterações:**

1. **Linhas 389-396** - Ajustar larguras do TableHeader
2. **Linhas 115-147** - Ajustar classes das TableCell no LogRow

---

## Layout Visual Esperado

```
┌───────────┬────────┬───────────────┬────────┬────────┬────┐
│ Data/Hora │ Origem │ Evento/Função │ Status │Duração │    │
├───────────┼────────┼───────────────┼────────┼────────┼────┤
│ 01/02/26  │ ↗ OUT  │ order.paid    │ ✅ 200 │   -    │ >  │
│ 21:41:02  │        │               │        │        │    │
└───────────┴────────┴───────────────┴────────┴────────┴────┘
```

---

## Resumo

| Arquivo | Linhas | Alteração |
|---------|--------|-----------|
| `ApiLogsSection.tsx` | 389-396 | Ajustar larguras do cabeçalho |
| `ApiLogsSection.tsx` | 115-147 | Ajustar larguras das células |
