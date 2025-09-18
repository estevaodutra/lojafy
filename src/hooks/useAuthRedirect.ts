import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUserRole } from './useUserRole';

export const useAuthRedirect = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, isAuthenticated } = useUserRole();

  useEffect(() => {
    if (!isAuthenticated || !role) return;

    // Only redirect from auth page or home page
    const currentPath = location.pathname;
    if (currentPath !== '/auth' && currentPath !== '/') return;

    // Redirect based on role
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
  }, [role, isAuthenticated, navigate, location.pathname]);
};