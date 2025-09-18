import { useAuth } from '@/contexts/AuthContext';

export type UserRole = 'super_admin' | 'supplier' | 'reseller' | 'customer';

export const useUserRole = () => {
  const { user, profile } = useAuth();
  
  const role: UserRole = profile?.role || 'customer';
  
  const isRole = (requiredRole: UserRole): boolean => {
    return role === requiredRole;
  };
  
  const hasPermission = (requiredRoles: UserRole[]): boolean => {
    return requiredRoles.includes(role);
  };
  
  const isSuperAdmin = (): boolean => {
    return role === 'super_admin';
  };
  
  const isSupplier = (): boolean => {
    return role === 'supplier';
  };
  
  const isReseller = (): boolean => {
    return role === 'reseller';
  };
  
  const isCustomer = (): boolean => {
    return role === 'customer';
  };
  
  return {
    role,
    isRole,
    hasPermission,
    isSuperAdmin,
    isSupplier,
    isReseller,
    isCustomer,
    isAuthenticated: !!user
  };
};