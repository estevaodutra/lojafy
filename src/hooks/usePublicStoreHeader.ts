import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicStoreData } from './usePublicStore';

export const usePublicStoreHeader = (store: PublicStoreData | null) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim() && store?.store_slug) {
      // Search within the store's products
      navigate(`/loja/${store.store_slug}/busca?q=${encodeURIComponent(searchTerm.trim())}`);
      setSearchTerm("");
      setMobileMenuOpen(false);
    }
  };

  const handleWhatsAppContact = () => {
    if (store?.whatsapp) {
      const message = encodeURIComponent(`Olá! Vi sua loja online e gostaria de mais informações.`);
      window.open(`https://wa.me/55${store.whatsapp.replace(/\D/g, '')}?text=${message}`, '_blank');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    mobileMenuOpen,
    setMobileMenuOpen,
    handleSearch,
    handleWhatsAppContact
  };
};