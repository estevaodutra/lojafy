

## Corrigir Validacao do Campo Slug

### Problema

O campo Slug no formulario de features usa a regex `^[a-z_]+$`, que permite apenas letras minusculas e underscores. Slugs com numeros (como `top_10_produtos`) sao rejeitados pela validacao.

### Solucao

Alterar a regex de validacao do slug no `FeatureFormModal.tsx` para `^[a-z0-9_]+$`, permitindo letras minusculas, numeros e underscores.

### Alteracao

**Arquivo: `src/components/admin/FeatureFormModal.tsx`**
- Linha do schema zod: trocar `^[a-z_]+$` por `^[a-z0-9_]+$`
- Atualizar mensagem de erro para "Apenas letras minusculas, numeros e underscores"

### Secao Tecnica

Alteracao de 1 linha no schema de validacao zod:

```text
// De:
slug: z.string().min(1, '...').regex(/^[a-z_]+$/, 'Apenas letras minúsculas e underscores')

// Para:
slug: z.string().min(1, '...').regex(/^[a-z0-9_]+$/, 'Apenas letras minúsculas, números e underscores')
```

