-- Adicionar campos de auto-trigger para respostas padrão
ALTER TABLE ai_standard_answers 
ADD COLUMN IF NOT EXISTS auto_trigger_enabled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS trigger_keywords TEXT[] DEFAULT '{}';

-- Criar índice para melhor performance nas buscas
CREATE INDEX IF NOT EXISTS idx_standard_answers_auto_trigger 
ON ai_standard_answers(auto_trigger_enabled) 
WHERE auto_trigger_enabled = TRUE;

-- Configurar a resposta "Informações sobre produto" para auto-trigger
UPDATE ai_standard_answers 
SET 
  auto_trigger_enabled = TRUE,
  trigger_keywords = ARRAY[
    'cor', 'cores', 'tamanho', 'tamanhos', 'medida', 'medidas',
    'estoque', 'disponível', 'disponibilidade', 'tem', 'possui',
    'preço', 'valor', 'custa', 'quanto', 'promoção', 'desconto',
    'descrição', 'especificação', 'características', 'detalhes',
    'foto', 'fotos', 'imagem', 'catálogo', 'catalogo', 'produto', 'produtos'
  ]
WHERE name = 'Informações sobre produto' AND EXISTS (
  SELECT 1 FROM ai_standard_answers WHERE name = 'Informações sobre produto'
);