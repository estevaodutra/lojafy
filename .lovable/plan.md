

# Enriquecimento da Estrutura de Produtos

## Resumo

Migração não-destrutiva para enriquecer a tabela `products` com atributos estruturados, variações reais, domínios internos e condição do produto. Inclui criação de tabelas auxiliares, dados iniciais, migração de dados existentes, views e funções auxiliares.

## O que será feito

### 1. Alterações na tabela `products` (8 novos campos)
- `attributes` (JSONB) - Atributos estruturados do produto
- `variations` (JSONB) - Variações com estoque/preço individual
- `domain_id` (TEXT) - Referência ao domínio interno
- `condition` (TEXT) - Condição: new, used, refurbished, not_specified
- `catalog_source` (TEXT) - Fonte do enriquecimento
- `catalog_source_id` (TEXT) - ID na fonte original
- `enriched_at` (TIMESTAMPTZ) - Data do enriquecimento
- `has_variations` (BOOLEAN) - Flag de variações ativas

### 2. Nova tabela `product_domains`
Categorias/tipos de produto padronizados internos com atributos obrigatórios, recomendados e de variação por domínio.

### 3. Nova tabela `attribute_definitions`
Definição dos atributos disponíveis no sistema com tipos de valor, valores permitidos, unidades e agrupamento.

### 4. Dados iniciais
- 18 atributos padrão (marca, cor, tamanho, voltagem, material, etc.)
- Valores pré-definidos para COLOR (13 cores), SIZE (9 tamanhos), VOLTAGE (3 opções)
- 7 domínios de exemplo (Máquinas de Waffle, Corretores Posturais, etc.)

### 5. Migração automática de dados
Função que migra dados do campo `specifications` existente para o novo campo `attributes`, preservando cor, tamanho, material, garantia, tecnologia, marca e GTIN.

### 6. Views
- `v_products_with_attributes` - Produtos com atributos expandidos
- `v_products_needs_enrichment` - Produtos que precisam de enriquecimento

### 7. Funções auxiliares
- `add_product_attribute()` - Adicionar/atualizar atributo de um produto
- `add_product_variation()` - Adicionar variação com SKU, estoque e preço
- `get_product_total_stock()` - Calcular estoque total considerando variações

### 8. RLS Policies
- `product_domains`: leitura pública, escrita para admins
- `attribute_definitions`: leitura pública, escrita para admins

## Detalhes técnicos

### Ordem de execução (tudo em uma única migração)
1. ALTER TABLE products (novos campos + índices)
2. CREATE TABLE product_domains (com trigger updated_at)
3. CREATE TABLE attribute_definitions (com trigger updated_at)
4. INSERT dados iniciais de atributos e domínios
5. Função de migração + execução
6. CREATE VIEWS
7. CREATE funções auxiliares
8. RLS policies

### Impacto
- **Zero breaking changes** - todos os campos novos são opcionais com defaults
- **Dados existentes preservados** - campo `specifications` continua funcionando
- **Migração automática** - dados de `specifications` copiados para `attributes`
- **Nenhuma alteração de código frontend necessária** nesta etapa (só banco)

### Validação com CHECK constraint
- `condition IN ('new', 'used', 'refurbished', 'not_specified')` - usando trigger de validação ao invés de CHECK para evitar problemas com restauração

### Índices criados
- `idx_products_domain_id` - Busca por domínio
- `idx_products_condition` - Busca por condição
- `idx_products_has_variations` - Filtro de produtos com variações
- `idx_products_attributes` - Busca GIN em atributos JSONB
- Índices em `product_domains` e `attribute_definitions`

