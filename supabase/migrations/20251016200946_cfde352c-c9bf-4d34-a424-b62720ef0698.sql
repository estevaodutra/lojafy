-- Adicionar campo subcategory à tabela ai_knowledge_base
ALTER TABLE ai_knowledge_base
ADD COLUMN subcategory text;

-- Inserir FAQs de Clientes (da página FAQ.tsx)
INSERT INTO ai_knowledge_base (category, target_audience, subcategory, title, content, keywords, priority, active) VALUES

-- PEDIDOS
('faq', 'customer', 'Pedidos', 'Como faço um pedido?', 
 'Para fazer um pedido, navegue pelos produtos, adicione os itens desejados ao carrinho e clique em "Finalizar Compra". Preencha seus dados de entrega e pagamento para concluir o pedido.',
 ARRAY['pedido', 'compra', 'carrinho'], 10, true),

('faq', 'customer', 'Pedidos', 'Posso alterar ou cancelar meu pedido?',
 'Você pode alterar ou cancelar seu pedido até 2 horas após a confirmação. Após esse prazo, entre em contato conosco pelo WhatsApp (11) 99999-9999.',
 ARRAY['cancelar', 'alterar', 'pedido'], 9, true),

('faq', 'customer', 'Pedidos', 'Como acompanho meu pedido?',
 'Após a confirmação do pedido, você receberá um código de rastreamento por e-mail. Você também pode acompanhar o status na seção "Rastrear Pedido" do nosso site.',
 ARRAY['rastreamento', 'acompanhar', 'código'], 9, true),

-- ENTREGA
('faq', 'customer', 'Entrega', 'Qual o prazo de entrega?',
 'O prazo de entrega varia conforme sua localização:\n- Região Sudeste: 3-5 dias úteis\n- Região Sul: 5-7 dias úteis\n- Demais regiões: 7-12 dias úteis\n\nO prazo começa a contar após a aprovação do pagamento.',
 ARRAY['prazo', 'entrega', 'tempo'], 10, true),

('faq', 'customer', 'Entrega', 'Vocês entregam em todo o Brasil?',
 'Sim, entregamos em todo território nacional através dos Correios. Algumas localidades remotas podem ter prazo estendido.',
 ARRAY['entrega', 'brasil', 'correios'], 8, true),

('faq', 'customer', 'Entrega', 'Como é calculado o frete?',
 'O frete é calculado automaticamente com base no CEP de destino, peso e dimensões do produto. Oferecemos frete grátis para compras acima de R$ 299,00 (Sul e Sudeste) ou R$ 399,00 (demais regiões).',
 ARRAY['frete', 'cálculo', 'grátis'], 9, true),

-- PAGAMENTO
('faq', 'customer', 'Pagamento', 'Quais formas de pagamento vocês aceitam?',
 'Aceitamos cartões de crédito (Visa, Mastercard, Elo), cartões de débito, PIX e boleto bancário. Para cartão de crédito, parcelamos em até 12x sem juros em compras acima de R$ 500,00.',
 ARRAY['pagamento', 'cartão', 'pix', 'boleto'], 10, true),

('faq', 'customer', 'Pagamento', 'É seguro comprar no site?',
 'Sim, nosso site possui certificado SSL e seguimos os mais altos padrões de segurança. Seus dados estão protegidos e não compartilhamos informações com terceiros.',
 ARRAY['segurança', 'dados', 'compra'], 8, true),

('faq', 'customer', 'Pagamento', 'Quando o pagamento é processado?',
 'Cartão de crédito/débito e PIX: aprovação imediata. Boleto: até 3 dias úteis após o pagamento. Só enviamos os produtos após a confirmação do pagamento.',
 ARRAY['pagamento', 'processamento', 'aprovação'], 8, true),

-- TROCA E DEVOLUÇÃO
('faq', 'customer', 'Troca e Devolução', 'Posso trocar um produto?',
 'Sim, você tem 30 dias para trocar produtos em perfeito estado, na embalagem original. Por arrependimento, o prazo é de 7 dias. O frete da devolução é gratuito em caso de defeito ou erro nosso.',
 ARRAY['troca', 'devolução', 'prazo'], 10, true),

('faq', 'customer', 'Troca e Devolução', 'Como solicito uma troca?',
 'Entre em contato conosco através do WhatsApp, e-mail ou formulário de contato informando o número do pedido e motivo da troca. Nossa equipe enviará as instruções para devolução.',
 ARRAY['solicitar', 'troca', 'contato'], 9, true),

('faq', 'customer', 'Troca e Devolução', 'Quanto tempo demora o reembolso?',
 'Após recebermos e analisarmos o produto devolvido, o reembolso é processado em até 7 dias úteis. O valor é estornado na mesma forma de pagamento utilizada na compra.',
 ARRAY['reembolso', 'estorno', 'prazo'], 8, true),

-- PRODUTOS
('faq', 'customer', 'Produtos', 'Os produtos têm garantia?',
 'Todos os produtos possuem garantia do fabricante. Eletrônicos: 12 meses, Acessórios: 3-6 meses conforme especificação. Também oferecemos garantia estendida opcional para alguns produtos.',
 ARRAY['garantia', 'produtos'], 9, true),

('faq', 'customer', 'Produtos', 'Os produtos são originais?',
 'Sim, todos os nossos produtos são 100% originais e procedentes. Trabalhamos apenas com fornecedores autorizados e oferecemos nota fiscal em todas as vendas.',
 ARRAY['originais', 'nota fiscal', 'fornecedores'], 9, true),

('faq', 'customer', 'Produtos', 'Posso retirar o produto na loja?',
 'Atualmente trabalhamos apenas com vendas online e entrega via Correios. Não possuímos loja física para retirada.',
 ARRAY['retirada', 'loja física'], 7, true),

-- FAQs para REVENDEDORES
('faq', 'reseller', 'Catálogo', 'Como adiciono produtos à minha loja?',
 'Acesse o painel Catálogo > Produtos e clique em "Adicionar ao Catálogo". Você pode personalizar preços e descrições antes de publicar.',
 ARRAY['adicionar', 'produtos', 'catálogo'], 10, true),

('faq', 'reseller', 'Personalização', 'Como configuro minha loja personalizada?',
 'Vá em Editor de Loja no menu lateral. Lá você pode personalizar cores, logo, banners e informações de contato da sua loja.',
 ARRAY['configurar', 'loja', 'personalizar'], 10, true),

('faq', 'reseller', 'Financeiro', 'Como funciona a comissão de vendas?',
 'Você recebe comissão sobre cada venda realizada através da sua loja. Os valores ficam disponíveis na aba Comissões e podem ser sacados após 7 dias.',
 ARRAY['comissão', 'vendas', 'saque'], 10, true),

('faq', 'reseller', 'Vendas', 'Como meus clientes rastreiam pedidos?',
 'Cada cliente recebe um link exclusivo por e-mail para rastrear o pedido. Você também pode acompanhar todos os pedidos no painel Vendas.',
 ARRAY['rastreamento', 'pedidos', 'clientes'], 9, true),

('faq', 'reseller', 'Personalização', 'Posso criar meus próprios banners?',
 'Sim! Acesse Banners no menu e faça upload das suas imagens promocionais. Recomendamos 1920x600px para desktop e 800x800px para mobile.',
 ARRAY['banners', 'upload', 'imagens'], 8, true);