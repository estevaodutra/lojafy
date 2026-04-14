

# Remover Emojis dos Produtos (Round 2)

## Problema
A limpeza anterior não funcionou completamente — ainda restam **194 produtos** com emojis nas descrições (📦, ✅, ⭐, 🎯, 📋, ⚠️, 🔥, 💡, etc).

## Causa provável
O script anterior pode ter falhado silenciosamente em alguns produtos, ou a regex/biblioteca `emoji` não cobriu todos os caracteres Unicode especiais presentes.

## Solução
Executar um novo script Python mais robusto que:
1. Busca **todos** os produtos via API REST do Supabase (usando service_role ou anon key com paginação)
2. Remove emojis usando uma regex abrangente que cobre todos os blocos Unicode de emojis: `[\U0001F600-\U0001F64F\U0001F300-\U0001F5FF\U0001F680-\U0001F6FF\U0001F1E0-\U0001F1FF\U00002702-\U000027B0\U0000FE00-\U0000FE0F\U0001F900-\U0001F9FF\U0001FA00-\U0001FA6F\U0001FA70-\U0001FAFF\U00002600-\U000026FF\U00002B50-\U00002B55\U0000200D\U00002300-\U000023FF\U0000231A-\U0000231B]` e variantes de selector
3. Normaliza espaçamento (remove espaços duplos, trim)
4. Atualiza cada produto modificado via PATCH na API REST do Supabase
5. Loga quantos produtos foram atualizados

## Escopo
- Tabela: `products`
- Campos: `name` e `description`
- Todos os registros (paginados em lotes de 100)

## Execução
Script Python único rodando via `code--exec`, usando `requests` + API REST do Supabase com a anon key para leitura e service_role (ou anon com RLS bypass) para escrita.

