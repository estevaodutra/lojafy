-- Garantir que exista pelo menos uma configuração de loja ativa
INSERT INTO public.store_config (
  store_name,
  active,
  header_message,
  header_message_color,
  header_background_color,
  primary_color,
  secondary_color,
  accent_color,
  buy_button_color,
  buy_button_text_color,
  product_info_color,
  order_summary_highlight_color,
  order_summary_highlight_text
)
SELECT 
  'Lojafy', 
  true,
  'Frete grátis para todo o Brasil acima de R$ 199',
  '#ffffff',
  '#000000',
  '#0f172a', -- slate-900 para combinar com a logo azul/preta
  '#f8fafc', -- slate-50
  '#2563eb', -- blue-600
  '#16a34a', -- green-600
  '#ffffff',
  '#334155', -- slate-700
  '#16a34a',
  '#ffffff'
WHERE NOT EXISTS (SELECT 1 FROM public.store_config WHERE active = true);
