

# Fix: Produtos não aparecem para usuários anônimos

## Diagnóstico

As políticas RLS das tabelas `features` e `feature_produtos` estão restritas ao role `authenticated`. Usuários anônimos (não logados) não conseguem ler os dados, por isso a página mostra 0 produtos.

A tabela `products` já permite leitura pública (`public`), mas as outras duas não.

## Solução

Alterar as políticas de SELECT público dessas duas tabelas para incluir o role `public` (que inclui `anon`):

### 1. `features` — política "Features visíveis para todos"
- DROP a política atual (role `authenticated`)
- Recriar com role `public` e mesma condição `(ativo = true)`

### 2. `feature_produtos` — política "Anyone can read active feature_produtos"
- DROP a política atual (role `authenticated`)
- Recriar com role `public` e mesma condição `(ativo = true)`

Isso permite que qualquer visitante (logado ou não) veja features e produtos ativos, mantendo a segurança para operações de escrita.

