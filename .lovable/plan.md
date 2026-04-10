

# Horário de Corte para Envio

## Resumo
Implementar sistema de horário de corte configurável (default 11h) que calcula a data de envio baseada no horário do pagamento, exibe banner informativo no checkout, e destaca pedidos urgentes no painel do fornecedor.

---

## 1. Migração SQL

Adicionar campos na tabela `orders` e configurações na `platform_settings`:

```sql
-- Novos campos em orders
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS pago_em TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS envio_mesmo_dia BOOLEAN DEFAULT false;

-- Campos de configuração em platform_settings
ALTER TABLE platform_settings
  ADD COLUMN IF NOT EXISTS horario_corte_envio TIME DEFAULT '11:00',
  ADD COLUMN IF NOT EXISTS dias_envio JSONB DEFAULT '[1,2,3,4,5]';
```

Nota: `estimated_shipping_date` (date) já existe na tabela `orders` e será usado como `previsao_envio`.

---

## 2. Lib: `src/lib/shippingCutoff.ts`

Criar funções utilitárias:

- **`calcularDataEnvio(dataHoraPagamento, horarioCorte, diasEnvio)`**: retorna `{ data_envio: Date, envio_mesmo_dia: boolean }` considerando fuso America/Sao_Paulo, fins de semana e dias configurados.
- **`getMensagemEnvio(horarioCorte, diasEnvio)`**: retorna `{ tipo: 'hoje' | 'proximo', titulo, subtitulo }` para exibição no checkout, com countdown quando aplicável.

---

## 3. Componente: `src/components/checkout/BannerPrevisaoEnvio.tsx`

- Busca `horario_corte_envio` e `dias_envio` da `platform_settings` (query pública ou via hook existente)
- Usa `getMensagemEnvio()` para determinar o conteúdo
- Atualiza a cada 60 segundos via `setInterval`
- Estilo: verde (gradiente emerald) para "envio hoje", amarelo (amber) para "próximo dia útil"

---

## 4. Checkout: `src/pages/Checkout.tsx`

- Importar e renderizar `<BannerPrevisaoEnvio />` no step 3 (Pagamento), antes do botão "Concluir Pagamento"

---

## 5. Processamento do Pagamento

### Edge Function `api-pedidos-atualizar-status/index.ts`

Quando o status muda para `pago`:
- Buscar `horario_corte_envio` e `dias_envio` da `platform_settings`
- Calcular `estimated_shipping_date` e `envio_mesmo_dia` usando a lógica de corte
- Salvar `pago_em = NOW()`, `estimated_shipping_date` e `envio_mesmo_dia` no pedido

### Alternativa (webhook de pagamento)

Se o pagamento é confirmado via webhook/edge function `mercadopago-webhook`, adicionar a mesma lógica lá também.

---

## 6. Admin: Configuração do Horário de Corte

### `src/pages/admin/Configuracoes.tsx`

Adicionar nova tab "Envio" ou incluir na tab "Plataforma":

- Input de horário (hora:minuto) para `horario_corte_envio`
- Checkboxes para `dias_envio` (Seg-Dom)
- Botão "Salvar Configurações"

### `src/hooks/usePlatformSettings.ts`

Expandir a interface `PlatformSettings` com `horario_corte_envio` e `dias_envio`.

---

## 7. Painel do Fornecedor

### `src/pages/supplier/OrderManagement.tsx`

Adicionar seção no topo da página:
- Card "Pedidos para Enviar HOJE" — filtro: `envio_mesmo_dia = true AND estimated_shipping_date = hoje AND status IN ('pago', 'recebido', 'em_preparacao', 'embalado')`
- Card "Pedidos para Amanhã" — filtro: `estimated_shipping_date = amanhã`
- Badge de urgência com contagem

---

## Arquivos Afetados

| Arquivo | Ação |
|---------|------|
| Migração SQL | Criar colunas `pago_em`, `envio_mesmo_dia` em orders; `horario_corte_envio`, `dias_envio` em platform_settings |
| `src/lib/shippingCutoff.ts` | Criar — funções de cálculo e mensagem |
| `src/components/checkout/BannerPrevisaoEnvio.tsx` | Criar — banner informativo |
| `src/pages/Checkout.tsx` | Adicionar banner no step 3 |
| `supabase/functions/api-pedidos-atualizar-status/index.ts` | Calcular e salvar previsão ao mudar para `pago` |
| `src/hooks/usePlatformSettings.ts` | Expandir interface com novos campos |
| `src/pages/admin/Configuracoes.tsx` | Adicionar tab/seção de configuração de envio |
| `src/pages/supplier/OrderManagement.tsx` | Seção de pedidos urgentes por data de envio |
| `src/integrations/supabase/types.ts` | Atualizado automaticamente |

