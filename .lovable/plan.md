

# Plano: Corrigir URL da Etiqueta de Envio

## Problema Identificado

A URL assinada da etiqueta está expirando após 1 hora (3600 segundos). Quando o webhook é recebido pelo sistema externo, a URL pode já ter expirado ou estar prestes a expirar.

**URL atual:**
```
https://...supabase.co/storage/v1/object/sign/shipping-files/...?token=...
                                                                   ↑
                                                            Expira em 1h
```

## Opções de Solução

| Opção | Descrição | Prós | Contras |
|-------|-----------|------|---------|
| 1. Aumentar expiração | Gerar URL com 7 dias (604800s) | Simples, funciona | Ainda expira eventualmente |
| 2. Tornar bucket público | Alterar `shipping-files` para público | URLs nunca expiram | Menos seguro, qualquer um acessa |
| 3. Expiração longa (30 dias) | 30 dias de validade | Funcional na prática | Token longo na URL |

## Solução Recomendada: Aumentar Expiração para 7 dias

Para webhooks, 7 dias de validade é suficiente para processar o arquivo. Isso mantém a segurança (bucket privado) enquanto dá tempo suficiente para o sistema receptor baixar o arquivo.

---

## Alteração no Código

**Arquivo:** `supabase/functions/dispatch-webhook/index.ts`

```typescript
// ANTES (1 hora = 3600 segundos)
const { data: signedUrlData } = await supabase.storage
  .from('shipping-files')
  .createSignedUrl(shippingFile.file_path, 3600);

// DEPOIS (7 dias = 604800 segundos)
const { data: signedUrlData } = await supabase.storage
  .from('shipping-files')
  .createSignedUrl(shippingFile.file_path, 604800); // 7 dias
```

---

## Alternativa: Tornar Bucket Público

Se você preferir que as etiquetas sejam sempre públicas (acessíveis sem token):

```sql
UPDATE storage.buckets 
SET public = true 
WHERE id = 'shipping-files';
```

E no código, usar URL pública:
```typescript
const publicUrl = supabase.storage
  .from('shipping-files')
  .getPublicUrl(shippingFile.file_path);

shippingLabel = {
  // ...
  download_url: publicUrl.data.publicUrl,
};
```

**Importante:** Isso permitiria que qualquer pessoa com a URL acessasse as etiquetas.

---

## Resumo

| Alteração | Arquivo |
|-----------|---------|
| Aumentar expiração de 1h para 7 dias | `supabase/functions/dispatch-webhook/index.ts` |

