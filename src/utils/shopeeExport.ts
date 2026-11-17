/**
 * Utilitário de Exportação em Massa para a Shopee
 * Modelo Oficial Shopee Brasil (CSV / Envio em Massa)
 */
import { toast } from 'sonner';

export const SHOPEE_CSV_HEADERS: string[] = [
  // Linha 1: Chaves técnicas
  'ps_category|0|0,ps_product_name|1|0,ps_product_description|1|0,ps_sku_parent_short|0|0,et_title_variation_integration_no|0|0,et_title_variation_1|0|0,et_title_option_for_variation_1|0|0,et_title_image_per_variation|0|3,et_title_variation_2|0|0,et_title_option_for_variation_2|0|0,ps_price|1|1,ps_stock|0|1,ps_sku_short|0|0,ps_new_size_chart|0|1,et_title_size_chart|0|3,ps_gtin_code|0|0,sl_tool_mass_upload_compatibility_title|0|0,ps_item_cover_image|0|3,ps_item_image_1|0|3,ps_item_image_2|0|3,ps_item_image_3|0|3,ps_item_image_4|0|3,ps_item_image_5|0|3,ps_item_image_6|0|3,ps_item_image_7|0|3,ps_item_image_8|0|3,ps_weight|1|1,ps_length|0|1,ps_width|0|1,ps_height|0|1,channel_id.90003|0|0,ps_product_pre_order_dts|0|1,ps_invoice_ncm|0|0,ps_invoice_cfop_same|0|0,ps_invoice_cfop_diff|0|0,ps_invoice_origin|0|0,ps_invoice_csosn|0|0,ps_invoice_cest|0|0,ps_invoice_measure_unit|0|0,ps_pis_cofins_cst_default|0|0,ps_federal_state_taxes_default|0|0,ps_operation_type_default|0|0,ps_ex_tipi_default|0|0,ps_fci_num_default|0|0,ps_recopi_num_default|0|0,ps_additional_info_default|0|0,sl_label_product_is_grouped_item|0|0,sl_label_grouped_item_gtin_sscc|0|0,sl_label_grouped_item_qty|0|0,sl_label_grouped_item_measure_unity|0|0,et_title_reason|0|0',

  // Linha 2: Metadados básicos da Shopee
  'basic,715f3bb46c53e4e922e1e9b050181419,0,516905352,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,,',

  // Linha 3: Títulos amigáveis em português
  'Categoria,Nome do Produto,Descrição do Produto,SKU principal,Número de Integração de Variação,Nome da Variação 1,Opção para Variação 1,Imagem por Variação,Nome da Variação 2,Opção para Variação 2,Preço,Estoque,SKU da Variação,Template da Tabela de Medidas,Imagem de Tamanhos,GTIN (EAN),IDs de compatibilidade,Imagem de capa,Imagem do produto 1,Imagem do produto 2,Imagem do produto 3,Imagem do produto 4,Imagem do produto 5,Imagem do produto 6,Imagem do produto 7,Imagem do produto 8,Peso,Comprimento,Largura,Altura,Correios,Prazo de Postagem para Encomenda,NCM,CFOP (Mesmo Estado),CFOP (Outro Estado),Origem,CSOSN,CEST,Unidade de Medida,CST PIS/Cofins,"% total de tributos federais, estaduais e municipais",Tipo de Operação,EX TIPI (tabela de exceções IPI),Nr. de controle da FCI,Nr. RECOPI,Informações adicionais do produto,Produto é um item agrupável,GTIN da Unidade Tributável,Quantidade da Unidade Tributável,Unidade de medida do item agrupável,Motivo da Falha',

  // Linha 4: Nível de obrigatoriedade
  'Opcional,Obrigatório,Obrigatório,Opcional,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Obrigatório,Condicional obrigatório,Opcional,Condicional obrigatório,Condicional obrigatório,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Opcional,Obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Opcional,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,Condicional obrigatório,',

  // Linha 5: Instruções detalhadas
  'Escolha o código de categoria apropriada para cada produto. Um código de categoria preciso aumentaria os resultados da pesquisa,"O nome do produto deve incluir a marca e o modelo do produto. Evite usar palavras-chave irrelevantes, que podem resultar na exclusão da seu produto.",A descrição do produto pode ser uma parte essencial para melhorar a qualidade das informações do produto na visão dos compradores; evite usar palavras irrelevantes e proibidas.,"O SKU principal será usado para localizar produtos principais. \nÉ recomendado que você não duplique o SKU principal em sua loja.",Obrigatório para produtos com variação. Você pode usar isso como uma chave exclusiva para um produto pai e todas as suas variações.,"Por favor, indique o nome da primeira variação, se aplicável.",Indique os dados da primeira variação.,"Faça o upload de uma imagem por variação, de acordo com os dados da variação na primeira variação.","Por favor, indique o nome da segunda variação, se aplicável.",Indique os dados da segunda variação.,Insira o preço do seu produto na moeda local (R$). Apenas número positivo será aceito.,"Insira o estoque do seu produto, apenas um número inteiro positivo será aceito.",SKU é um identificador exclusivo para cada variação do produto. É recomendado que você não duplique SKU em sua loja.,Insira o ID do template da tabela de medidas. Você encontra o ID na lista de templates de tabela de medidas.,"Você precisa preencher apenas o template da tabela de medidas ou a imagem de tamanhos. Se preencher ambos, apenas o template será mantido.","GTIN é um identificador para itens comerciais, desenvolvido pela organização internacional GS1.\nEsse identificador tem de 8 a 14 dígitos. Os tipos mais comuns são UPC, EAN, JAN e ISBN.","Insira os IDs da marca, modelo, ano e versão compatíveis com seu produto no seguinte modelo: [ID da marca 1, ID do modelo 1, ID do ano 1, ID da versão 1]; [ID da marca 2, ID do modelo 2, ID do ano 2, ID da versão 2]. Exemplo: [1234,4567,7899,5432];[6789,6788,5433,7889]","Faça upload do URL da imagem principal do seu produto. A imagem não pode ser duplicada com outros anúncios em sua loja. Observe que este campo de imagem é obrigatório antes que um anúncio possa ser publicado, mas você pode escolher fazer o upload da imagem mais tarde na ferramenta de atributo",Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira a URL da imagem deste produto,Insira o peso do seu produto. Apenas números positivos serão aceitos. Nota: dados incorretos de peso podem alterar o valor do fete e causar recusa da entrega pelos parceiros logísticos. É possível configurar a nível de variação.,Preencha todas as dimensões. As dimensões serão usadas para calcular o frete. É possível configurar a nível de variação.,Insira a largura do seu produto. Apenas valores positivos ou 0 serão aceitos. Nota: dados incorretos podem alterar o valor do fete e causar recusa da entrega pelos parceiros logísticos. É possível configurar a nível de variação.,Insira a altura do seu produto. Apenas valores positivos ou 0 serão aceitos. Nota: dados incorretos podem alterar o valor do fete e causar recusa da entrega pelos parceiros logísticos. É possível configurar a nível de variação.,The system automatically sets according to channel conditions.,"Prazo de Postagem para encomendas indica os dias necessários para o envio de um produto como encomenda. Se você deixar em branco, o prazo de postagem será definido como 2 dias por padrão.","Nomenclatura Comum do Mercosul, é uma convenção entre os países membros do Mercosul para reconhecer facilmente bens, serviços e fatores produtivos negociados entre si",Código Fiscal de Operações e Prestações para pedidos cujo vendedor e comprador estejam no mesmo estado. Identifica uma operação específica por categoria no momento da emissão da NF-e,Código Fiscal de Operações e Prestações para pedidos que vendedor e comprador estejam em estados diferentes. Identifica uma operação específica por categoria no momento da emissão da NF-e,Origem do produto,"Código de Situação Operacional do Simples Nacional, código de atuação societária para identificação da procedência da mercadoria e regime de tributação das operações",Insira o CEST de acordo com o NCM,Insira uma unidade de medida válida,Selecione um dos números da lista,"Insira a porcentagem total da combinação de tributos federais, estaduais e municipais utilizando até dois décimos.",Escolha uma opção da lista suspensa,"Alguns NCMS tem exceção relacionada à taxa sobre produtos industrializados. Se o NCM informado exigir essas informações, o vendedor precisa preenchê-las.","O Número de Controle da FCI (Ficha de Conteúdo de Importação) é um identificador único para cada FCI de importação, exigido na NF-e para garantir o cumprimento das leis tributárias brasileiras.","O Sistema de Registro e Controle das Operações com Papel Imune provê o prévio reconhecimento da não incidência do imposto e o registro das operações realizadas com o papel destinado à impressão de livro, jornal ou periódico (papel imune).",Inclua informações relevantes para constar na Nota Fiscal.,Escolha uma opção da lista suspensa,"Exemplo: O item é uma caixa, que contém 6 pacotes. Cada pacote contém 6 latas de refrigerante. Por favor, informe o código GRAI GTIN SSCC para a caixa.","Exemplo: O pacote contém 6 latas de refrigerante. Se você estiver vendendo um pacote de 6 latas (fardo) ou uma lata única (unidade), insira 6.","Exemplo: O pacote contém 6 latas de refrigerante. Se você estiver vendendo um pacote de 6 latas (fardo) ou uma lata única (unidade), insira UNI referente a lata individual.",',

  // Linha 6: Regras de validação
  'Escolha o ID da categoria desejada na Árvore de Categorias na Central do Vendedor ou o sistema recomendará a categoria para seus produtos.,Insira 2 a 120 caracteres para o nome do produto.,"Por favor, insira 10 para 5000 caracteres para obter uma descrição do produto.",Insira de 1 a 100 caracteres para o sku principal.,Insira 1 a 100 caracteres para definir número de integração de variação.,Insira de 1 a 30 caracteres para variação do nome.,Insira de 1 a 30 caracteres para opção do nome.,Insira o link URL da imagem do produto.,Insira de 1 a 30 caracteres para variação do nome.,Insira de 1 a 30 caracteres para opção do nome.,Insira de1.00 a 100000.00 para o preço do produto. O preço do sku mais caro dividido pelo preço do limite de sku mais barato: 4.00,Insira 0 a 10000000 para o estoque do produto.,"Favor, Insira menos de 100 caracteres para referência do sku.",Insira o ID do template da tabela de medidas.,"Insira o link aqui.\nTamanho: Máximo de 2Mb, a resolução não deve exceder 1280x1280px\nFormato: PDF, JPG, PNG",Por favor adicione de 8 a 14 números.,,"""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""","""Tamanho: máx. 2MB para cada imagem. Formato aceito: JPG, JPEG, PNG. Dimensão sugerida: 1 x 1 px""",Insira 0.00 a 100000.00 para o peso do produto.,Insira 0 a 10000000 para o comprimento do produto.,Insira 0 a 10000000 para a largura do produto.,Insira 0 a 10000000 para a altura do produto.,"Correios canal tem uma restrição de preço máximo, o preço do item não pode ser maior que BRL1000000.00.",Consulte a folha “Prazo de Postagem para pré-venda” para verificar o prazo válido. Você também pode verificar a Árvore de Categoria na Central do Vendedor para mapear ID da Categoria com nome da Categoria.,Insira um número de 8 dígitos para o NCM,Escolha uma das sugestões,Escolha uma das sugestões,Escolha uma das sugestões,Escolha uma das sugestões,Insira um CEST válido,Insira um valor de unidade de medida válida,,,,,,,,,,,,',
];

