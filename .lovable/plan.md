

# Plano: Corrigir Erro de Deploy da Edge Function

## Problema Identificado

O erro **404 - "Requested function was not found"** ocorre porque a Edge Function `api-integra-ml-token` não foi implantada devido a um **erro de sintaxe** no código.

### Causa Raiz

Na linha 194 do arquivo `supabase/functions/api-integra-ml-token/index.ts` há um `});` duplicado:

```typescript
192:   }
193: });
194: });  // ← ERRO: Fechamento duplicado
```

Este erro de sintaxe impede o bundling e deploy da função.

---

## Arquivo a Corrigir

| Arquivo | Problema | Solução |
|---------|----------|---------|
| `supabase/functions/api-integra-ml-token/index.ts` | `});` duplicado na linha 194 | Remover a linha duplicada |

---

## Correção

Simplesmente remover a linha 194 que contém o `});` extra:

**Antes:**
```typescript
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
});  // ← Remover esta linha
```

**Depois:**
```typescript
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
```

---

## Resultado Esperado

Após a correção:
1. A Edge Function será compilada sem erros
2. O deploy automático será bem-sucedido
3. O endpoint `https://bbrmjrjorcgsgeztzbsr.supabase.co/functions/v1/api-integra-ml-token` ficará disponível
4. A chamada do n8n retornará sucesso (status 200) em vez de 404

---

## Próximos Passos

1. Corrigir o arquivo removendo a linha duplicada
2. Aguardar o deploy automático
3. Testar novamente a chamada do n8n

