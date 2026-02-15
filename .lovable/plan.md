

# Restringir Lojafy Integra para um unico usuario

## Situacao atual

A feature `lojafy_integra` esta atribuida a **varios usuarios** (mais de 10). O objetivo e manter apenas para `katana.qualidade_0a@icloud.com` (user_id: `b21170cb-2872-45df-b31b-bf977d93dc14`).

## Alteracao necessaria

### 1. Revogar feature dos demais usuarios (SQL via insert tool)

Atualizar o status de todas as atribuicoes de `lojafy_integra` para `revogado`, exceto a do usuario alvo:

```text
UPDATE user_features
SET status = 'revogado', updated_at = NOW()
WHERE feature_id = '56f6d58f-5356-4b6f-8ab1-291ea450591f'
  AND user_id != 'b21170cb-2872-45df-b31b-bf977d93dc14'
  AND status IN ('ativo', 'trial');
```

Isso mantem o historico (nao deleta registros) e os usuarios perdem acesso imediatamente pois o hook `useFeature` verifica `status IN ('ativo', 'trial')`.

### 2. Nenhuma alteracao de codigo necessaria

A rota ja esta protegida pelo `FeatureRoute` e o menu ja usa `useFeature`. Ao revogar, os usuarios simplesmente perdem acesso automaticamente.

## Resultado

- Apenas `katana.qualidade_0a@icloud.com` mantera acesso ao Lojafy Integra
- Os demais usuarios nao verao mais o menu nem conseguirao acessar a rota
- Nenhuma alteracao de codigo frontend/backend necessaria

