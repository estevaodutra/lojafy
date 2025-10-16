-- 1. Adicionar novo valor ao ENUM knowledge_category
ALTER TYPE knowledge_category ADD VALUE IF NOT EXISTS 'academy_lesson';

-- 2. Adicionar coluna target_audience à tabela ai_knowledge_base
ALTER TABLE ai_knowledge_base 
ADD COLUMN IF NOT EXISTS target_audience text NOT NULL DEFAULT 'all'
CHECK (target_audience IN ('all', 'customer', 'reseller'));

-- 3. Adicionar campo description na tabela course_lessons
ALTER TABLE course_lessons
ADD COLUMN IF NOT EXISTS lesson_description text;

-- 4. Inserir dados de exemplo - FAQs para Clientes
INSERT INTO ai_knowledge_base (category, target_audience, title, content, keywords, priority, active) VALUES
('faq', 'customer', 'Qual o prazo de entrega?', 'O prazo de entrega varia entre 5 a 15 dias úteis após a confirmação do pagamento, dependendo da sua região e método de envio escolhido.', ARRAY['prazo', 'entrega', 'envio'], 10, true),
('faq', 'customer', 'Como rastrear meu pedido?', 'Para rastrear seu pedido, acesse "Meus Pedidos" no menu superior, clique no pedido desejado e você verá o código de rastreamento. Clique nele para acompanhar em tempo real.', ARRAY['rastreio', 'pedido', 'acompanhar'], 9, true),
('faq', 'customer', 'Quais são as formas de pagamento?', 'Aceitamos pagamento via PIX (aprovação instantânea), cartão de crédito e boleto bancário. O PIX é a forma mais rápida!', ARRAY['pagamento', 'pix', 'cartão', 'boleto'], 9, true),
('policy', 'customer', 'Política de trocas e devoluções', 'Você tem até 7 dias após o recebimento para solicitar troca ou devolução. O produto deve estar em perfeitas condições com embalagem original.', ARRAY['troca', 'devolução', 'garantia'], 8, true),
('general', 'customer', 'Como entrar em contato?', 'Você pode nos contatar pelo WhatsApp, e-mail (suporte@lojafy.com) ou através do chat de suporte disponível no site.', ARRAY['contato', 'suporte', 'ajuda'], 7, true)
ON CONFLICT DO NOTHING;

-- 5. Inserir dados de exemplo - FAQs para Revendedores
INSERT INTO ai_knowledge_base (category, target_audience, title, content, keywords, priority, active) VALUES
('faq', 'reseller', 'Como adicionar produtos ao catálogo?', 'Acesse o painel "Catálogo" no menu lateral, clique em "Adicionar Produto" e preencha as informações. Você pode importar produtos do fornecedor ou criar do zero.', ARRAY['produtos', 'adicionar', 'catálogo'], 10, true),
('faq', 'reseller', 'Como configurar minha loja?', 'Vá em "Editor de Loja" e personalize cores, logo, banners e informações. Todas as mudanças são aplicadas em tempo real na sua loja.', ARRAY['loja', 'configurar', 'personalizar'], 9, true),
('faq', 'reseller', 'Como funcionam as comissões?', 'Você recebe uma comissão sobre cada venda realizada. O percentual é definido por produto e pode ser visualizado no painel de Vendas.', ARRAY['comissão', 'vendas', 'ganhos'], 9, true),
('faq', 'reseller', 'Como compartilho minha loja?', 'Sua loja tem um link único (URL) que você encontra em "Minha Loja". Compartilhe este link nas redes sociais, WhatsApp ou onde preferir!', ARRAY['link', 'compartilhar', 'url'], 8, true),
('general', 'reseller', 'Como sacar meus ganhos?', 'Os saques são processados automaticamente ou você pode solicitar manualmente em "Finanças". O valor mínimo é R$ 50,00 e o prazo é de até 2 dias úteis.', ARRAY['saque', 'ganhos', 'dinheiro'], 8, true)
ON CONFLICT DO NOTHING;