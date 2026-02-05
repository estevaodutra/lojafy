
# Plano: Corrigir Deploy da Edge Function `admin-create-user`

## Problema Identificado

O deploy da Edge Function `admin-create-user` está falhando com "Bundle generation timed out". 

A causa provável é o import genérico `@supabase/supabase-js@2` que pode causar problemas de resolução, enquanto outras funções do projeto usam a versão específica `@2.57.4`.

---

## Solução

Atualizar o import do Supabase para usar a versão fixa `@2.57.4`, seguindo o padrão das outras Edge Functions do projeto.

---

## Alteração

### Arquivo: `supabase/functions/admin-create-user/index.ts`

**Linha 1:**
```typescript
// Antes
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// Depois
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';
```

---

## Resumo

| Arquivo | Alteração |
|---------|-----------|
| `supabase/functions/admin-create-user/index.ts` | Fixar versão do Supabase para `@2.57.4` |
