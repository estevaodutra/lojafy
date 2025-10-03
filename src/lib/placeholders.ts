import { PublicStoreData } from '@/hooks/usePublicStore';

export const replacePlaceholders = (text: string, store: PublicStoreData): string => {
  if (!text) return '';
  
  return text
    .replace(/\{STORE_NAME\}/g, store.store_name || 'Nossa Loja')
    .replace(/\{PHONE\}/g, store.contact_phone || '(00) 0000-0000')
    .replace(/\{EMAIL\}/g, store.contact_email || 'contato@loja.com')
    .replace(/\{WHATSAPP\}/g, store.whatsapp || '(00) 00000-0000')
    .replace(/\{ADDRESS\}/g, store.contact_address || 'Endereço não informado');
};
