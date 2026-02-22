

## Redesign da Pagina de Aula (LessonViewer)

Reorganizacao completa da pagina de aula para melhorar hierarquia visual, usabilidade e experiencia mobile.

### Mudancas Visuais

**Antes:** Breadcrumb longo > Botao voltar > Video > Card com titulo+checkbox > Attachments > Navegacao simples

**Depois:** Header (voltar + nome do curso) > Indicador "Aula X de Y" + Titulo > Video > Descricao + Checkbox > Navegacao rica (com nome das aulas)

### O que muda

1. **Remover breadcrumb longo** -- substituir por header simples com botao "Voltar" e nome do curso como titulo (h1)
2. **Adicionar indicador "Aula X de Y"** acima do titulo da aula, em texto pequeno cinza
3. **Titulo da aula** movido para ACIMA do video (h2, grande, bold)
4. **Video** permanece com aspect-video 16:9, cantos arredondados (rounded-xl), sombra suave
5. **Descricao da aula** movida para ABAIXO do video, sem card wrapper, texto cinza
6. **Checkbox "Marcar como concluida"** em bloco separado abaixo da descricao, com borda sutil; texto muda para "Aula concluida" quando marcado
7. **Navegacao entre aulas** redesenhada: cards com nome da aula anterior/proxima; "Proxima Aula" com estilo primario, "Aula Anterior" com outline; empilhados no mobile; se ultima aula, texto muda para "Concluir Curso"
8. **Attachments** mantem-se apos checkbox se existirem
9. **Content HTML** (se existir) renderizado apos descricao
10. **Container** reduzido para max-w-3xl (800px), padding responsivo

### Detalhes Tecnicos

**Arquivo modificado**: `src/pages/customer/LessonViewer.tsx`

Alteracoes principais:
- Remover import e uso de `CourseBreadcrumb`
- Calcular `totalLessons` e `currentLessonNumber` a partir do array `lessons`
- Container: `max-w-6xl` para `max-w-3xl`, padding `px-4 py-6 sm:px-6 sm:py-8`
- Header: Botao voltar + `<h1>` com nome do curso (`lesson.course_modules.courses.title`)
- Separador visual (`<Separator>`)
- Indicador: `<p className="text-sm text-muted-foreground">Aula {n} de {total}</p>`
- Titulo: `<h2 className="text-xl sm:text-2xl font-bold">` (antes era text-3xl dentro de Card)
- Video: adicionar `rounded-xl shadow-sm`
- Descricao: `<p>` simples sem Card wrapper
- Checkbox: envolto em `<div className="border rounded-lg p-3 sm:p-4">` com texto condicional
- Navegacao: dois cards (`flex flex-col sm:flex-row gap-3 sm:justify-between`), cada botao mostra nome da aula; no mobile empilham verticalmente
- Scroll to top ao navegar: adicionar `window.scrollTo(0, 0)` nos handlers de navegacao

Nenhum hook ou componente externo precisa ser alterado. A query `useModuleContent` ja retorna todas as aulas do modulo com posicao, o que permite calcular "Aula X de Y".

