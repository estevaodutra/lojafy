import { useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from './useUserRole';

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isAuthenticated } = useUserRole();
  const hasRedirected = useRef(false);

  useEffect(() => {
    console.log('🔄 Auth redirect check:', { isAuthenticated, role, path: location.pathname });

    // Reset redirect flag when user logs out
    if (!isAuthenticated) {
      hasRedirected.current = false;
      return;
    }

    // Aguardar role carregar com timeout de segurança
    if (!role) {
      const timeout = setTimeout(() => {
        if (isAuthenticated && location.pathname === '/auth') {
          console.warn('⚠️ Timeout esperando role, redirecionando para home');
          navigate('/', { replace: true });
        }
      }, 3000);
      return () => clearTimeout(timeout);
    }

    // Don't redirect if we already did
    if (hasRedirected.current) return;

    // Only redirect from auth page or home page
    const currentPath = location.pathname;
    if (currentPath !== '/auth' && currentPath !== '/' && currentPath !== '/categorias') return;

    // Don't redirect if user is viewing store or catalog intentionally
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'store') return;
    if (searchParams.get('viewCatalog') === 'true') return;

    // Mark as redirected to prevent loops
    hasRedirected.current = true;

    console.log('🚀 Redirecting user with role:', role);

    // Redirect all users to home after login
    setTimeout(() => {
      if (currentPath === '/auth') {
        navigate('/', { replace: true });
      }
    }, 100);
  }, [role, isAuthenticated, navigate, location.pathname, location.search]);
};