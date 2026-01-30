/**
 * Helper functions for course access control
 */

export type CourseAccessLevel = 'all' | 'customer' | 'supplier' | 'reseller' | 'enrolled_only';

export function canEnrollInCourse(
  courseAccessLevel: CourseAccessLevel,
  userRole: string
): boolean {
  if (courseAccessLevel === 'all') return true;
  if (courseAccessLevel === 'enrolled_only') return false; // Matrícula apenas via API
  return courseAccessLevel === userRole;
}

export function getAccessLevelLabel(level: CourseAccessLevel): string {
  const labels: Record<CourseAccessLevel, string> = {
    all: 'Todos os usuários',
    customer: 'Apenas Clientes',
    supplier: 'Apenas Fornecedores',
    reseller: 'Apenas Revendedores',
    enrolled_only: 'Apenas Matriculados',
  };
  return labels[level];
}

export function getAccessLevelBadge(level: CourseAccessLevel): { icon: string; label: string } {
  const badges: Record<CourseAccessLevel, { icon: string; label: string }> = {
    all: { icon: '🌐', label: 'Todos' },
    customer: { icon: '👤', label: 'Clientes' },
    supplier: { icon: '📦', label: 'Fornecedores' },
    reseller: { icon: '🏪', label: 'Revendedores' },
    enrolled_only: { icon: '🔐', label: 'Matriculados' },
  };
  return badges[level];
}
