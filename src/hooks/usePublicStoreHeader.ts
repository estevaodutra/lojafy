import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PublicStoreData } from './usePublicStore';
import { useAuth } from '@/contexts/AuthContext';

export const usePublicStoreHeader = (store: PublicStoreData | null) => {
  const { user, profile } = useAuth();
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

  const handleLogin = () => {
    // Save current URL to return after login
    if (store?.store_slug) {
      const returnUrl = `/loja/${store.store_slug}`;
      sessionStorage.setItem('returnUrl', returnUrl);
    }
    navigate('/auth');
  };

  const handleProfile = () => {
    // Navigate to user panel based on role
    if (profile?.role === 'reseller') {
      navigate('/reseller');
    } else if (profile?.role === 'customer') {
      navigate('/customer');
    } else {
      navigate('/auth');
    }
  };

  return {
    searchTerm,
    setSearchTerm,
    mobileMenuOpen,
    setMobileMenuOpen,
    handleSearch,
    handleWhatsAppContact,
    user,
    profile,
    handleLogin,
    handleProfile
  };
};