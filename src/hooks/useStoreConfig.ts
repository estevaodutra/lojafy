import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useEffect } from 'react';

interface StoreConfig {
  id: string;
  header_message: string;
  header_message_color: string;
  header_background_color: string;
  logo_url: string | null;
  store_name: string;
  primary_color: string;
  secondary_color: string;
  accent_color: string;
  buy_button_color: string;
  buy_button_text_color: string;
  product_info_color: string;
  benefits_config: any[];
  order_summary_highlight_color: string;
  order_summary_highlight_text: string;
  cart_button_color: string;
  cart_button_text_color: string;
  buy_now_button_color: string;
  buy_now_button_text_color: string;
  checkout_button_color: string;
  checkout_button_text_color: string;
  order_highlight_bg_color: string;
  security_text_color: string;
  continue_shopping_text_color: string;
  active: boolean;
}

// Convert hex to HSL
const hexToHsl = (hex: string) => {
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }

  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)];
};

export const useStoreConfig = () => {
  const { data: config, isLoading } = useQuery({
    queryKey: ['store-config'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('store_config')
        .select('*')
        .eq('active', true)
        .single();
      
      if (error) {
        console.error('Error fetching store config:', error);
        return null;
      }
      return data as StoreConfig;
    },
    retry: 1,
  });

  // Apply CSS variables when config changes
  useEffect(() => {
    if (config) {
      const root = document.documentElement;
      
      // Convert colors to HSL and apply as CSS variables
      const primaryHsl = hexToHsl(config.primary_color);
      const secondaryHsl = hexToHsl(config.secondary_color);
      const accentHsl = hexToHsl(config.accent_color);
      const buyButtonHsl = hexToHsl(config.buy_button_color);
      const buyButtonTextHsl = hexToHsl(config.buy_button_text_color);
      const cartButtonHsl = hexToHsl(config.cart_button_color);
      const cartButtonTextHsl = hexToHsl(config.cart_button_text_color);
      const buyNowButtonHsl = hexToHsl(config.buy_now_button_color);
      const buyNowButtonTextHsl = hexToHsl(config.buy_now_button_text_color);
      const checkoutButtonHsl = hexToHsl(config.checkout_button_color);
      const checkoutButtonTextHsl = hexToHsl(config.checkout_button_text_color);
      const orderHighlightBgHsl = hexToHsl(config.order_highlight_bg_color);
      const securityTextHsl = hexToHsl(config.security_text_color);
      const continueShoppingTextHsl = hexToHsl(config.continue_shopping_text_color);
      
      root.style.setProperty('--primary', `${primaryHsl[0]} ${primaryHsl[1]}% ${primaryHsl[2]}%`);
      root.style.setProperty('--secondary', `${secondaryHsl[0]} ${secondaryHsl[1]}% ${secondaryHsl[2]}%`);
      root.style.setProperty('--accent', `${accentHsl[0]} ${accentHsl[1]}% ${accentHsl[2]}%`);
      root.style.setProperty('--buy-button', `${buyButtonHsl[0]} ${buyButtonHsl[1]}% ${buyButtonHsl[2]}%`);
      root.style.setProperty('--buy-button-text', `${buyButtonTextHsl[0]} ${buyButtonTextHsl[1]}% ${buyButtonTextHsl[2]}%`);
      root.style.setProperty('--cart-button', `${cartButtonHsl[0]} ${cartButtonHsl[1]}% ${cartButtonHsl[2]}%`);
      root.style.setProperty('--cart-button-text', `${cartButtonTextHsl[0]} ${cartButtonTextHsl[1]}% ${cartButtonTextHsl[2]}%`);
      root.style.setProperty('--buy-now-button', `${buyNowButtonHsl[0]} ${buyNowButtonHsl[1]}% ${buyNowButtonHsl[2]}%`);
      root.style.setProperty('--buy-now-button-text', `${buyNowButtonTextHsl[0]} ${buyNowButtonTextHsl[1]}% ${buyNowButtonTextHsl[2]}%`);
      root.style.setProperty('--checkout-button', `${checkoutButtonHsl[0]} ${checkoutButtonHsl[1]}% ${checkoutButtonHsl[2]}%`);
      root.style.setProperty('--checkout-button-text', `${checkoutButtonTextHsl[0]} ${checkoutButtonTextHsl[1]}% ${checkoutButtonTextHsl[2]}%`);
      root.style.setProperty('--order-highlight-bg', `${orderHighlightBgHsl[0]} ${orderHighlightBgHsl[1]}% ${orderHighlightBgHsl[2]}%`);
      root.style.setProperty('--security-text', `${securityTextHsl[0]} ${securityTextHsl[1]}% ${securityTextHsl[2]}%`);
      root.style.setProperty('--continue-shopping-text', `${continueShoppingTextHsl[0]} ${continueShoppingTextHsl[1]}% ${continueShoppingTextHsl[2]}%`);
      
      // Apply header colors directly (for non-HSL usage)
      root.style.setProperty('--header-bg', config.header_background_color);
      root.style.setProperty('--header-text', config.header_message_color);
      root.style.setProperty('--product-info-color', config.product_info_color);
      root.style.setProperty('--order-highlight-color', config.order_summary_highlight_color);
    }
  }, [config]);

  return {
    config,
    isLoading,
  };
};