/**
 * Limpa tags HTML e formata texto plano para descrição da Shopee (10 a 5.000 chars)
 */
export function cleanDescriptionForShopee(rawText?: string, fallbackTitle?: string): string {
  if (!rawText || typeof rawText !== 'string') {
    const title = fallbackTitle || 'Produto de alta qualidade Lojafy';
    return `${title}. Produto novo, com garantia e envio rápido diretamente do centro de distribuição.`;
  }

  const cleaned = rawText
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\r\n|\r|\n/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  if (cleaned.length < 10) {
    return `${cleaned || fallbackTitle || 'Produto'}. Produto de excelente qualidade, pronta entrega e envio rápido.`;
  }

  // Máximo de 5.000 caracteres permitido pela Shopee
  return cleaned.slice(0, 4990);
}

/**
 * Trata título do produto para Shopee (2 a 120 caracteres)
 */
export function cleanTitleForShopee(rawTitle?: string): string {
  if (!rawTitle) return 'Produto Lojafy';
  const cleaned = rawTitle
    .replace(/[\r\n]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned.slice(0, 120);
}

/**
 * Trata escape de células CSV segundo o padrão RFC 4180
 */
export function escapeCsvField(val: any): string {
  if (val === null || val === undefined) return '';
  const str = String(val).trim();
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export interface ShopeeExportOptions {
  markupMultiplier?: number; // Ex: 1.0 (preço padrão) ou 1.15 (15% margem Shopee)
  defaultWeightKg?: number; // Ex: 0.3kg
  filenamePrefix?: string;
}

/**
 * Converte um produto da Lojafy em uma linha de dados da Shopee (51 colunas)
 */
export function mapProductToShopeeRow(product: any, options?: ShopeeExportOptions): string[] {
  const multiplier = options?.markupMultiplier || 1.0;
  const defaultWeight = options?.defaultWeightKg || 0.3;

  // 1. Nome do Produto (2 a 120)
  const name = cleanTitleForShopee(product.name || product.title);

  // 2. Descrição (10 a 5000)
  const description = cleanDescriptionForShopee(product.description, name);

  // 3. SKU Principal
  const skuParent = String(product.sku || product.id?.slice(0, 12) || '').trim();

  // 4. Preço (aplicando eventual margem)
  const rawPrice = Number(product.price || product.myStorePrice || product.cost_price || 0) * multiplier;
  const price = rawPrice > 0 ? rawPrice.toFixed(2) : '39.90';

  // 5. Estoque
  const stock = Math.max(1, Number(product.stock_quantity ?? 100));

  // 6. GTIN / EAN
  const gtin = product.gtin_ean13 && product.gtin_ean13.length >= 8 ? product.gtin_ean13 : '';

  // 7. Imagens (Capa + até 8 adicionais)
  const allImages: string[] = [];
  const primaryImg = product.image_url || product.main_image_url || product.cover_image || (product.images && product.images[0]);
  if (primaryImg) allImages.push(primaryImg);

  if (Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && !allImages.includes(url)) {
        allImages.push(url);
      }
    });
  }

  const coverImage = allImages[0] || '';
  const extraImages = allImages.slice(1, 9); // até 8 imagens secundárias

  // 8. Peso e Dimensões
  let weightKg = defaultWeight;
  if (product.weight) {
    const rawW = Number(product.weight);
    // Se o peso for > 50, assume que foi cadastrado em gramas (ex: 350g -> 0.35kg)
    weightKg = rawW > 50 ? rawW / 1000 : rawW;
  }
  const weightStr = Math.max(0.01, weightKg).toFixed(2);

  const lengthCm = Math.max(1, Math.round(Number(product.length) || 16));
  const widthCm = Math.max(1, Math.round(Number(product.width) || 11));
  const heightCm = Math.max(1, Math.round(Number(product.height) || 6));

  // 9. Categoria Shopee (se houver mapeada, senão em branco para a IA da Shopee sugerir)
  const categoryId = product.shopee_category_id ? String(product.shopee_category_id) : '';

  // 10. Fiscal
  const ncm = product.ncm ? String(product.ncm).replace(/\D/g, '').slice(0, 8) : '';

  // Montagem das 51 colunas exatas
  const cols = new Array(51).fill('');

  cols[0] = categoryId; // ps_category
  cols[1] = name; // ps_product_name
  cols[2] = description; // ps_product_description
  cols[3] = skuParent; // ps_sku_parent_short
  cols[4] = ''; // et_title_variation_integration_no
  cols[5] = ''; // et_title_variation_1
  cols[6] = ''; // et_title_option_for_variation_1
  cols[7] = ''; // et_title_image_per_variation
  cols[8] = ''; // et_title_variation_2
  cols[9] = ''; // et_title_option_for_variation_2
  cols[10] = price; // ps_price
  cols[11] = String(stock); // ps_stock
  cols[12] = skuParent; // ps_sku_short
  cols[13] = ''; // ps_new_size_chart
  cols[14] = ''; // et_title_size_chart
  cols[15] = gtin; // ps_gtin_code
  cols[16] = ''; // sl_tool_mass_upload_compatibility_title
  cols[17] = coverImage; // ps_item_cover_image
  cols[18] = extraImages[0] || ''; // ps_item_image_1
  cols[19] = extraImages[1] || ''; // ps_item_image_2
  cols[20] = extraImages[2] || ''; // ps_item_image_3
  cols[21] = extraImages[3] || ''; // ps_item_image_4
  cols[22] = extraImages[4] || ''; // ps_item_image_5
  cols[23] = extraImages[5] || ''; // ps_item_image_6
  cols[24] = extraImages[6] || ''; // ps_item_image_7
  cols[25] = extraImages[7] || ''; // ps_item_image_8
  cols[26] = weightStr; // ps_weight
  cols[27] = String(lengthCm); // ps_length
  cols[28] = String(widthCm); // ps_width
  cols[29] = String(heightCm); // ps_height
  cols[30] = 'Ativar'; // channel_id.90003 (Correios)
  cols[31] = ''; // ps_product_pre_order_dts
  cols[32] = ncm; // ps_invoice_ncm
  cols[33] = ''; // ps_invoice_cfop_same
  cols[34] = ''; // ps_invoice_cfop_diff
  cols[35] = '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8'; // ps_invoice_origin
  cols[36] = '102'; // ps_invoice_csosn
  cols[37] = ''; // ps_invoice_cest
  cols[38] = 'UN (UNIDADE)'; // ps_invoice_measure_unit
  cols[39] = ''; // ps_pis_cofins_cst_default
  cols[40] = ''; // ps_federal_state_taxes_default
  cols[41] = ''; // ps_operation_type_default
  cols[42] = ''; // ps_ex_tipi_default
  cols[43] = ''; // ps_fci_num_default
  cols[44] = ''; // ps_recopi_num_default
  cols[45] = ''; // ps_additional_info_default
  cols[46] = ''; // sl_label_product_is_grouped_item
  cols[47] = ''; // sl_label_grouped_item_gtin_sscc
  cols[48] = ''; // sl_label_grouped_item_qty
  cols[49] = ''; // sl_label_grouped_item_measure_unity
  cols[50] = ''; // et_title_reason

  return cols;
}

