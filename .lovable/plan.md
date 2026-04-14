

# Remover Emojis dos Produtos no Banco de Dados

## Problema
Há emojis nas descrições (e possivelmente títulos) de produtos no banco. Encontrei ~30+ produtos com emojis nas descrições (🔥, ✅, ⭐, 💡, 🧲, ✨, etc). Os títulos parecem limpos.

## Solução
Executar um script Python que:
1. Busca todos os produtos via Supabase
2. Remove emojis dos campos `name` e `description` usando regex
3. Atualiza cada produto modificado via UPDATE

Precisa ser feito via script porque o Supabase read_query só permite SELECT e migrations não suportam UPDATE em dados existentes facilmente com regex de emojis.

## Script
- Usa a biblioteca `emoji` ou regex para detectar e remover todos os caracteres emoji/unicode especiais
- Faz trim de espaços extras resultantes
- Loga quantos produtos foram alterados

## Escopo
- Tabela: `products`
- Campos: `name`, `description`
- Ação: remover todos os emojis, manter o texto limpo

