

# Plano: Unificar Lógica de Expiração - Endpoints e Documentação

## Resumo Executivo

Atualmente existem **3 endpoints** que calculam datas de expiração individuais, contradizendo a arquitetura onde a expiração deveria ser controlada centralmente pelo campo `profiles.subscription_expires_at`. Este plano unifica essa lógica e atualiza a documentação da API.

---

## Endpoints Identificados

| Endpoint | Problema |
|----------|----------|
| `api-features-atribuir` | Calcula `data_expiracao` individual (30d, 365d, etc) |
| `atribuir-feature` | Duplicado, mesmo problema |
| `api-matriculas-cadastrar` | Aceita `expires_at` individual por matrícula |
| `api-matriculas-atualizar-validade` | Atualiza `expires_at` individual |

---

## Alterações Técnicas

### 1. Edge Function: `api-features-atribuir/index.ts`

**Remover** o cálculo de `data_expiracao` baseado em tipo_periodo.

**Substituir por** busca da expiração do perfil do usuário:

```text
ANTES (linhas 143-162):
- switch(tipo_periodo) com cálculos individuais

DEPOIS:
- Buscar profiles.subscription_expires_at do usuário
- Para vitalicio/cortesia: data_expiracao = null
- Para outros: usar a expiração global do perfil
- Retornar na resposta os dias restantes calculados
```

### 2. Edge Function: `atribuir-feature/index.ts`

Aplicar a **mesma mudança** do item 1. Este endpoint é usado pelo painel admin.

### 3. Edge Function: `api-matriculas-cadastrar/index.ts`

**Alterar comportamento:**
- Ignorar parâmetro `expires_at` individual
- Herdar automaticamente de `profiles.subscription_expires_at`
- Manter parâmetro na assinatura para retrocompatibilidade, mas ignorá-lo

### 4. Edge Function: `api-matriculas-atualizar-validade/index.ts`

**Opções:**
- **Deprecar** este endpoint (recomendado) - expiração é controlada pelo perfil
- Ou alterar para atualizar `profiles.subscription_expires_at` ao invés de matrícula individual

---

## Alterações na Documentação (apiEndpointsData.ts)

### A. Endpoint "Atribuir Feature" (linhas 554-592)

```text
Atualizar description:
"Atribui uma feature a um usuário. A expiração é controlada 
exclusivamente pelo profiles.subscription_expires_at. O tipo_periodo 
classifica o tipo da assinatura, mas não define data de expiração individual."

Atualizar requestBody:
- Remover _nota sobre tipo_periodo
- Adicionar nota que expiração é global

Atualizar responseExample:
- Remover data_expiracao individual
- Adicionar expiracao_perfil e dias_restantes
```

### B. Endpoint "Matricular Usuário" (linhas 404-432)

```text
Atualizar description:
"A validade da matrícula é herdada automaticamente de 
profiles.subscription_expires_at. O parâmetro expires_at é ignorado."

Remover expires_at do requestBody exemplo
Adicionar nota sobre herança de expiração
```

### C. Endpoint "Atualizar Validade" (linhas 460-473)

```text
Opção 1: Deprecar
- Adicionar "[DEPRECADO]" no título
- Atualizar description explicando que expiração é global

Opção 2: Alterar para atualizar perfil
- Mudar para atualizar profiles.subscription_expires_at
- Renomear parâmetros conforme
```

---

## Arquivos Afetados

| Arquivo | Tipo de Mudança |
|---------|-----------------|
| `supabase/functions/api-features-atribuir/index.ts` | Remover cálculo individual |
| `supabase/functions/atribuir-feature/index.ts` | Remover cálculo individual |
| `supabase/functions/api-matriculas-cadastrar/index.ts` | Herdar expiração do perfil |
| `supabase/functions/api-matriculas-atualizar-validade/index.ts` | Deprecar ou alterar |
| `src/data/apiEndpointsData.ts` | Atualizar documentação |

---

## Resultado Esperado

Após as alterações:
1. Features e matrículas expiram junto com a assinatura do usuário
2. Apenas `vitalicio` e `cortesia` ignoram a expiração global
3. Documentação reflete o comportamento real
4. APIs mantêm retrocompatibilidade (parâmetros aceitos mas ignorados)

