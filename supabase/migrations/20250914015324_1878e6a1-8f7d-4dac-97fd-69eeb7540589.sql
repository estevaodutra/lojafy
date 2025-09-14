-- Add new color configuration fields for e-commerce elements
ALTER TABLE public.store_config 
ADD COLUMN cart_button_color text DEFAULT '#3b82f6',
ADD COLUMN cart_button_text_color text DEFAULT '#ffffff',
ADD COLUMN buy_now_button_color text DEFAULT '#22c55e',
ADD COLUMN buy_now_button_text_color text DEFAULT '#ffffff',
ADD COLUMN checkout_button_color text DEFAULT '#22c55e',
ADD COLUMN checkout_button_text_color text DEFAULT '#ffffff',
ADD COLUMN order_highlight_bg_color text DEFAULT '#f0fdf4',
ADD COLUMN security_text_color text DEFAULT '#6b7280',
ADD COLUMN continue_shopping_text_color text DEFAULT '#3b82f6';