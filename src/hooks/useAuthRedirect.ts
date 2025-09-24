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

    // Don't redirect if we already did or no role yet
    if (!role || hasRedirected.current) return;

    // Only redirect from auth page or home page
    const currentPath = location.pathname;
    if (currentPath !== '/auth' && currentPath !== '/') return;

    // Don't redirect if user is viewing store intentionally
    const searchParams = new URLSearchParams(location.search);
    if (searchParams.get('view') === 'store') return;

    // Mark as redirected to prevent loops
    hasRedirected.current = true;

    console.log('🚀 Redirecting user with role:', role);

    // Redirect based on role with a small delay
    setTimeout(() => {
      switch (role) {
        case 'super_admin':
          navigate('/super-admin', { replace: true });
          break;
        case 'admin':
          navigate('/admin', { replace: true });
          break;
        case 'supplier':
          navigate('/supplier', { replace: true });
          break;
        case 'reseller':
          navigate('/reseller', { replace: true });
          break;
        case 'customer':
          // Customer stays on home page
          if (currentPath === '/auth') {
            navigate('/', { replace: true });
          }
          break;
        default:
          break;
      }
    }, 100);
  }, [role, isAuthenticated, navigate, location.pathname, location.search]);
};