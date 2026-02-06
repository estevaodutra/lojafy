

# Plano: Ajustar Posição do Botão Mercado Livre no Catálogo

## Resumo

Modificar o layout dos botões no catálogo para que o botão "Publicar no Mercado Livre" fique na mesma linha dos botões "Adicionar" e "Calcular", conforme mostrado na imagem de referência.

---

## Layout Atual vs Desejado

**Atual:**
O botão ML está na mesma linha, mas como um botão de largura total (w-full) pode não estar alinhado corretamente.

**Desejado (conforme imagem):**
```text
┌────────────────────────────────────────────────┐
│  [+ Adicionar] [Calcular] [Publicar no ML]     │
└────────────────────────────────────────────────┘
```

Todos os três botões lado a lado, ocupando proporcionalmente a largura disponível.

---

## Alterações Necessárias

### 1. Modificar `MercadoLivreButton.tsx`

Remover `w-full` e ajustar para funcionar em linha com outros botões:
- Usar `flex-1` para ocupar espaço proporcional
- Manter texto "Publicar no Mercado Livre"
- Manter cores amber (publicar), amber+spinner (publicando), verde (publicado)

### 2. Verificar `Catalog.tsx`

Confirmar que o botão está dentro da div `flex space-x-2` junto com "Adicionar" e "Calcular", todos usando `flex-1` para distribuição igual.

---

## Código a Modificar

**Arquivo:** `src/components/reseller/MercadoLivreButton.tsx`

| Estado | Classe |
|--------|--------|
| Publicar | `flex-1 bg-amber-500 hover:bg-amber-600 text-white` |
| Publicando | `flex-1 bg-amber-500 hover:bg-amber-500 text-white` |
| Publicado | `flex-1 bg-green-500 hover:bg-green-500 text-white` |

**Arquivo:** `src/pages/reseller/Catalog.tsx`

O botão já está dentro da div de botões (linha 495-509), só precisa garantir que use `flex-1` igual aos outros.

---

## Resultado Esperado

1. Três botões alinhados horizontalmente na parte inferior do card
2. Botões com largura proporcional (cada um ocupando 1/3 do espaço)
3. Visual consistente com a imagem de referência fornecida

