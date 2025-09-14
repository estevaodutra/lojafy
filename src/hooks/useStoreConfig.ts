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
      
      root.style.setProperty('--primary', `${primaryHsl[0]} ${primaryHsl[1]}% ${primaryHsl[2]}%`);
      root.style.setProperty('--secondary', `${secondaryHsl[0]} ${secondaryHsl[1]}% ${secondaryHsl[2]}%`);
      root.style.setProperty('--accent', `${accentHsl[0]} ${accentHsl[1]}% ${accentHsl[2]}%`);
      root.style.setProperty('--buy-button', `${buyButtonHsl[0]} ${buyButtonHsl[1]}% ${buyButtonHsl[2]}%`);
      root.style.setProperty('--buy-button-text', `${buyButtonTextHsl[0]} ${buyButtonTextHsl[1]}% ${buyButtonTextHsl[2]}%`);
      
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