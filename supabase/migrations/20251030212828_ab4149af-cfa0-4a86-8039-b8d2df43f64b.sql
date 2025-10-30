-- Adicionar FAQs para base de conhecimento
-- 1. FAQ sobre Alta Rotatividade (PIX indisponível)
INSERT INTO ai_knowledge_base (category, subcategory, target_audience, title, content, keywords, priority, active) VALUES
('product_info', 'Alta Rotatividade', 'all', 'Por que não consigo gerar PIX para alguns produtos?', 'Alguns produtos da nossa loja são marcados como "Alta Rotatividade" devido à grande demanda e estoque limitado.

**POR QUE ISSO ACONTECE:**
Por política da loja, produtos de alta rotatividade NÃO podem ser pagos via PIX. Isso garante que o estoque esteja disponível no momento da compra confirmada.

**COMO IDENTIFICAR:**
Quando você tentar finalizar uma compra com esses produtos, aparecerá um alerta laranja com o título "⚠️ Produto de Alta Rotatividade Detectado" informando que o PIX não está disponível.

**O QUE FAZER:**
1. Entre em contato com nosso suporte para verificar métodos de pagamento alternativos
2. Ou escolha produtos que não tenham essa restrição

**NÃO É UM BUG - É UMA CONFIGURAÇÃO INTENCIONAL DO SISTEMA.**', ARRAY['pix', 'pagamento', 'alta rotatividade', 'não consigo pagar', 'não gera pix', 'alta demanda'], 10, true);

-- 2-16. FAQs para Revendedores
INSERT INTO ai_knowledge_base (category, subcategory, target_audience, title, content, keywords, priority, active) VALUES
('faq', 'Produtos', 'reseller', 'Como adiciono produtos à minha loja?', 'Para adicionar produtos à sua loja:

1. Acesse o menu "Produtos" no painel do revendedor
2. Clique em "Adicionar Produto" ou "Importar do Catálogo"
3. Se importar do catálogo, selecione os produtos desejados
4. Configure suas margens de lucro para cada produto
5. Ative os produtos para que fiquem visíveis na sua loja pública

**Dica:** Comece importando alguns produtos do catálogo principal para testar. Você poderá ajustar preços e margens depois.', ARRAY['adicionar produto', 'importar produto', 'catálogo', 'listar produto'], 9, true),

('faq', 'Financeiro', 'reseller', 'Onde vejo minhas comissões?', 'Suas comissões ficam visíveis no menu "Financeiro" do painel do revendedor.

Lá você encontra:
- **Saldo Disponível:** Valor que já pode ser sacado
- **Saldo Bloqueado:** Comissões de vendas recentes (liberadas após 7 dias)
- **Histórico de Transações:** Todas as comissões recebidas
- **Solicitações de Saque:** Status dos seus saques

Cada venda gera uma comissão automática baseada na margem que você configurou no produto.', ARRAY['comissão', 'comissões', 'ganhos', 'vendas', 'saldo'], 9, true),

('faq', 'Financeiro', 'reseller', 'Como funciona o cálculo de margem?', 'O cálculo de margem funciona assim:

**Exemplo:**
- Preço de custo do produto: R$ 100,00
- Sua margem configurada: 20%
- Preço final na sua loja: R$ 120,00
- Sua comissão por venda: R$ 20,00

Você define quanto quer ganhar em cada produto. Quanto maior a margem, maior seu lucro, mas cuidado para não deixar o preço pouco competitivo.

**Dica:** Analise os preços dos concorrentes e configure margens equilibradas.', ARRAY['margem', 'lucro', 'preço', 'cálculo', 'porcentagem'], 8, true),

('faq', 'Configuração', 'reseller', 'Como personalizo minha loja?', 'Para personalizar sua loja:

1. Acesse "Configurar Loja" no menu
2. Faça upload do seu logo
3. Escolha as cores do tema
4. Configure o nome e URL da loja
5. Adicione descrição e informações de contato
6. Clique em Salvar

Sua loja pública ficará acessível em: sualoja.lojafy.com (ou a URL que você configurar).', ARRAY['personalizar', 'customizar', 'logo', 'cores', 'tema', 'visual'], 9, true),

('faq', 'Configuração', 'reseller', 'Onde fica o link da minha loja pública?', 'O link da sua loja pública fica em:

1. **Menu "Configurar Loja"** → Seção "Compartilhar"
2. Copie o link exibido (formato: sualoja.lojafy.com)
3. Compartilhe nas suas redes sociais, WhatsApp, etc.

**Dica:** Você pode criar um link encurtado ou usar um domínio próprio nas configurações avançadas.', ARRAY['link da loja', 'url', 'compartilhar', 'loja pública'], 9, true),

('faq', 'Vendas', 'reseller', 'Como meus clientes fazem pedidos?', 'O processo de compra funciona assim:

1. Cliente acessa sua loja pública pelo link
2. Navega pelos produtos e adiciona ao carrinho
3. Finaliza o pedido com os dados de entrega
4. Escolhe a forma de pagamento
5. Você recebe notificação da venda
6. O pedido é processado automaticamente

Você acompanha todos os pedidos no menu "Vendas".', ARRAY['pedido', 'compra', 'cliente', 'venda', 'processo'], 8, true),

('faq', 'Financeiro', 'reseller', 'Quando recebo o dinheiro das vendas?', 'O repasse das comissões funciona assim:

- **Venda Confirmada:** Comissão é creditada no seu saldo bloqueado
- **Após 7 dias:** O valor é liberado para saque (saldo disponível)
- **Solicitação de Saque:** Você pode solicitar sempre que quiser
- **Processamento:** Saques são processados em até 2 dias úteis

O prazo de 7 dias existe para garantir que não haja problemas com o pedido (devolução, cancelamento, etc).', ARRAY['receber', 'repasse', 'prazo', 'saque', 'dinheiro'], 9, true),

('faq', 'Financeiro', 'reseller', 'Como solicito saque?', 'Para solicitar um saque:

1. Acesse o menu "Financeiro"
2. Verifique seu **Saldo Disponível** (não bloqueado)
3. Clique em "Solicitar Saque"
4. Informe o valor desejado
5. Confirme seus dados bancários
6. Aguarde aprovação (até 2 dias úteis)

**Importante:** Só é possível sacar valores do saldo disponível, não do bloqueado.', ARRAY['saque', 'sacar', 'retirar', 'transferência', 'banco'], 8, true),

('faq', 'Produtos', 'reseller', 'Posso alterar preços dos produtos?', 'Sim! Você tem total liberdade para definir suas margens e preços:

1. Acesse "Produtos" no menu
2. Clique em "Editar" no produto desejado
3. Ajuste a margem de lucro ou o preço final
4. Salve as alterações

**Atenção:** O preço mínimo é sempre o preço de custo. Você não pode vender abaixo disso.', ARRAY['alterar preço', 'mudar preço', 'editar produto', 'preço'], 7, true),

('faq', 'Produtos', 'reseller', 'Como vejo o estoque disponível?', 'O estoque é gerenciado centralmente:

- Na lista de produtos, você vê a quantidade disponível de cada item
- Quando um produto está com estoque baixo, aparece um alerta
- Produtos sem estoque ficam inativos automaticamente
- Você é notificado quando produtos voltam ao estoque

**Importante:** Você não precisa gerenciar estoque manualmente. O sistema sincroniza automaticamente com o fornecedor.', ARRAY['estoque', 'quantidade', 'disponível', 'produto'], 8, true),

('faq', 'Produtos', 'reseller', 'O que significa "produto inativo"?', 'Um produto inativo significa que ele:

- Não aparece na sua loja pública
- Não está disponível para venda
- Pode estar sem estoque OU você desativou manualmente

Para ativar novamente:
1. Vá em "Produtos"
2. Filtre por "Inativos"
3. Clique em "Ativar" no produto desejado

**Dica:** Desative produtos que não quer mais vender, mesmo que tenham estoque.', ARRAY['inativo', 'desativado', 'produto inativo', 'ativar'], 7, true),

('faq', 'Parceria', 'reseller', 'Como funciona o sistema de parceria?', 'Nosso programa de parceria/revenda funciona assim:

**Você:**
- Escolhe produtos do catálogo
- Define suas margens de lucro
- Divulga sua loja personalizada
- Vende para seus clientes

**Nós cuidamos de:**
- Estoque dos produtos
- Processamento de pagamentos
- Embalagem e envio
- Atendimento pós-venda do pedido

Você ganha comissão em cada venda, sem precisar investir em estoque ou logística!', ARRAY['parceria', 'revenda', 'como funciona', 'dropshipping'], 9, true),

('faq', 'Academia', 'reseller', 'Onde acesso as aulas da academia?', 'Para acessar a Lojafy Academy:

1. Clique no menu "Academia" no seu painel
2. Navegue pelos cursos disponíveis
3. Clique em "Acessar Curso" para ver as aulas
4. Assista às videoaulas e aprenda estratégias de vendas

**Temas disponíveis:**
- Marketing Digital para Revendedores
- Estratégias de Precificação
- Como Vender Mais nas Redes Sociais
- Atendimento ao Cliente

Novos cursos são adicionados regularmente!', ARRAY['academia', 'curso', 'aula', 'aprender', 'treinamento'], 8, true),

('faq', 'Início', 'reseller', 'Por onde devo começar como novo revendedor?', 'Bem-vindo ao programa de revenda! Siga estes passos:

**1. Configure sua Loja** (5 min)
   - Personalize logo e cores
   - Defina a URL da sua loja

**2. Adicione Produtos** (10 min)
   - Importe produtos do catálogo
   - Configure suas margens

**3. Compartilhe o Link** (2 min)
   - Copie o link da sua loja
   - Divulgue nas redes sociais

**4. Aprenda na Academia** (sempre)
   - Assista cursos sobre vendas
   - Aplique as estratégias aprendidas

**5. Acompanhe Resultados**
   - Monitore vendas no painel
   - Ajuste preços conforme necessário

Pronto! Sua loja está no ar. 🚀', ARRAY['começar', 'iniciante', 'primeiro passo', 'novo revendedor'], 10, true);
