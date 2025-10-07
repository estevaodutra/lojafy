/**
 * Helper functions for course access control
 */

export type CourseAccessLevel = 'all' | 'customer' | 'supplier' | 'reseller';

export function canEnrollInCourse(
  courseAccessLevel: CourseAccessLevel,
  userRole: string
): boolean {
  if (courseAccessLevel === 'all') return true;
  return courseAccessLevel === userRole;
}

export function getAccessLevelLabel(level: CourseAccessLevel): string {
  const labels: Record<CourseAccessLevel, string> = {
    all: 'Todos os usuários',
    customer: 'Apenas Clientes',
    supplier: 'Apenas Fornecedores',
    reseller: 'Apenas Revendedores',
  };
  return labels[level];
}

export function getAccessLevelBadge(level: CourseAccessLevel): { icon: string; label: string } {
  const badges: Record<CourseAccessLevel, { icon: string; label: string }> = {
    all: { icon: '🌐', label: 'Todos' },
    customer: { icon: '👤', label: 'Clientes' },
    supplier: { icon: '📦', label: 'Fornecedores' },
    reseller: { icon: '🏪', label: 'Revendedores' },
  };
  return badges[level];
}
