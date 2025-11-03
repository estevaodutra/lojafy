# API de Cadastro de Produtos

## Endpoint
`POST /api-produtos-cadastrar`

## Autenticação
Esta API requer autenticação via API Key no header `X-API-Key`.

## Campos da Requisição

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `nome` | string | ✅ Sim | Nome do produto |
| `descricao` | string | ❌ Não | Descrição detalhada do produto |
| `preco` | number | ✅ Sim | Preço de venda do produto |
| `preco_promocional` | number | ❌ Não | Preço promocional (deve ser menor que `preco`) |
| `preco_custo` | number | ❌ Não | Preço de custo (deve ser menor que `preco`) |
| `estoque` | number | ❌ Não | Quantidade em estoque (padrão: 0) |
| `nivel_minimo_estoque` | number | ❌ Não | Nível mínimo de estoque (padrão: 5) |
| `alerta_estoque_baixo` | boolean | ❌ Não | Ativa alerta de estoque baixo |
| `sku` | string | ❌ Não | SKU do produto (auto-gerado se vazio) |
| `gtin` | string | ❌ Não | GTIN/EAN-13 do produto (auto-gerado se vazio) |
| `categoria_id` | string (UUID) | ❌ Não | ID da categoria do produto |
| `subcategoria_id` | string (UUID) | ❌ Não | ID da subcategoria (deve pertencer à categoria) |
| `imagens` | array | ❌ Não | Array de URLs de imagens do produto |
| `imagem_principal` | string | ❌ Não | URL da imagem principal |
| `marca` | string | ❌ Não | Marca do produto |
| `especificacoes` | object | ❌ Não | Objeto com especificações técnicas |
| `peso` | number | ❌ Não | Peso do produto em kg |
| `largura` | number | ❌ Não | Largura do produto em cm |
| `altura` | number | ❌ Não | Altura do produto em cm |
| `comprimento` | number | ❌ Não | Comprimento do produto em cm |
| `produto_destaque` | boolean | ❌ Não | Marca o produto como destaque |
| `badge` | string | ❌ Não | Etiqueta/badge do produto (ex: "Novo", "Promoção") |
| `alta_rotatividade` | boolean | ❌ Não | Marca produto com alta rotatividade |
| **`anuncio_referencia`** | string (URL) | ❌ Não | **Link para anúncio de referência externo** |

## Campo Especial: `anuncio_referencia`

### Descrição
Link para um anúncio de referência externo onde o produto está disponível (geralmente mais barato).

### Comportamento Automático
⚠️ **IMPORTANTE**: Quando o campo `anuncio_referencia` é preenchido com uma URL válida:
- O produto é **AUTOMATICAMENTE** marcado como destaque (`produto_destaque = true`)
- O produto aparecerá nos carrosséis de produtos em destaque
- Um botão "Ver Anúncio de Referência" será exibido na página do produto

### Validação
- Deve ser uma URL válida (formato: `https://...`)
- Pode ser vazio ou nulo

### Exemplo de Uso
```json
{
  "nome": "Fone de Ouvido Bluetooth",
  "preco": 89.90,
  "anuncio_referencia": "https://www.mercadolivre.com.br/fone-bluetooth-exemplo",
  "categoria_id": "123e4567-e89b-12d3-a456-426614174000"
}
```

**Resultado**: O produto será criado e automaticamente marcado como destaque, independente do valor de `produto_destaque`.

## Exemplo de Requisição Completa

```bash
curl -X POST https://seu-projeto.supabase.co/functions/v1/api-produtos-cadastrar \
  -H "X-API-Key: sua-api-key-aqui" \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Notebook Dell Inspiron 15",
    "descricao": "Notebook com processador Intel Core i5, 8GB RAM, 256GB SSD",
    "preco": 3499.90,
    "preco_promocional": 2999.90,
    "preco_custo": 2500.00,
    "estoque": 10,
    "nivel_minimo_estoque": 3,
    "marca": "Dell",
    "categoria_id": "123e4567-e89b-12d3-a456-426614174000",
    "peso": 1.8,
    "largura": 35.8,
    "altura": 2.3,
    "comprimento": 24.9,
    "badge": "Oferta Relâmpago",
    "anuncio_referencia": "https://www.magazineluiza.com.br/notebook-dell-exemplo",
    "especificacoes": {
      "Processador": "Intel Core i5 11ª Geração",
      "Memória RAM": "8GB DDR4",
      "Armazenamento": "SSD 256GB",
      "Tela": "15.6 polegadas Full HD"
    }
  }'
```

## Resposta de Sucesso

```json
{
  "success": true,
  "message": "Produto criado com sucesso",
  "data": {
    "id": "produto-uuid",
    "nome": "Notebook Dell Inspiron 15",
    "sku": "DELL-NOT-001",
    "gtin": "7891234567890",
    "produto_destaque": true,
    "anuncio_referencia": "https://www.magazineluiza.com.br/notebook-dell-exemplo",
    "criado_em": "2025-01-01T10:00:00Z"
  }
}
```

## Respostas de Erro

### URL Inválida
```json
{
  "error": "anuncio_referencia deve ser uma URL válida",
  "received": {
    "anuncio_referencia": "url-invalida"
  }
}
```

### Campos Obrigatórios Faltando
```json
{
  "error": "Campos obrigatórios: nome, preco",
  "received": {
    "nome": null,
    "preco": null
  }
}
```

### Validação de Preço
```json
{
  "error": "Preço promocional deve ser menor que o preço regular",
  "received": {
    "preco": 100.00,
    "preco_promocional": 150.00
  }
}
```

## Comportamento de Campos Auto-gerados

- **SKU**: Se não fornecido, será gerado automaticamente baseado na categoria e marca
- **GTIN/EAN-13**: Se não fornecido, será gerado automaticamente
- **produto_destaque**: Será `true` se `anuncio_referencia` estiver preenchido, caso contrário seguirá o valor enviado

## Notas Importantes

1. ✅ Sempre forneça URLs completas (incluindo `https://`) para `anuncio_referencia`
2. ✅ O campo `anuncio_referencia` ativa automaticamente o destaque do produto
3. ✅ Produtos com anúncio de referência aparecem nas categorias e em destaque
4. ✅ Um botão especial é exibido na página do produto para acessar o anúncio externo
5. ⚠️ A validação de `subcategoria_id` verifica se pertence à `categoria_id` fornecida
