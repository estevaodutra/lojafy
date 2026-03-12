# Alterar links "Início" e Logo para "/categorias"

Atualmente, o botão "Início" e a logo no Header apontam para `""` (página Index). O objetivo é que apontem para `"/"`.

## Alterações em `src/components/Header.tsx`

1. **Logo** (linha ~90): `<Link to="/">` → `<Link to="/categorias">`
2. **Nav desktop "Início"** (linha ~229): `<Link to="/">Início</Link>` → `<Link to="/categorias">Início</Link>`
3. **Nav mobile "Início"** (linha ~170): `<Link to="/">` → `<Link to="/categorias">`

São 3 substituições simples no mesmo arquivo.