/**
 * Converte um anúncio da Lojafy (ml_listing_variants / ad) em linha Shopee
 */
export function mapAdToShopeeRow(ad: any, options?: ShopeeExportOptions): string[] {
  const product = ad.product || {};
  const multiplier = options?.markupMultiplier || 1.0;
  const defaultWeight = options?.defaultWeightKg || 0.3;

  const name = cleanTitleForShopee(ad.title || product.name || ad.internal_name);
  const description = cleanDescriptionForShopee(ad.description || product.description, name);
  const skuParent = String(ad.sku || product.sku || ad.id?.slice(0, 12) || '').trim();

  const rawPrice = Number(ad.price || product.price || product.cost_price || 0) * multiplier;
  const price = rawPrice > 0 ? rawPrice.toFixed(2) : '39.90';

  const stock = Math.max(1, Number(product.stock_quantity ?? 100));
  const gtin = product.gtin_ean13 && product.gtin_ean13.length >= 8 ? product.gtin_ean13 : '';

  const allImages: string[] = [];
  const primaryImg = ad.cover_image || product.image_url || product.main_image_url;
  if (primaryImg) allImages.push(primaryImg);

  if (Array.isArray(product.images)) {
    product.images.forEach((img: any) => {
      const url = typeof img === 'string' ? img : img?.url;
      if (url && !allImages.includes(url)) allImages.push(url);
    });
  }

  const coverImage = allImages[0] || '';
  const extraImages = allImages.slice(1, 9);

  let weightKg = defaultWeight;
  if (product.weight) {
    const rawW = Number(product.weight);
    weightKg = rawW > 50 ? rawW / 1000 : rawW;
  }
  const weightStr = Math.max(0.01, weightKg).toFixed(2);

  const lengthCm = Math.max(1, Math.round(Number(product.length) || 16));
  const widthCm = Math.max(1, Math.round(Number(product.width) || 11));
  const heightCm = Math.max(1, Math.round(Number(product.height) || 6));

  const ncm = product.ncm ? String(product.ncm).replace(/\D/g, '').slice(0, 8) : '';

  const cols = new Array(51).fill('');
  cols[0] = ''; // ps_category
  cols[1] = name; // ps_product_name
  cols[2] = description; // ps_product_description
  cols[3] = skuParent; // ps_sku_parent_short
  cols[4] = ''; // et_title_variation_integration_no
  cols[5] = ''; // et_title_variation_1
  cols[6] = ''; // et_title_option_for_variation_1
  cols[7] = ''; // et_title_image_per_variation
  cols[8] = ''; // et_title_variation_2
  cols[9] = ''; // et_title_option_for_variation_2
  cols[10] = price; // ps_price
  cols[11] = String(stock); // ps_stock
  cols[12] = skuParent; // ps_sku_short
  cols[13] = ''; // ps_new_size_chart
  cols[14] = ''; // et_title_size_chart
  cols[15] = gtin; // ps_gtin_code
  cols[16] = ''; // sl_tool_mass_upload_compatibility_title
  cols[17] = coverImage; // ps_item_cover_image
  cols[18] = extraImages[0] || '';
  cols[19] = extraImages[1] || '';
  cols[20] = extraImages[2] || '';
  cols[21] = extraImages[3] || '';
  cols[22] = extraImages[4] || '';
  cols[23] = extraImages[5] || '';
  cols[24] = extraImages[6] || '';
  cols[25] = extraImages[7] || '';
  cols[26] = weightStr;
  cols[27] = String(lengthCm);
  cols[28] = String(widthCm);
  cols[29] = String(heightCm);
  cols[30] = 'Ativar';
  cols[31] = '';
  cols[32] = ncm;
  cols[33] = '';
  cols[34] = '';
  cols[35] = '0 - Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8';
  cols[36] = '102';
  cols[37] = '';
  cols[38] = 'UN (UNIDADE)';

  return cols;
}

