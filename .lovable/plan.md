
# Melhorar Documentacao do Endpoint PUT /products/:id

## Problema
O endpoint "Atualizar Produto" (PUT /products/:id) esta documentado com um exemplo muito simples (`{ name: 'Atualizado', price: 39.90 }`), sem deixar claro quais campos podem ser atualizados -- especialmente nome, descricao e imagem.

## O que sera feito

### 1. Atualizar documentacao em `src/data/apiEndpointsData.ts`
Expandir o endpoint "Atualizar Produto" (linha ~1491) para incluir:
- Descricao mais clara explicando que todos os campos podem ser atualizados parcialmente
- Exemplo de requestBody completo mostrando nome, descricao, foto e outros campos comuns
- Lista dos campos aceitos como referencia

### Exemplo do requestBody atualizado:
```text
{
  name: "Novo Nome do Produto",
  description: "Nova descrição detalhada do produto",
  short_description: "Descrição curta atualizada",
  main_image_url: "https://exemplo.com/nova-foto.jpg",
  images: ["https://exemplo.com/foto1.jpg", "https://exemplo.com/foto2.jpg"],
  price: 39.90,
  original_price: 49.90,
  cost_price: 25.00,
  brand: "Nova Marca",
  sku: "SKU-ATUALIZADO",
  category_id: "uuid-categoria",
  stock_quantity: 100,
  active: true,
  condition: "new",
  attributes: [
    { id: "BRAND", name: "Marca", value: "Nova Marca" }
  ]
}
```

### Detalhes tecnicos
- Arquivo modificado: `src/data/apiEndpointsData.ts` (linhas ~1491-1498)
- Expandir o campo `description` para explicar que e uma atualizacao parcial (envie apenas os campos que deseja alterar)
- Expandir o `requestBody` com exemplo completo
- Expandir o `responseExample` para refletir os campos atualizados
- Nenhum outro arquivo precisa ser alterado
