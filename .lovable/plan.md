

## Enviar dados de acesso do usuario katana no payload de clonagem

### Problema

O componente atualmente busca a integracao ML do usuario logado, mas o usuario quer que sempre use os dados de acesso do usuario `katana.qualidade_0a@icloud.com` (user_id: `b21170cb-2872-45df-b31b-bf977d93dc14`).

### Solucao

Alterar `getMarketplaceIntegration()` para buscar a integracao pelo user_id fixo do katana em vez do usuario logado. Tambem adicionar o email do usuario ao payload enviado ao webhook.

### Alteracoes

**Arquivo: `src/components/admin/CloneFromMarketplace.tsx`**

1. Alterar a funcao `getMarketplaceIntegration` (linha 66-85) para buscar pelo user_id `b21170cb-2872-45df-b31b-bf977d93dc14` em vez de `user.id`
2. Adicionar campo `user_email` ao payload (linha 142) com o valor `katana.qualidade_0a@icloud.com`

### Secao Tecnica

Mudancas pontuais:
- Linha 72-76: trocar `.eq("user_id", user.id)` por `.eq("user_id", "b21170cb-2872-45df-b31b-bf977d93dc14")`
- Linha 142-144: adicionar `user_email: "katana.qualidade_0a@icloud.com"` ao payload