/**
 * Dispara o download do arquivo CSV formatado para a Shopee
 */
export function downloadShopeeCsv(rows: string[][], filenamePrefix: string = 'shopee_envio_em_massa') {
  if (rows.length === 0) {
    toast.error('Nenhum item válido para exportar.');
    return;
  }

  const formattedRows = rows.map((row) => row.map(escapeCsvField).join(','));
  const allLines = [...SHOPEE_CSV_HEADERS, ...formattedRows];

  // Adiciona UTF-8 BOM (\uFEFF) para garantir abertura sem erros de codificação no Excel
  const csvContent = '\uFEFF' + allLines.join('\r\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const dateStr = new Date().toISOString().split('T')[0];
  link.setAttribute('download', `${filenamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  toast.success(`Planilha Shopee gerada com sucesso! (${rows.length} anúncio(s) exportado(s))`);
}

/**
 * Exporta uma lista de produtos para a Shopee
 */
export function exportProductsToShopee(products: any[], options?: ShopeeExportOptions) {
  if (!products || products.length === 0) {
    toast.error('Selecione pelo menos um produto para exportar.');
    return;
  }
  const rows = products.map((p) => mapProductToShopeeRow(p, options));
  downloadShopeeCsv(rows, options?.filenamePrefix || 'shopee_produtos_massa');
}

/**
 * Exporta uma lista de anúncios para a Shopee
 */
export function exportAdsToShopee(ads: any[], options?: ShopeeExportOptions) {
  if (!ads || ads.length === 0) {
    toast.error('Selecione pelo menos um anúncio para exportar.');
    return;
  }
  const rows = ads.map((ad) => mapAdToShopeeRow(ad, options));
  downloadShopeeCsv(rows, options?.filenamePrefix || 'shopee_anuncios_massa');
}
